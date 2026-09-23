import { getCctpChain } from "@/src/domain/cctp";
import type { Balance, StellarNetworkId } from "@/src/domain/wallet";
import {
  buildCctpForwarderHookData,
  stellarForwarderMintRecipientHex,
  usdcIssuer,
} from "@/src/services/api/cctp";

/**
 * What the user must enter in their other-network wallet when sending USDC to this
 * Stellar account (a `remote_to_stellar` transfer). The burn names the CctpForwarder
 * as both `mintRecipient` and `destinationCaller`, and carries the Stellar address in
 * `hookData`; the forwarder then delivers the USDC to that address when the app calls
 * `mint_and_forward` (see services/api/cctp/cctp-stellar-contract.ts).
 */
export interface InboundInstructions {
  readonly destinationDomain: number;
  /** 0x-prefixed bytes32 - use for both `mintRecipient` and `destinationCaller`. */
  readonly forwarderRecipient: `0x${string}`;
  readonly hookData: `0x${string}`;
}

export function buildInboundInstructions(
  networkId: StellarNetworkId,
  stellarPublicKey: string
): InboundInstructions {
  return {
    destinationDomain: getCctpChain("stellar").domainId,
    forwarderRecipient: stellarForwarderMintRecipientHex(networkId),
    hookData: buildCctpForwarderHookData(stellarPublicKey),
  };
}

/** Whether the account can hold Circle's USDC - without this trustline the forwarded mint fails on-chain. */
export function hasUsdcTrustline(balances: readonly Balance[], networkId: StellarNetworkId): boolean {
  const issuer = usdcIssuer(networkId);

  return balances.some((balance) => balance.asset.code === "USDC" && balance.asset.issuer === issuer);
}
