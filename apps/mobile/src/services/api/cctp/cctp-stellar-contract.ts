/**
 * The two Soroban contract calls this app can sign itself (both against a Stellar
 * account, via the domain `WalletSigner` port) - burning USDC to start a
 * `stellar_to_remote` transfer, and minting USDC to finish a `remote_to_stellar`
 * transfer. See domain/cctp/transfer.ts's CctpTransferDirection doc for why only
 * these two Stellar-side steps are automated end-to-end by this app.
 */
import { Address, Asset, StrKey, nativeToScVal } from "@stellar/stellar-sdk/base";
import { Buffer } from "buffer";

import type { WalletSigner } from "@/src/domain/wallet";

import { invokeSorobanContract } from "../stellar/soroban-invoke";
import { getActiveStellarNetwork } from "../stellar/stellar-config";
import { getCctpStellarContracts, usdcIssuer } from "./cctp-config";

function requireRpcUrl(): { rpcUrl: string; networkPassphrase: string; networkId: "testnet" | "mainnet" } {
  const network = getActiveStellarNetwork();

  if (network.rpcUrl === undefined) {
    throw new Error(`No Soroban RPC configured for network "${network.id}"`);
  }

  return { rpcUrl: network.rpcUrl, networkPassphrase: network.networkPassphrase, networkId: network.id };
}

function hexToBytes(hex: string): Buffer {
  return Buffer.from(hex.replace(/^0x/, ""), "hex");
}

export interface DepositForBurnInput {
  /** Smallest-unit USDC amount (7dp - see domain/cctp/amount.ts). */
  readonly amount: bigint;
  readonly destinationDomainId: number;
  /** 32-byte, 0x-prefixed hex encoding of the destination-chain recipient. */
  readonly mintRecipientHex: string;
  readonly sourcePublicKey: string;
  readonly signer: WalletSigner;
}

/**
 * Calls TokenMessengerMinter.`deposit_for_burn` to burn native USDC on Stellar and emit
 * a CCTP message for a remote-chain mint. Argument set (amount, destination_domain,
 * mint_recipient, burn_token) mirrors CCTP's cross-chain-stable core parameters;
 * Circle's Stellar contract reference confirms the function name but not its full
 * Soroban parameter list (https://developers.circle.com/cctp/references/stellar-contracts) -
 * VERIFY this against the deployed contract's spec (`stellar contract inspect --id
 * <TokenMessengerMinter> --network testnet`) before signing a real-value transfer.
 */
export async function depositForBurn(input: DepositForBurnInput): Promise<{ burnTxHash: string }> {
  const { rpcUrl, networkPassphrase, networkId } = requireRpcUrl();
  const contracts = getCctpStellarContracts(networkId);
  const burnTokenContractId = usdcAssetContractId(networkId);

  const args = [
    nativeToScVal(input.amount, { type: "i128" }),
    nativeToScVal(input.destinationDomainId, { type: "u32" }),
    nativeToScVal(hexToBytes(input.mintRecipientHex), { type: "bytes" }),
    new Address(burnTokenContractId).toScVal(),
  ];

  const { hash } = await invokeSorobanContract({
    contractId: contracts.tokenMessengerMinter,
    method: "deposit_for_burn",
    args,
    sourcePublicKey: input.sourcePublicKey,
    rpcUrl,
    networkPassphrase,
    signer: input.signer,
  });

  return { burnTxHash: hash };
}

export interface MintAndForwardInput {
  readonly messageBytesHex: string;
  readonly attestationHex: string;
  readonly sourcePublicKey: string;
  readonly signer: WalletSigner;
}

/**
 * Calls CctpForwarder.`mint_and_forward(message, attestation)` to finish a
 * `remote_to_stellar` transfer. Inbound burns name the forwarder as both
 * `mintRecipient` and `destinationCaller` (see `stellarForwarderMintRecipientHex`), so
 * the forwarder is the only account MessageTransmitter.`receive_message` will accept
 * the message from: it mints to itself and forwards the USDC to the Stellar address
 * carried in the hook data, in the same transaction. Calling MessageTransmitter
 * directly can never deliver an inbound transfer to the user. Verified against the
 * deployed testnet contract with `stellar contract info interface`.
 *
 * Anyone can submit this call - the recipient is fixed by the message, not by who
 * signs; `sourcePublicKey`/`signer` is only the account paying the fee. Re-submitting
 * is protocol-safe: MessageTransmitter rejects a nonce it has already delivered, so a
 * retry after an earlier success fails on-chain instead of double-minting (contrast
 * with domain/cctp/transfer.ts#nextStep's `"verify_burn"` guard).
 */
