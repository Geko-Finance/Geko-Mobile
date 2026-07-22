import { Client as VaultClient } from "defindex-vault";
import type { SignTransaction } from "@stellar/stellar-sdk/no-eventsource/contract";

import type { WalletSigner } from "@/src/domain/wallet/signer";

import { getActiveStellarNetwork } from "../stellar/stellar-config";

/** Bridges the domain `WalletSigner` port into the shape the generated vault client expects. */
function toContractSignTransaction(
  signer: WalletSigner,
  networkPassphrase: string
): SignTransaction {
  return async (transactionXdr, options) => {
    const { xdr } = await signer.signTransaction(transactionXdr, {
      networkPassphrase: options?.networkPassphrase ?? networkPassphrase,
    });

    return { signedTxXdr: xdr };
  };
}

export interface DepositToVaultInput {
  /** Soroban contract address (`C...`) of the vault, e.g. one of `KNOWN_VAULTS`. */
  vaultAddress: string;
  /** Desired deposit amount per vault asset, in the asset's smallest unit, matching the vault's asset order. */
  amountsDesired: bigint[];
  /** Minimum accepted amount per vault asset (slippage floor), same order as `amountsDesired`. */
  amountsMin: bigint[];
  /** Whether the vault should immediately invest the deposit into its strategies. Default: false. */
  invest?: boolean;
}

export interface DepositToVaultResult {
  /** Actual amounts pulled per vault asset. */
  amounts: bigint[];
  /** Vault shares (df-tokens) minted to the depositor. */
  dfTokensMinted: bigint;
}

/**
 * Builds, simulates, signs (via the provided `WalletSigner`), and submits a deposit into a
 * DeFindex-standard vault. Throws if the vault rejects the deposit (`ContractError`) or the
 * transaction fails on the network.
 */
export async function depositToVault(
  input: DepositToVaultInput,
  signer: WalletSigner
): Promise<DepositToVaultResult> {
  if (signer.custody === "custodial") {
    // Cavos's WalletSigner only supports signing single native-XLM-payment operations (see
    // CavosSigner.signTransaction) and submits as a side effect of "signing" — it cannot sign a
    // Soroban invokeHostFunction call like a vault deposit, and this flow's own submit step
    // (assembled.signAndSend below) would conflict with Cavos's atomic sign-and-submit anyway.
    throw new Error(
      "Vault deposits need a non-custodial signer; Cavos only supports native XLM payments."
    );
  }

  const network = getActiveStellarNetwork();

  if (network.rpcUrl === undefined) {
    throw new Error(`No Soroban RPC configured for network "${network.id}"`);
  }

  const depositorAddress = await signer.getAddress();

  const client = new VaultClient({
    contractId: input.vaultAddress,
    networkPassphrase: network.networkPassphrase,
    publicKey: depositorAddress,
    rpcUrl: network.rpcUrl,
    signTransaction: toContractSignTransaction(signer, network.networkPassphrase),
  });

  const assembled = await client.deposit({
    amounts_desired: input.amountsDesired,
    amounts_min: input.amountsMin,
    from: depositorAddress,
    invest: input.invest ?? false,
  });

  const sent = await assembled.signAndSend();
  const [amounts, dfTokensMinted] = sent.result.unwrap();

  return { amounts, dfTokensMinted };
}
