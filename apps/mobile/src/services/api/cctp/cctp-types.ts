/**
 * Wire shape of Circle's Iris attestation API (`GET /v2/messages/{sourceDomainId}`),
 * kept private to this folder - features/screens consume the mapped
 * `CctpAttestationResult` from cctp-attestation-client.ts, never these DTOs directly.
 * Field names follow Circle's publicly described CCTP v2 message/attestation shape;
 * VERIFY against a live sandbox response before this leaves testnet scaffolding, since
 * the full schema page (developers.circle.com/api-reference/cctp) wasn't reachable
 * while building this - see cctp-attestation-client.ts's parsing, which is
 * deliberately defensive about missing/renamed fields for exactly that reason.
 */
export type CctpWireMessageStatus = "pending_confirmations" | "complete" | "failed";

export interface CctpWireMessage {
  readonly status: CctpWireMessageStatus;
  readonly message?: string;
  readonly attestation?: string;
  readonly eventNonce?: string;
  readonly cctpVersion?: number;
  readonly decodedMessage?: {
    readonly sourceDomain?: string;
    readonly destinationDomain?: string;
    readonly nonce?: string;
  };
}

export interface CctpWireMessagesResponse {
  readonly messages?: CctpWireMessage[];
}
