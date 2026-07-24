import type { SignerEntry } from "./signer-entry";
import type { Thresholds } from "./thresholds";

/**
 * Live signer/threshold state for a Stellar account, read from Horizon (see
 * src/services/api/stellar/multisig-mapper.ts) - never persisted as wallet metadata, since
 * this describes on-chain signer topology, not where this app's key material lives
 * (see `WalletCustody` in src/domain/wallet/account.ts, a separate concern).
 *
 * `signers` INCLUDES a synthetic entry for the account's own master key
 * (`{key: publicKey, weight: thresholds.masterWeight}`), so every threshold-weight
 * calculation (see src/services/multisig/threshold-math.ts) and every "who signed" UI list
 * can treat all signers uniformly instead of special-casing the master key everywhere.
 * `thresholds.masterWeight` is still kept separately too, since it is also needed on its own
 * to build a `SetOptions` XDR that changes it.
 */
export interface MultisigAccount {
  readonly publicKey: string;
  readonly signers: SignerEntry[];
  readonly thresholds: Thresholds;
}

/**
 * An account is multisig-enabled once signing requires more than the master key acting
 * alone - i.e. there is at least one other signer with weight > 0, or every threshold
 * category already exceeds the master weight by itself.
 */
export function isMultisigAccount(account: MultisigAccount): boolean {
  const hasExtraSigner = account.signers.some(
    (signer) => signer.key !== account.publicKey && signer.weight > 0,
  );
  const { masterWeight, low, medium, high } = account.thresholds;

  return (
    hasExtraSigner ||
    masterWeight < low ||
    masterWeight < medium ||
    masterWeight < high
  );
}
