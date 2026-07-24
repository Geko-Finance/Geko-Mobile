import type { Horizon } from "@stellar/stellar-sdk";

import type { MultisigAccount, SignerEntry } from "@/src/domain/multisig";

/**
 * Horizon always lists the account's own master key as one of the entries in `signers`
 * (`key === account_id`); there is no separate `master_weight` field on the account record.
 * `mapHorizonAccountToMultisigAccount` keeps that entry in `MultisigAccount.signers` (for
 * uniform weight-sum math - see src/domain/multisig/multisig-account.ts) and also extracts
 * its weight into `thresholds.masterWeight`, since that value is also needed on its own to
 * build a `SetOptions` XDR that changes it.
 */
export function mapHorizonAccountToMultisigAccount(
  account: Horizon.ServerApi.AccountRecord,
): MultisigAccount {
  const signers: SignerEntry[] = account.signers.map((signer) => ({
    key: signer.key,
    weight: signer.weight,
  }));
  const masterWeight =
    signers.find((signer) => signer.key === account.account_id)?.weight ?? 0;

  return {
    publicKey: account.account_id,
    signers,
    thresholds: {
      masterWeight,
      low: account.thresholds.low_threshold,
      medium: account.thresholds.med_threshold,
      high: account.thresholds.high_threshold,
    },
  };
}
