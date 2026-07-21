import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isNativeAsset } from "@/src/domain/wallet";
import type { StellarNetworkId, WalletCustody } from "@/src/domain/wallet";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { Skeleton } from "@/src/features/shared/components/ui/skeleton";
import {
  isAccountNotFoundError,
  useAccountBalances,
  useActiveNetworkId,
} from "@/src/features/wallet/api/wallet-queries";
import {
  useWalletAccount,
  useWalletAccounts,
  useWalletStore,
} from "@/src/features/wallet/state/wallet-store";

function formatPublicKey(publicKey: string): string {
  return `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;
}

function trimTrailingZeros(amount: string): string {
  if (!amount.includes(".")) {
    return amount;
  }

  const trimmed = amount.replace(/\.?0+$/, "");

  return trimmed === "" || trimmed === "." ? "0" : trimmed;
}

function formatCustodyLabel(custody: WalletCustody): string {
  switch (custody) {
    case "custodial":
      return "Custodial";
    case "non_custodial":
      return "Self-custody";
    case "watch_only":
      return "Watch-only";
  }
}

function formatNetworkLabel(networkId: StellarNetworkId): string {
  return networkId === "testnet" ? "Testnet" : "Mainnet";
}

export function AccountDetailScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const account = useWalletAccount(accountId);
  const accounts = useWalletAccounts();
  const setActiveAccount = useWalletStore((state) => state.setActiveAccount);
  const networkId = useActiveNetworkId();
  const {
    data: balances,
    error,
    isError,
    isLoading,
    refetch,
  } = useAccountBalances(account?.publicKey);

  if (account === undefined) {
    return (
      <ScreenPlaceholder
        description="This account is not in your wallet. Return to the wallet list or choose another account."
        eyebrow="Wallet"
        title="Account not found"
      />
    );
  }

  const networkLabel = formatNetworkLabel(networkId);

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          Wallet
        </Text>

        <Text className="mt-2 text-[32px] font-extrabold text-white">
          {account.name}
        </Text>

        <View className="mt-3 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-[#242426] px-3 py-1.5">
            <Text className="text-[12px] font-bold text-[#D8D8DC]">
              {formatCustodyLabel(account.custody)}
            </Text>
          </View>
          <View className="rounded-full bg-[#123B2B] px-3 py-1.5">
            <Text className="text-[12px] font-bold text-[#5BED97]">
              {networkLabel}
            </Text>
          </View>
        </View>

        <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
          <Text className="text-[13px] font-semibold text-[#8E8E92]">
            Public key
          </Text>
          <Text className="mt-1 text-[15px] font-semibold text-white">
            {formatPublicKey(account.publicKey)}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Manage signers"
          accessibilityRole="button"
          className="mt-4 self-start rounded-full bg-[#242426] px-4 py-2.5"
          onPress={() =>
            router.push({ pathname: "/multisig/signers", params: { accountId: account.id } })
          }
        >
          <Text className="text-[14px] font-bold text-white">Manage signers</Text>
        </Pressable>

        <Text className="mb-3 mt-6 text-[15px] font-bold text-[#8E8E92]">
          Accounts
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          {accounts.map((entry) => {
            const isActive = entry.id === accountId;

            return (
              <Pressable
                key={entry.id}
                accessibilityLabel={`Switch to ${entry.name}, ${formatPublicKey(entry.publicKey)}`}
                accessibilityRole="button"
                className={`rounded-full px-3 py-2 ${
                  isActive
                    ? "bg-[#242426] border border-[#5BED97]"
                    : "border border-[#303033]"
                }`}
                onPress={() => {
                  setActiveAccount(entry.id);
                  router.setParams({ accountId: entry.id });
                }}
              >
                <Text
                  className={`text-[13px] font-bold ${
                    isActive ? "text-[#D8D8DC]" : "text-[#8E8E92]"
                  }`}
                >
                  {entry.name}
                </Text>
                <Text className="mt-0.5 text-[11px] font-semibold text-[#8E8E92]">
                  {formatPublicKey(entry.publicKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text className="mb-3 mt-6 text-[20px] font-extrabold text-white">
          Balances
        </Text>

        {isLoading ? (
          <View className="overflow-hidden rounded-[20px] bg-[#121214] p-4">
            <Skeleton
              className="mb-3 h-14 w-full rounded-xl"
              startColor="bg-[#242426]"
            />
            <Skeleton
              className="mb-3 h-14 w-full rounded-xl"
              startColor="bg-[#242426]"
            />
            <Skeleton className="h-14 w-full rounded-xl" startColor="bg-[#242426]" />
          </View>
        ) : null}

        {!isLoading && isError && isAccountNotFoundError(error) ? (
          <View className="overflow-hidden rounded-[20px] bg-[#121214] px-4 py-5">
            <Text className="text-[15px] font-semibold text-[#D8D8DC]">
              {`This account isn't funded on ${networkLabel} yet.`}
            </Text>
          </View>
        ) : null}

        {!isLoading && isError && !isAccountNotFoundError(error) ? (
          <View className="overflow-hidden rounded-[20px] bg-[#121214] px-4 py-5">
            <Text className="text-[15px] font-semibold text-[#D8D8DC]">
              Unable to load balances. Check your connection and try again.
            </Text>
            <Pressable
              accessibilityLabel="Try again"
              accessibilityRole="button"
              className="mt-4 self-start rounded-full bg-[#242426] px-4 py-2"
              onPress={() => {
                void refetch();
              }}
            >
              <Text className="text-[14px] font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !isError && balances !== undefined && balances.length === 0 ? (
          <Text className="text-[15px] font-semibold text-[#8E8E92]">
            No balances
          </Text>
        ) : null}

        {!isLoading && !isError && balances !== undefined && balances.length > 0 ? (
          <View className="overflow-hidden rounded-[20px] bg-[#121214]">
            {balances.map((balance) => (
              <View
                key={balance.asset.id}
                className="flex-row items-center justify-between border-b border-[#1E1E20] px-4 py-4 last:border-b-0"
              >
                <View className="flex-1 pr-4">
                  <Text className="text-[16px] font-bold text-white">
                    {balance.asset.code}
                  </Text>
                  {!isNativeAsset(balance.asset) && balance.asset.issuer !== undefined ? (
                    <Text className="mt-0.5 text-[12px] font-semibold text-[#8E8E92]">
                      {formatPublicKey(balance.asset.issuer)}
                    </Text>
                  ) : null}
                </View>
                <Text className="text-[16px] font-semibold text-white">
                  {trimTrailingZeros(balance.amount)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
