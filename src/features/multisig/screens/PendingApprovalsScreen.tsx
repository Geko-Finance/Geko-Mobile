import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";

import { describeTransactionOperations, evaluatePendingTx } from "@/src/domain/multisig";
import type { OperationSummary, PendingTx, ThresholdEvaluation } from "@/src/domain/multisig";
import { encodeSep7TxRequest } from "@/src/domain/payments";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { useWalletAccount } from "@/src/features/wallet/state/wallet-store";
import {
  useMultisigConfig,
  usePendingTxsForAccount,
  useSignPendingTx,
  useSubmitPendingTx,
} from "@/src/features/multisig/api/multisig-queries";

function formatPublicKey(publicKey: string): string {
  return `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;
}

/** Formats an asset code, appending a shortened issuer address when it's not the native asset. */
function formatAssetLabel(code: string, issuer: string | undefined): string {
  return issuer === undefined ? code : `${code} (${formatPublicKey(issuer)})`;
}

/**
 * Renders one decoded operation as human-readable line(s), so a co-signer can see exactly what
 * they're about to Sign/Submit rather than only a collected-weight count. See
 * `describeTransactionOperations`'s docblock for why this matters: a shared/scanned pending
 * transaction could otherwise be a `setOptions` adding an attacker as a signer, an `accountMerge`
 * (transfers the ENTIRE balance and deletes the account), or a payment to an unexpected address,
 * with zero visibility before signing.
 */
function describeOperationForDisplay(summary: OperationSummary): string {
  if (summary.type === "payment") {
    return `Pay ${summary.amount} ${formatAssetLabel(summary.assetCode, summary.assetIssuer)} to ${formatPublicKey(summary.destination)}`;
  }

  if (summary.type === "accountMerge") {
    return `Merges this account into ${formatPublicKey(summary.destination)} — transfers its ENTIRE balance there and permanently deletes this account`;
  }

  if (summary.type === "pathPaymentStrictReceive" || summary.type === "pathPaymentStrictSend") {
    const sendAssetLabel = formatAssetLabel(summary.sendAssetCode, summary.sendAssetIssuer);
    const destAssetLabel = formatAssetLabel(summary.destAssetCode, summary.destAssetIssuer);
    const destination = formatPublicKey(summary.destination);

    return summary.type === "pathPaymentStrictSend"
      ? `Sends ${summary.sendAmount} ${sendAssetLabel}, converted along a path, delivering at least ${summary.destAmount} ${destAssetLabel} to ${destination}`
      : `Sends up to ${summary.sendAmount} ${sendAssetLabel}, converted along a path, delivering exactly ${summary.destAmount} ${destAssetLabel} to ${destination}`;
  }

  if (summary.type === "setOptions") {
    const lines: string[] = [];

    if (summary.signerChange !== undefined) {
      lines.push(
        summary.signerChange.weight === 0
          ? `Removes signer ${formatPublicKey(summary.signerChange.publicKey)}`
          : `Adds/updates signer ${formatPublicKey(summary.signerChange.publicKey)} to weight ${summary.signerChange.weight}`
      );
    }

    if (summary.hasNonKeySignerChange === true) {
      lines.push("Changes a non-key signer (hash, pre-authorized tx, or signed payload)");
    }

    if (summary.lowThreshold !== undefined) {
      lines.push(`Sets low threshold to ${summary.lowThreshold}`);
    }

    if (summary.medThreshold !== undefined) {
      lines.push(`Sets medium threshold to ${summary.medThreshold}`);
    }

    if (summary.highThreshold !== undefined) {
      lines.push(`Sets high threshold to ${summary.highThreshold}`);
    }

    if (summary.masterWeight !== undefined) {
      lines.push(`Sets this account's own key weight to ${summary.masterWeight}`);
    }

    if (summary.homeDomain !== undefined) {
      lines.push(`Sets home domain to "${summary.homeDomain}"`);
    }

    return lines.length > 0 ? lines.join("\n") : "Changes account options";
  }

  // "other" catch-all: this app has no dedicated summary for this operation type (e.g.
  // changeTrust, manageSellOffer, clawback, invokeHostFunction). Rather than a bland type name
  // that could read as harmless, give a prominent, explicit caution — several of these operation
  // types can move or lock up value just as much as a payment can.
  return `⚠️ Contains a "${summary.operationType}" operation this app can't fully summarize. Review it carefully before signing — it may move funds or change account settings in ways not shown here.`;
}

