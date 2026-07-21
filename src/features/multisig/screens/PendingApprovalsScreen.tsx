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
    await signPendingTx.mutateAsync({ pendingTx, account });
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
    await submitPendingTx.mutateAsync(pendingTx);
    router.replace("/payments/success");
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

          return (
            <View
              key={pendingTx.id}
              className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4"
            >
              <Text className="text-[15px] font-bold text-white">
                {evaluation.collectedWeight} / {evaluation.requiredWeight} weight collected
              </Text>
              <Text className="mt-1 text-[13px] font-semibold text-[#8E8E92]">
                Signed by: {evaluation.signedBy.length === 0 ? "no one yet" : evaluation.signedBy.join(", ")}
              </Text>

              <View className="mt-4 flex-row flex-wrap gap-2">
                {!hasSigned ? (
                  <Pressable
                    accessibilityLabel="Sign"
                    accessibilityRole="button"
                    className="rounded-full bg-[#242426] px-4 py-2.5"
                    disabled={signPendingTx.isPending}
                    onPress={() => {
                      void handleSign(pendingTx);
                    }}
                  >
                    {signPendingTx.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text className="text-[14px] font-bold text-white">Sign</Text>
                    )}
                  </Pressable>
                ) : null}

                <Pressable
                  accessibilityLabel="Share"
                  accessibilityRole="button"
                  className="rounded-full bg-[#242426] px-4 py-2.5"
                  onPress={() => handleShare(pendingTx)}
                >
                  <Text className="text-[14px] font-bold text-white">Share</Text>
                </Pressable>

                <Pressable
                  accessibilityLabel="Submit"
                  accessibilityRole="button"
                  className="rounded-full bg-[#5BED97] px-4 py-2.5"
                  disabled={!evaluation.isSatisfied || submitPendingTx.isPending}
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

              {submitPendingTx.isError ? (
                <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
                  {submitPendingTx.error.message}
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
