import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PendingProposal, ProposalStatus } from "@/src/domain/multisig";
import { BackButton } from "@/src/features/shared/components/BackButton";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { useWalletAccount } from "@/src/features/wallet/state/wallet-store";
import { collectedWeight, requiredThreshold } from "@/src/services/multisig/threshold-math";

import { useMultisigAccount } from "../api/multisig-queries";
import { useProposalsForAccount } from "../state/proposal-store";

function formatOperationKind(kind: PendingProposal["operationKind"]): string {
  return kind === "payment" ? "Payment" : "Signer change";
}

function formatStatus(status: ProposalStatus): string {
  switch (status) {
    case "collecting":
      return "Collecting signatures";
    case "ready":
      return "Ready to submit";
    case "submitted":
      return "Submitted";
    case "expired":
      return "Expired";
    case "rejected":
      return "Rejected";
  }
}

function statusColor(status: ProposalStatus): string {
  switch (status) {
    case "submitted":
      return "#5BED97";
    case "ready":
      return "#FFCC66";
    case "expired":
    case "rejected":
      return "#FF6B6B";
    case "collecting":
      return "#8E8E92";
  }
}

export function PendingProposalsScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const account = useWalletAccount(accountId);
  const multisig = useMultisigAccount(account?.publicKey);
  const proposals = useProposalsForAccount(account?.publicKey);

  if (account === undefined || account.custody !== "non_custodial") {
    return (
      <ScreenPlaceholder
        description="Multisig is only available for self-custody wallets on this device."
        eyebrow="Multisig"
        title="Not available"
      />
    );
  }

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2">
          <BackButton />
        </View>
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          Multisig
        </Text>
        <Text className="mt-2 text-[28px] font-extrabold text-white">
          Pending approvals
        </Text>

        {proposals.length === 0 ? (
          <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-5">
            <Text className="text-[15px] font-semibold text-[#D8D8DC]">
              No pending proposals for this account.
            </Text>
          </View>
        ) : (
          <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214]">
            {proposals.map((proposal, index) => {
              const collected =
                multisig.data === undefined
                  ? undefined
                  : collectedWeight(
                      multisig.data.signers,
                      proposal.signatures.map((signature) => signature.signerKey),
                    );
              const required =
                multisig.data === undefined
                  ? undefined
                  : requiredThreshold(multisig.data.thresholds, proposal.thresholdCategory);

              return (
                <Pressable
                  key={proposal.id}
                  accessibilityRole="button"
                  className={`px-4 py-4 ${
                    index < proposals.length - 1 ? "border-b border-[#1E1E20]" : ""
                  }`}
                  onPress={() =>
                    router.push({
                      pathname: "/multisig/proposal/[id]",
                      params: { id: proposal.id, accountId: account.id },
                    })
                  }
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[15px] font-bold text-white">
                      {formatOperationKind(proposal.operationKind)}
                    </Text>
                    <Text
                      className="text-[13px] font-bold"
                      style={{ color: statusColor(proposal.status) }}
                    >
                      {formatStatus(proposal.status)}
                    </Text>
                  </View>
                  {collected !== undefined && required !== undefined ? (
                    <Text className="mt-1 text-[13px] font-semibold text-[#8E8E92]">
                      {`${collected} of ${required} weight collected`}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
