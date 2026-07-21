import {
  IssuedAssetId,
  NativeAssetId,
  PublicKeypair,
} from "@stellar/typescript-wallet-sdk";

import type { WalletAccount } from "@/src/domain/wallet";

import {
  createStellarWallet,
  getActiveStellarNetwork,
  getStellarNetworkConfigByPassphrase,
} from "./stellar-config";
import { getHttpStatus } from "./stellar-client";

export interface SignerChange {
  readonly kind: "add" | "remove";
  readonly publicKey: string;
  /** Required when `kind` is "add"; ignored when "remove". */
  readonly weight?: number;
}

export interface ThresholdChange {
  readonly low?: number;
  readonly medium?: number;
  readonly high?: number;
}

/**
 * Builds an unsigned SetOptions transaction applying the given signer/threshold/master-key
 * changes. Callers are responsible for calling `wouldRiskPermanentLockout` on the RESULTING
 * config before invoking this, and requiring user confirmation if it would (see Task 7) —
 * this function does not perform that check itself, it only builds the transaction.
 */
export async function buildSignerConfigTransaction(params: {
  account: WalletAccount;
  signerChanges: SignerChange[];
  thresholdChange?: ThresholdChange;
  lockMasterKey?: boolean;
}): Promise<string> {
  const config = getActiveStellarNetwork();
  const wallet = createStellarWallet(config);

  let builder = await wallet.stellar().transaction({
    sourceAddress: PublicKeypair.fromPublicKey(params.account.publicKey),
  });

  for (const change of params.signerChanges) {
    if (change.kind === "add") {
      if (change.weight === undefined) {
        throw new Error("Adding a signer requires a weight");
      }

      builder = builder.addAccountSigner(
        PublicKeypair.fromPublicKey(change.publicKey),
        change.weight
      );
    } else {
      builder = builder.removeAccountSigner(
        PublicKeypair.fromPublicKey(change.publicKey)
      );
    }
  }

  if (params.thresholdChange !== undefined) {
    builder = builder.setThreshold(params.thresholdChange);
  }

  if (params.lockMasterKey === true) {
    builder = builder.lockAccountMasterKey();
  }

  return builder.build().toXDR();
}

/** Builds an unsigned payment transaction for multisig proposal (same shape `ConfirmPaymentScreen` builds, extracted here so the propose flow doesn't need to import a screen). */
export async function buildProposedPaymentTransaction(params: {
  account: WalletAccount;
  destination: string;
  assetCode?: string;
  assetIssuer?: string;
  amount: string;
}): Promise<{ xdr: string; networkPassphrase: string }> {
  const config = getActiveStellarNetwork();
  const wallet = createStellarWallet(config);
  const asset =
    params.assetCode !== undefined && params.assetIssuer !== undefined
      ? new IssuedAssetId(params.assetCode, params.assetIssuer)
      : new NativeAssetId();

  const builder = await wallet.stellar().transaction({
    sourceAddress: PublicKeypair.fromPublicKey(params.account.publicKey),
  });
  const transaction = builder.transfer(params.destination, asset, params.amount).build();

  return { xdr: transaction.toXDR(), networkPassphrase: config.networkPassphrase };
}

const HORIZON_TIMEOUT_STATUS = 504;

/**
 * Decodes and submits an already-signed transaction, converting a Horizon 504/timeout into a
 * distinct, clearly-worded error rather than the generic submission-failure message — mirroring
 * the fix the SEP-7 epic's `ConfirmPaymentScreen` needed for the same reason: a 504 leaves the
 * on-chain outcome indeterminate, and a generic "failed" message risks the user re-submitting a
 * payment that may have already gone through. Centralized here (rather than duplicated inline in
 * each of Task 6's three call sites) since all three do exactly this same decode-and-submit step.
 */
export async function submitSignedTransaction(
  signedXdr: string,
  networkPassphrase: string
): Promise<void> {
  const config = getStellarNetworkConfigByPassphrase(networkPassphrase);
  const wallet = createStellarWallet(config);

  try {
    const signedTransaction = wallet.stellar().decodeTransaction(signedXdr);
    await wallet.stellar().submitTransaction(signedTransaction);
  } catch (error) {
    if (getHttpStatus(error) === HORIZON_TIMEOUT_STATUS) {
      throw new Error(
        "The network timed out. Check your account history before trying again — this may have already gone through."
      );
    }

    throw error;
  }
}
