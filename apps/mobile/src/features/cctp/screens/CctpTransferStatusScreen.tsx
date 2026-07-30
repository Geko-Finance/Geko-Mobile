import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  canAutoCompleteMint,
  getCctpChain,
  nextStep,
  type CctpTransferStatus,
  type CctpTransferStep,
} from "@/src/domain/cctp";
import { BackButton } from "@/src/features/shared/components/BackButton";
import { useCctpTransfer } from "@/src/features/cctp/state/transfer-store";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";
import { LocalSigner } from "@/src/services/wallet/local-signer";

import {
  useCctpAttestationPolling,
  useCompleteCctpMint,
  useResumeSingleCctpTransfer,
} from "../api/cctp-queries";

const STEP_ORDER: { step: CctpTransferStep; label: string }[] = [
  { step: "burn", label: "Burn" },
  { step: "attestation", label: "Attestation" },
  { step: "mint", label: "Mint" },
];

function stepState(
  step: CctpTransferStep,
  current: CctpTransferStep | "done" | "verify_burn"
): "done" | "active" | "pending" {
  const order: (CctpTransferStep | "done")[] = ["burn", "attestation", "mint", "done"];
  const currentIndex = order.indexOf(current === "verify_burn" ? "burn" : current);
  const stepIndex = order.indexOf(step);

  if (stepIndex < currentIndex) {
    return "done";
  }

  if (stepIndex === currentIndex) {
    return "active";
  }

  return "pending";
}

function statusLabel(status: CctpTransferStatus): string {
  switch (status) {
    case "initiated":
      return "Starting";
    case "burning":
      return "Burning on source chain";
    case "burned":
      return "Burn confirmed";
    case "attesting":
      return "Waiting for Circle's attestation";
    case "attested":
      return "Attested";
    case "minting":
      return "Minting";
    case "minted":
      return "Complete";
    case "failed":
      return "Failed";
  }
}

