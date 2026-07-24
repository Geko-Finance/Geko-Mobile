import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/src/features/shared/components/BackButton";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { Skeleton } from "@/src/features/shared/components/ui/skeleton";
import { useWalletAccount } from "@/src/features/wallet/state/wallet-store";

import { useMultisigAccount } from "../api/multisig-queries";
import { useProposalsForAccount } from "../state/proposal-store";

function formatPublicKey(publicKey: string): string {
  return `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;
}

export function MultisigSettingsScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const account = useWalletAccount(accountId);
  const multisig = useMultisigAccount(account?.publicKey);
  const pendingProposals = useProposalsForAccount(account?.publicKey);
  const openCount = pendingProposals.filter(
    (proposal) => proposal.status === "collecting" || proposal.status === "ready",
  ).length;

  if (account === undefined) {
    return (
      <ScreenPlaceholder
        description="This account is not in your wallet. Return to the wallet list or choose another account."
        eyebrow="Multisig"
        title="Account not found"
      />
    );
  }

  if (account.custody !== "non_custodial") {
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
        <Text className="mt-2 text-[32px] font-extrabold text-white">
          {account.name}
        </Text>

        {multisig.isLoading ? (
          <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] p-4">
            <Skeleton className="mb-3 h-14 w-full rounded-xl" startColor="bg-[#242426]" />
            <Skeleton className="h-14 w-full rounded-xl" startColor="bg-[#242426]" />
          </View>
        ) : null}

        {multisig.isError ? (
          <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-5">
            <Text className="text-[15px] font-semibold text-[#D8D8DC]">
              Unable to load signer state. Check your connection and try again.
            </Text>
            <Pressable
              accessibilityRole="button"
              className="mt-4 self-start rounded-full bg-[#242426] px-4 py-2"
              onPress={() => void multisig.refetch()}
            >
              <Text className="text-[14px] font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {multisig.data !== undefined ? (
          <>
            <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
              <Text className="text-[13px] font-semibold text-[#8E8E92]">Thresholds</Text>
              <View className="mt-3 flex-row justify-between">
                <View>
                  <Text className="text-[12px] font-semibold text-[#8E8E92]">Low</Text>
                  <Text className="mt-1 text-[18px] font-extrabold text-white">
                    {multisig.data.thresholds.low}
                  </Text>
                </View>
                <View>
                  <Text className="text-[12px] font-semibold text-[#8E8E92]">Medium</Text>
                  <Text className="mt-1 text-[18px] font-extrabold text-white">
                    {multisig.data.thresholds.medium}
                  </Text>
                </View>
                <View>
                  <Text className="text-[12px] font-semibold text-[#8E8E92]">High</Text>
                  <Text className="mt-1 text-[18px] font-extrabold text-white">
                    {multisig.data.thresholds.high}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                className="mt-4 self-start rounded-full bg-[#242426] px-4 py-2"
                onPress={() =>
                  router.push({
                    pathname: "/multisig/edit-thresholds",
                    params: { accountId: account.id },
                  })
                }
              >
                <Text className="text-[14px] font-bold text-white">Edit thresholds</Text>
              </Pressable>
            </View>

            <Text className="mb-3 mt-6 text-[20px] font-extrabold text-white">Signers</Text>
            <View className="overflow-hidden rounded-[20px] bg-[#121214]">
              {multisig.data.signers.map((signer, index) => (
                <View
                  key={signer.key}
                  className={`flex-row items-center justify-between px-4 py-4 ${
                    index < multisig.data.signers.length - 1
                      ? "border-b border-[#1E1E20]"
                      : ""
                  }`}
                >
                  <View className="flex-1 pr-4">
                    <Text className="text-[15px] font-bold text-white">
                      {formatPublicKey(signer.key)}
                    </Text>
                    {signer.key === account.publicKey ? (
                      <Text className="mt-0.5 text-[12px] font-semibold text-[#5BED97]">
                        This device
                      </Text>
                    ) : null}
                  </View>
                  <Text className="text-[15px] font-semibold text-[#8E8E92]">
                    weight {signer.weight}
                  </Text>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              className="mt-3 self-start rounded-full bg-[#242426] px-4 py-2.5"
              onPress={() =>
                router.push({
                  pathname: "/multisig/add-signer",
                  params: { accountId: account.id },
                })
              }
            >
              <Text className="text-[14px] font-bold text-white">Add signer</Text>
            </Pressable>
          </>
        ) : null}

        <Pressable
          accessibilityRole="button"
          className="mt-8 flex-row items-center justify-between rounded-[20px] bg-[#121214] px-4 py-4"
          onPress={() =>
            router.push({
              pathname: "/multisig/pending",
              params: { accountId: account.id },
            })
          }
        >
          <Text className="text-[15px] font-bold text-white">Pending approvals</Text>
          {openCount > 0 ? (
            <View className="rounded-full bg-[#237BFF] px-2.5 py-1">
              <Text className="text-[12px] font-bold text-white">{openCount}</Text>
            </View>
          ) : (
            <Text className="text-[13px] font-semibold text-[#8E8E92]">None</Text>
          )}
        </Pressable>

        {multisig.isLoading && !multisig.isError ? (
          <View className="mt-4 items-center">
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
