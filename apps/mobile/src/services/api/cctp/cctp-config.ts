import { appConfig } from "@/src/config/env";
import type { StellarNetworkId } from "@/src/domain/wallet";

/**
 * Deployed CCTP contract ids on Stellar, per network. Sourced from Circle's contract
 * reference (https://developers.circle.com/cctp/references/stellar-contracts);
 * Stellar's CCTP domain id is 27 on both networks (domain ids are stable across a
 * chain's mainnet/testnet - see domain/cctp/chain.ts).
 */
export interface CctpStellarContracts {
  /** Burns USDC and emits the crosschain message (`deposit_for_burn`, `deposit_for_burn_with_hook`). */
  readonly tokenMessengerMinter: string;
  /** Validates attestations and delivers the message body (`receive_message`). */
  readonly messageTransmitter: string;
  /** Required `mintRecipient` target for any remote-chain burn whose final recipient is a Stellar address - see stellar-cctp-contract.ts. */
  readonly cctpForwarder: string;
}

export const CCTP_STELLAR_CONTRACTS: Record<StellarNetworkId, CctpStellarContracts> = {
  testnet: {
    tokenMessengerMinter: "CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP",
    messageTransmitter: "CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY",
    cctpForwarder: "CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ",
  },
  mainnet: {
    tokenMessengerMinter: "CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL",
    messageTransmitter: "CACMENFFJPJMSDAJQLX4R7K3SFZIW2LJSE3R2UMLGSWHFHS353FVXAZV",
    cctpForwarder: "CBZL2IH7F6BIDAA3WBNXYKIXSATJGMSW7K5P5MJ6STX5RXN47TZJDF5T",
  },
};

/**
 * Circle's official USDC issuer account on Stellar for `networkId` - defaults (in
 * appConfig, see src/config/env.ts) are confirmed against Circle's own
 * contract-address reference
 * (https://developers.circle.com/stablecoins/usdc-contract-addresses), fetched twice
 * independently while building this; overridable via env in case Circle ever rotates
 * an issuer. The Soroban SAC address used on-chain is derived from this at runtime,
 * never hardcoded (see usdcAssetContractId in cctp-stellar-contract.ts).
 */
export function usdcIssuer(networkId: StellarNetworkId): string {
  return networkId === "mainnet"
    ? appConfig.cctpUsdcIssuerMainnet
    : appConfig.cctpUsdcIssuerTestnet;
}

/** Circle's Iris attestation API base URL per network. */
export const CCTP_IRIS_API_BASE_URL: Record<StellarNetworkId, string> = {
  testnet: "https://iris-api-sandbox.circle.com",
  mainnet: "https://iris-api.circle.com",
};

export function getCctpStellarContracts(networkId: StellarNetworkId): CctpStellarContracts {
  return CCTP_STELLAR_CONTRACTS[networkId];
}
