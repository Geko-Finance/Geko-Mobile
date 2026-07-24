/**
 * A single Stellar-ledger signer on a multisig-enabled account.
 * `key` is the signer's ed25519 G... address; this epic only supports ed25519 public-key
 * signers (Horizon also allows hash(x) and pre-authorized-tx signers, out of scope here).
 * `weight` is 0-255; a weight of 0 means the signer was revoked (Horizon keeps listing it,
 * it just no longer contributes to any threshold).
 */
export interface SignerEntry {
  readonly key: string;
  readonly weight: number;
}