/** Clears one key from a `Record`-shaped piece of state, used to reset a per-row error before retrying that row's action. */
function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}

export function PendingApprovalsScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const account = useWalletAccount(accountId);
  const { data: config } = useMultisigConfig(account?.publicKey);
  const pendingTxs = usePendingTxsForAccount(accountId ?? "");
  const signPendingTx = useSignPendingTx();
  const submitPendingTx = useSubmitPendingTx();
  const [shareUriByTxId, setShareUriByTxId] = useState<Record<string, string>>({});

  // Mutation state (isPending/isError/error) from `useMutation()` is global to the component,
  // not per-row — with two pending txs, submitting one would otherwise make its error/spinner
  // appear under every row. These track which specific pending tx is in flight or errored, the
  // same per-id-keyed pattern already used for `shareUriByTxId` above.
  const [signingTxId, setSigningTxId] = useState<string | null>(null);
  const [submittingTxId, setSubmittingTxId] = useState<string | null>(null);
  const [signErrorByTxId, setSignErrorByTxId] = useState<Record<string, string>>({});
  const [submitErrorByTxId, setSubmitErrorByTxId] = useState<Record<string, string>>({});

  if (account === undefined || config === undefined) {
    return (
      <ScreenPlaceholder
        description="Load this account's signer configuration first."
        eyebrow="Multisig"
        title="Not ready yet"
      />
    );
  }

  const handleSign = async (pendingTx: PendingTx) => {
    setSigningTxId(pendingTx.id);
    setSignErrorByTxId((current) => withoutKey(current, pendingTx.id));

    try {
      await signPendingTx.mutateAsync({ pendingTx, account });
    } catch (error) {
      setSignErrorByTxId((current) => ({
        ...current,
        [pendingTx.id]: error instanceof Error ? error.message : "Failed to sign transaction.",
      }));
    } finally {
      setSigningTxId((current) => (current === pendingTx.id ? null : current));
    }
  };

  const handleShare = (pendingTx: PendingTx) => {
    setShareUriByTxId((current) => ({
      ...current,
      [pendingTx.id]: encodeSep7TxRequest({
        kind: "tx",
        xdr: pendingTx.envelopeXdr,
        networkPassphrase: pendingTx.networkPassphrase,
      }),
    }));
  };

  const handleSubmit = async (pendingTx: PendingTx) => {
    setSubmittingTxId(pendingTx.id);
    setSubmitErrorByTxId((current) => withoutKey(current, pendingTx.id));

    try {
      await submitPendingTx.mutateAsync(pendingTx);
      router.replace("/payments/success");
    } catch (error) {
      setSubmitErrorByTxId((current) => ({
        ...current,
        [pendingTx.id]: error instanceof Error ? error.message : "Failed to submit transaction.",
      }));
    } finally {
      setSubmittingTxId((current) => (current === pendingTx.id ? null : current));
    }
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          Multisig
        </Text>
        <Text className="mt-2 text-[32px] font-extrabold text-white">
          Pending approvals
        </Text>

        {pendingTxs.length === 0 ? (
          <Text className="mt-6 text-[15px] font-semibold text-[#8E8E92]">
            Nothing pending for this account.
          </Text>
        ) : null}

        {pendingTxs.map((pendingTx) => {
          const shareUri = shareUriByTxId[pendingTx.id];
          const isSigning = signingTxId === pendingTx.id;
          const isSubmitting = submittingTxId === pendingTx.id;
          const signError = signErrorByTxId[pendingTx.id];
          const submitError = submitErrorByTxId[pendingTx.id];
          const txLabel = pendingTx.id.slice(0, 8);

          // Decode this transaction ONCE, in ONE try/catch, covering everything this row needs
          // (both weight evaluation and the human-readable operation summary) — both rely on the
          // exact same underlying decode (`decodeAsTransaction` in the domain layer), which throws
          // on a fee-bump or malformed envelope. Evaluating outside this guard would let a single
          // corrupt/undecodable persisted `envelopeXdr` (e.g. from an interrupted AsyncStorage
          // write) throw during render and take down the ENTIRE pending-approvals list, not just
          // this row. On failure, both evaluation and description are skipped for this row (never
          // fall back to blind-signing with an unevaluated weight count) and Sign/Submit are
          // disabled.
          let evaluation: ThresholdEvaluation | null = null;
          let operationSummaries: OperationSummary[] | null = null;
          let describeError: string | null = null;
          try {
            evaluation = evaluatePendingTx(
              pendingTx.envelopeXdr,
              pendingTx.networkPassphrase,
              config
            );
            operationSummaries = describeTransactionOperations(
              pendingTx.envelopeXdr,
              pendingTx.networkPassphrase
            );
          } catch (thrown) {
            evaluation = null;
            operationSummaries = null;
            describeError =
              thrown instanceof Error
                ? thrown.message
                : "Unable to decode this transaction's contents.";
          }
          const canSignOrSubmit = describeError === null;
          const hasSigned = evaluation !== null && evaluation.signedBy.includes(account.publicKey);

          return (
            <View
              key={pendingTx.id}
              className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4"
            >
              <Text className="text-[15px] font-bold text-white">
                {evaluation !== null
                  ? `${evaluation.collectedWeight} / ${evaluation.requiredWeight} weight collected`
                  : "Unable to evaluate signatures"}
              </Text>
              <Text className="mt-1 text-[13px] font-semibold text-[#8E8E92]">
                Signed by:{" "}
                {evaluation === null
                  ? "unknown"
                  : evaluation.signedBy.length === 0
                    ? "no one yet"
                    : evaluation.signedBy.map(formatPublicKey).join(", ")}
              </Text>

              <View className="mt-4 rounded-[16px] bg-[#1E1E20] px-4 py-3">
                <Text className="text-[12px] font-bold uppercase tracking-wide text-[#8E8E92]">
                  This transaction will
                </Text>
                {operationSummaries !== null ? (
                  operationSummaries.map((summary, index) => (
                    <Text
                      key={index}
                      className="mt-1.5 text-[14px] font-semibold text-white"
                    >
                      {describeOperationForDisplay(summary)}
                    </Text>
                  ))
                ) : (
                  <Text className="mt-1.5 text-[14px] font-semibold text-[#FF6B6B]">
                    {describeError}
                  </Text>
                )}
              </View>

              <View className="mt-4 flex-row flex-wrap gap-2">
                {!hasSigned ? (
                  <Pressable
                    accessibilityLabel={`Sign transaction ${txLabel}`}
                    accessibilityRole="button"
                    className="rounded-full bg-[#242426] px-4 py-2.5"
                    disabled={isSigning || !canSignOrSubmit}
                    onPress={() => {
                      void handleSign(pendingTx);
                    }}
                  >
                    {isSigning ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text className="text-[14px] font-bold text-white">Sign</Text>
                    )}
                  </Pressable>
                ) : null}

                <Pressable
                  accessibilityLabel={`Share transaction ${txLabel}`}
                  accessibilityRole="button"
                  className="rounded-full bg-[#242426] px-4 py-2.5"
                  onPress={() => handleShare(pendingTx)}
                >
                  <Text className="text-[14px] font-bold text-white">Share</Text>
                </Pressable>

                <Pressable
                  accessibilityLabel={`Submit transaction ${txLabel}`}
                  accessibilityRole="button"
                  className="rounded-full bg-[#5BED97] px-4 py-2.5"
                  disabled={evaluation === null || !evaluation.isSatisfied || isSubmitting || !canSignOrSubmit}
                  onPress={() => {
                    void handleSubmit(pendingTx);
                  }}
                >
                  <Text className="text-[14px] font-extrabold text-[#123B2B]">
                    Submit
                  </Text>
                </Pressable>
              </View>

              {shareUri !== undefined ? (
                <View className="mt-4 items-center rounded-[16px] bg-white p-4">
                  <QRCode backgroundColor="white" color="black" size={200} value={shareUri} />
                </View>
              ) : null}

              {signError !== undefined ? (
                <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
                  {signError}
                </Text>
              ) : null}

              {submitError !== undefined ? (
                <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
                  {submitError}
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
