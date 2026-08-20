import { Keypair, Transaction } from "@stellar/stellar-sdk/base";

import type { ProposalSignature, SignerEntry } from "@/src/domain/multisig";

/**
 * Resolves which of a proposal's known `signers` actually produced each signature already
 * present on `transaction`, for display (e.g. "2 of 3 signed" / who's still missing).
 *
 * Each decorated signature only carries a 4-byte hint (the last 4 bytes of the signing
 * public key), not the key itself, so a hint alone is not proof of who signed - two
 * different keys can share a hint (rare, but possible). For every known signer whose hint
 * matches, this cryptographically verifies the signature against the transaction hash before
 * counting it as a match, so a hint collision can never misattribute a signature.
 *
 * Unknown/already-removed signers that happen to have signed (their key has no entry in
 * `signers`) are silently skipped - they contribute no weight to threshold math either
 * (see threshold-math.ts#collectedWeight), so they have nothing to be attributed to here.
 */
export function matchSignatures(
  transaction: Transaction,
  signers: SignerEntry[],
  signedAt: string,
): ProposalSignature[] {
  const hash = transaction.hash();

  return signers
    .filter((signer) =>
      transaction.signatures.some((decoratedSignature) =>
        Keypair.fromPublicKey(signer.key).verify(
          hash,
          decoratedSignature.signature(),
        ),
      ),
    )
    .map((signer) => ({ signerKey: signer.key, signedAt }));
}

/** The subset of `signers`' keys that have a matching signature on `transaction`. */
export function matchedSignerKeys(
  transaction: Transaction,
  signers: SignerEntry[],
): string[] {
  return matchSignatures(transaction, signers, "").map(
    (signature) => signature.signerKey,
  );
}
