/** Public surface of the Circle CCTP service adapter: burn, poll attestation, mint. */
export type { CctpAttestationResult } from "./cctp-attestation-client";
export { fetchCctpAttestation } from "./cctp-attestation-client";
export {
  CctpAttestationFailedError,
  CctpAttestationPendingError,
  CctpProviderUnavailableError,
} from "./cctp-errors";
export type { DepositForBurnInput, MintAndForwardInput } from "./cctp-stellar-contract";
export {
  buildCctpForwarderHookData,
  depositForBurn,
  evmAddressToMintRecipientHex,
  mintAndForward,
  stellarForwarderMintRecipientHex,
} from "./cctp-stellar-contract";
export {
  CCTP_IRIS_API_BASE_URL,
  CCTP_OUTBOUND_ENABLED,
  getCctpStellarContracts,
  usdcIssuer,
} from "./cctp-config";
