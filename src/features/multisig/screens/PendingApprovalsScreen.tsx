import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";

import { evaluatePendingTx } from "@/src/domain/multisig";
import type { PendingTx } from "@/src/domain/multisig";
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
          const evaluation = evaluatePendingTx(
            pendingTx.envelopeXdr,
            pendingTx.networkPassphrase,
            config
          );
          const hasSigned = evaluation.signedBy.includes(account.publicKey);
          const shareUri = shareUriByTxId[pendingTx.id];
          const isSigning = signingTxId === pendingTx.id;
          const isSubmitting = submittingTxId === pendingTx.id;
          const signError = signErrorByTxId[pendingTx.id];
          const submitError = submitErrorByTxId[pendingTx.id];
          const txLabel = pendingTx.id.slice(0, 8);

          return (
            <View
              key={pendingTx.id}
              className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4"
            >
              <Text className="text-[15px] font-bold text-white">
                {evaluation.collectedWeight} / {evaluation.requiredWeight} weight collected
              </Text>
              <Text className="mt-1 text-[13px] font-semibold text-[#8E8E92]">
                Signed by:{" "}
                {evaluation.signedBy.length === 0
                  ? "no one yet"
                  : evaluation.signedBy.map(formatPublicKey).join(", ")}
              </Text>

              <View className="mt-4 flex-row flex-wrap gap-2">
                {!hasSigned ? (
                  <Pressable
                    accessibilityLabel={`Sign transaction ${txLabel}`}
                    accessibilityRole="button"
                    className="rounded-full bg-[#242426] px-4 py-2.5"
                    disabled={isSigning}
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
                  disabled={!evaluation.isSatisfied || isSubmitting}
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