export async function mintAndForward(input: MintAndForwardInput): Promise<{ mintTxHash: string }> {
  const { rpcUrl, networkPassphrase, networkId } = requireRpcUrl();
  const contracts = getCctpStellarContracts(networkId);

  const args = [
    nativeToScVal(hexToBytes(input.messageBytesHex), { type: "bytes" }),
    nativeToScVal(hexToBytes(input.attestationHex), { type: "bytes" }),
  ];

  const { hash } = await invokeSorobanContract({
    contractId: contracts.cctpForwarder,
    method: "mint_and_forward",
    args,
    sourcePublicKey: input.sourcePublicKey,
    rpcUrl,
    networkPassphrase,
    signer: input.signer,
  });

  return { mintTxHash: hash };
}

/**
 * Derives the Soroban Stellar Asset Contract (SAC) id for USDC from its classic
 * asset (code + issuer), rather than hardcoding a contract address that could drift
 * from the issuer config - `Asset.contractId()` is the standard SDK method for this
 * (CAP-46-6 deterministic contract id derivation).
 */
function usdcAssetContractId(networkId: "testnet" | "mainnet"): string {
  const network = getActiveStellarNetwork();
  const asset = new Asset("USDC", usdcIssuer(networkId));

  return asset.contractId(network.networkPassphrase);
}

/**
 * Builds the `mintRecipient` + hook data a `remote_to_stellar` burn (executed on the
 * remote chain, in another wallet) must use so the mint lands on a real Stellar
 * account instead of being stranded at CctpForwarder. Encoding verified against
 * Circle's Stellar CCTP reference (https://developers.circle.com/cctp/references/stellar):
 * hook data = 24 zero bytes, then a big-endian u32 version (0), then a big-endian u32
 * UTF-8 byte length of the strkey, then the strkey itself as UTF-8.
 */
export function buildCctpForwarderHookData(stellarRecipientStrkey: string): `0x${string}` {
  const isValid =
    StrKey.isValidEd25519PublicKey(stellarRecipientStrkey) ||
    StrKey.isValidContract(stellarRecipientStrkey) ||
    StrKey.isValidMed25519PublicKey(stellarRecipientStrkey);

  if (!isValid) {
    throw new Error(`Invalid Stellar forward recipient: ${stellarRecipientStrkey}`);
  }

  const recipientBytes = Buffer.from(stellarRecipientStrkey, "utf8");
  const hookData = Buffer.alloc(32 + recipientBytes.length);
  hookData.writeUInt32BE(0, 24);
  hookData.writeUInt32BE(recipientBytes.length, 28);
  recipientBytes.copy(hookData, 32);

  return `0x${hookData.toString("hex")}`;
}

/** Left-pads a 20-byte EVM address into the 32-byte `mintRecipient` encoding CCTP's `deposit_for_burn` expects. */
export function evmAddressToMintRecipientHex(address: string): `0x${string}` {
  const hex = address.replace(/^0x/, "").toLowerCase();

  if (!/^[0-9a-f]{40}$/.test(hex)) {
    throw new Error(`Expected a 20-byte EVM address, got: ${address}`);
  }

  return `0x${hex.padStart(64, "0")}`;
}

/** The `mintRecipient` a remote-chain burn must target when the final recipient is on Stellar - CctpForwarder's contract id, as 0x-prefixed bytes32. */
export function stellarForwarderMintRecipientHex(networkId: "testnet" | "mainnet"): `0x${string}` {
  const contractId = getCctpStellarContracts(networkId).cctpForwarder;
  const decoded = StrKey.decodeContract(contractId);

  return `0x${Buffer.from(decoded).toString("hex")}`;
}
