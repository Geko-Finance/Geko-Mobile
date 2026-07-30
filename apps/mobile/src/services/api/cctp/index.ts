/** Public surface of the Circle CCTP service adapter: burn, poll attestation, mint. */
export type { CctpAttestationResult } from "./cctp-attestation-client";
export { fetchCctpAttestation } from "./cctp-attestation-client";
export {
  CctpAttestationFailedError,
  CctpAttestationPendingError,
  CctpProviderUnavailableError,
} from "./cctp-errors";
export type { DepositForBurnInput, ReceiveMessageInput } from "./cctp-stellar-contract";
export {
  buildCctpForwarderHookData,
  depositForBurn,
  evmAddressToMintRecipientHex,
  receiveMessage,
  stellarForwarderMintRecipientHex,
} from "./cctp-stellar-contract";
export { CCTP_IRIS_API_BASE_URL, getCctpStellarContracts, usdcIssuer } from "./cctp-config";
