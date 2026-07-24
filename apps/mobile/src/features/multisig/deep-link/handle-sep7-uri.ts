import { Transaction, TransactionBuilder } from "@stellar/stellar-base";

import type { WalletAccount } from "@/src/domain/wallet";
import { getStellarClient } from "@/src/services/api/stellar/stellar-client";
import { getActiveStellarNetwork } from "@/src/services/api/stellar/stellar-config";
import { isSep7Uri, parseSep7Uri } from "@/src/services/sep7/sep7-uri";

import { classifyEnvelopeOperation, recordScannedEnvelope } from "../api/propose-flow";

export type Sep7UriResult =
  | { readonly outcome: "ignored" }
  | { readonly outcome: "opened"; readonly proposalId: string; readonly accountId: string }
  | { readonly outcome: "error"; readonly message: string };

/**
 * Shared entry point for any way a SEP-7 `web+stellar:` link can reach this app - scanning a
 * QR in Sep7ScanScreen, or the OS handing the app an already-tapped link via the native
 * `web+stellar:` scheme registration (see app.json + useSep7LinkingListener). Both paths fully
 * validate/classify/record the envelope identically; only how the raw string arrives differs.
 *
 * Returns `"ignored"` for a non-SEP-7 string rather than throwing, since the native `Linking`
 * listener also receives this app's own `gekomobile://` links and must pass those through
 * untouched.
 */
export async function handleSep7Uri(params: {
  uri: string;
  ownerUserId: string;
  localAccounts: WalletAccount[];
}): Promise<Sep7UriResult> {
  const uri = params.uri.trim();

  if (!isSep7Uri(uri)) {
    return { outcome: "ignored" };
  }

  try {
    const parsed = parseSep7Uri(uri);
    const { networkPassphrase } = getActiveStellarNetwork();

    if (
      parsed.networkPassphrase !== undefined &&
      parsed.networkPassphrase !== networkPassphrase
    ) {
      throw new Error("This signing link is for a different Stellar network.");
    }

    const operationKind = classifyEnvelopeOperation(parsed.xdr, networkPassphrase);
    const transaction = TransactionBuilder.fromXDR(parsed.xdr, networkPassphrase);

    if (!(transaction instanceof Transaction)) {
      throw new Error("Fee-bump envelopes are not supported for multisig proposals.");
    }

    const sourcePublicKey = transaction.source;
    const localAccount = params.localAccounts.find(
      (entry) => entry.custody === "non_custodial" && entry.publicKey === sourcePublicKey,
    );

    if (localAccount === undefined) {
      throw new Error("This device doesn't hold a wallet for that multisig account.");
    }

    const multisigAccount = await getStellarClient().fetchMultisigAccount(sourcePublicKey);
    const proposal = recordScannedEnvelope({
      account: multisigAccount,
      envelopeXdr: parsed.xdr,
      operationKind,
      networkPassphrase,
      ownerUserId: params.ownerUserId,
    });

    return { outcome: "opened", proposalId: proposal.id, accountId: localAccount.id };
  } catch (caught) {
    return {
      outcome: "error",
      message: caught instanceof Error ? caught.message : "Couldn't read that signing link.",
    };
  }
}