export function CctpTransferStatusScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transfer = useCctpTransfer(id);
  const activeAccount = useActiveAccount();
  const attestationQuery = useCctpAttestationPolling(transfer);
  const completeMint = useCompleteCctpMint();
  const resume = useResumeSingleCctpTransfer();
  const [walletPin, setWalletPin] = useState("");

  if (transfer === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="mb-2 px-6 pt-4">
          <BackButton />
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white">This transfer could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sourceChain = getCctpChain(transfer.sourceChainId);
  const destinationChain = getCctpChain(transfer.destinationChainId);
  const step = nextStep(transfer);
  const autoMintable = canAutoCompleteMint(transfer.direction);
  const needsVerification = step === "verify_burn";
  const canRetry =
    transfer.status === "failed" && (transfer.failedStep === "attestation" || transfer.failedStep === "mint");

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2">
          <BackButton />
        </View>
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          {`${sourceChain.displayName} → ${destinationChain.displayName}`}
        </Text>
        <Text className="mt-2 text-[28px] font-extrabold text-white">
          {`${transfer.amount} USDC`}
        </Text>
        <Text className="mt-1 text-[14px] font-semibold text-[#8E8E92]">
          {statusLabel(transfer.status)}
        </Text>

        <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214]">
          {STEP_ORDER.map((entry, index) => {
            const state = stepState(entry.step, step);

            return (
              <View
                key={entry.step}
                className={`flex-row items-center px-4 py-4 ${
                  index < STEP_ORDER.length - 1 ? "border-b border-[#1E1E20]" : ""
                }`}
              >
                <View
                  className={`h-8 w-8 items-center justify-center rounded-full ${
                    state === "done"
                      ? "bg-[#123B2B]"
                      : state === "active"
                        ? "bg-[#123A5C]"
                        : "bg-[#1E1E20]"
                  }`}
                >
                  {state === "active" && transfer.status !== "failed" ? (
                    <ActivityIndicator color="#237BFF" size="small" />
                  ) : (
                    <Text
                      className={`text-[12px] font-bold ${
                        state === "done" ? "text-[#5BED97]" : "text-[#8E8E92]"
                      }`}
                    >
                      {state === "done" ? "✓" : index + 1}
                    </Text>
                  )}
                </View>
                <Text className="ml-3 text-[15px] font-bold text-white">{entry.label}</Text>
              </View>
            );
          })}
        </View>

        {transfer.burnTxHash !== undefined ? (
          <View className="mt-4 rounded-[16px] bg-[#121214] px-4 py-3">
            <Text className="text-[12px] font-bold uppercase tracking-wide text-[#8E8E92]">
              Burn transaction
            </Text>
            <Text className="mt-1 text-[12px] font-semibold text-[#5BED97]">
              {transfer.burnTxHash}
            </Text>
          </View>
        ) : null}

        {needsVerification ? (
          <View className="mt-4 rounded-[16px] bg-[#2A1F12] px-4 py-3">
            <Text className="text-[13px] font-semibold text-[#F2B84B]">
              This transfer was interrupted while burning. Check the source account&apos;s
              recent activity before retrying, to avoid burning twice.
            </Text>
          </View>
        ) : null}

        {transfer.status === "failed" && transfer.failureReason !== undefined ? (
          <View className="mt-4 rounded-[16px] bg-[#3A1414] px-4 py-3">
            <Text className="text-[13px] font-semibold text-[#FF6B6B]">
              {transfer.failureReason}
            </Text>
          </View>
        ) : null}

        {!autoMintable && transfer.status === "attested" ? (
          <View className="mt-4 rounded-[16px] bg-[#121214] px-4 py-3">
            <Text className="text-[13px] font-semibold text-[#8E8E92]">
              Attested. Complete the mint from a wallet connected to{" "}
              {destinationChain.displayName} using the message and attestation below.
            </Text>
            <Text className="mt-2 text-[11px] font-semibold text-[#5BED97]" numberOfLines={2}>
              {transfer.messageBytes}
            </Text>
            <Text className="mt-1 text-[11px] font-semibold text-[#5BED97]" numberOfLines={2}>
              {transfer.attestation}
            </Text>
          </View>
        ) : null}

        {autoMintable && transfer.status === "attested" && activeAccount?.custody === "non_custodial" ? (
          <View className="mt-6 rounded-[20px] bg-[#121214] px-5 py-5">
            <Text className="text-[13px] font-semibold text-[#8E8E92]">Wallet PIN</Text>
            <TextInput
              className="mt-2 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6-digit wallet PIN"
              placeholderTextColor="#6E6E72"
              secureTextEntry
              value={walletPin}
              onChangeText={setWalletPin}
            />
            <Pressable
              accessibilityRole="button"
              className={`mt-4 self-start rounded-full px-4 py-2.5 ${
                walletPin.length === 6 ? "bg-[#237BFF]" : "bg-[#1B3A5C]"
              }`}
              disabled={walletPin.length !== 6 || completeMint.isPending}
              onPress={() =>
                completeMint.mutate({
                  transferId: transfer.id,
                  signer: new LocalSigner({
                    publicKey: activeAccount.publicKey,
                    pinProvider: async () => walletPin,
                  }),
                })
              }
            >
              {completeMint.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-[14px] font-bold text-white">Complete mint</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {transfer.status === "minted" ? (
          <View className="mt-6 items-center">
            <View className="rounded-full bg-[#123B2B] px-4 py-2">
              <Text className="text-[13px] font-bold text-[#5BED97]">Transfer complete</Text>
            </View>
            <Pressable
              className="mt-6 rounded-full bg-[#242426] px-6 py-3"
              onPress={() => router.replace("/home")}
            >
              <Text className="text-[14px] font-bold text-white">Done</Text>
            </Pressable>
          </View>
        ) : null}

        {canRetry && activeAccount !== null ? (
          <Pressable
            className="mt-4 self-start rounded-full bg-[#242426] px-4 py-2.5"
            disabled={resume.isPending}
            onPress={() =>
              resume.mutate({
                transferId: transfer.id,
                signer: new LocalSigner({
                  publicKey: activeAccount.publicKey,
                  pinProvider: async () => walletPin,
                }),
              })
            }
          >
            {resume.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-[14px] font-bold text-white">Retry</Text>
            )}
          </Pressable>
        ) : null}

        {attestationQuery.isError ? (
          <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
            Couldn&apos;t reach Circle&apos;s attestation service - retrying automatically.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
