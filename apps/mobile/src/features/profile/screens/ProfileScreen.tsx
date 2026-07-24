import { useRouter } from "expo-router";
import {
  Bell,
  Droplet,
  LogOut,
  Plus,
  Wallet,
} from "lucide-react-native";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/src/features/auth/session/SessionProvider";
import {
  useAccountBalances,
  useActiveNetworkId,
  useFundTestnetAccount,
} from "@/src/features/wallet/api/wallet-queries";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";
import type { WalletCustody } from "@/src/domain/wallet";

function formatPublicKey(publicKey: string): string {
  return `${publicKey.slice(0, 6)}…${publicKey.slice(-6)}`;
}

function formatCustodyLabel(custody: WalletCustody): string {
  switch (custody) {
    case "custodial":
      return "Custodial";
    case "watch_only":
      return "Watch-only";
    case "non_custodial":
      return "Non-custodial";
  }
}

export function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const account = useActiveAccount();
  const balances = useAccountBalances(account?.publicKey);
  const networkId = useActiveNetworkId();
  const fundAccount = useFundTestnetAccount();
  const displayName = session?.user.name ?? session?.user.email ?? "Customer";
  const formattedBalance = useMemo(() => {
    const nativeBalance = balances.data?.find((b) => b.asset.type === "native");

    if (nativeBalance === undefined) {
      return "0.00 XLM";
    }

    return `${Number(nativeBalance.amount).toFixed(2)} XLM`;
  }, [balances.data]);
  const otherBalances = (balances.data ?? []).filter(
    (b) => b.asset.type !== "native",
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          PROFILE
        </Text>
        <Text className="mt-2 text-[28px] font-extrabold text-white">
          {displayName}
        </Text>

        <View className="mt-6 rounded-[20px] bg-[#121214] px-4 py-4">
          {account !== null ? (
            <>
              <Text className="text-[16px] font-bold text-white">
                {account.name}
              </Text>
              <Text className="mt-1 text-[13px] font-semibold text-[#8E8E92]">
                {formatPublicKey(account.publicKey)}
              </Text>
              <View className="mt-2 self-start rounded-full bg-[#242426] px-3 py-1.5">
                <Text className="text-[12px] font-bold text-[#D8D8DC]">
                  {formatCustodyLabel(account.custody)}
                </Text>
              </View>
              <Text className="mt-3 text-[13px] font-semibold text-[#8E8E92]">
                Balance: {formattedBalance}
              </Text>
              {otherBalances.length > 0 ? (
                <View className="mt-2">
                  {otherBalances.map((balance) => (
                    <Text
                      key={balance.asset.id}
                      className="text-[13px] font-semibold text-[#8E8E92]"
                    >
                      {balance.asset.code}: {Number(balance.amount).toFixed(2)}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                className="mt-3 flex-row items-center gap-2 self-start rounded-full bg-[#242426] px-4 py-2.5"
                onPress={() => router.push("/payments/add-asset")}
              >
                <Plus color="#FFFFFF" size={16} strokeWidth={2.5} />
                <Text className="text-[14px] font-bold text-white">Add asset</Text>
              </Pressable>
              {networkId === "testnet" ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    className="mt-3 flex-row items-center gap-2 self-start rounded-full bg-[#123B2B] px-4 py-2.5"
                    disabled={fundAccount.isPending}
                    onPress={() => fundAccount.mutate(account.publicKey)}
                  >
                    {fundAccount.isPending ? (
                      <ActivityIndicator color="#5BED97" size="small" />
                    ) : (
                      <Droplet color="#5BED97" size={16} strokeWidth={2.5} />
                    )}
                    <Text className="text-[14px] font-bold text-[#5BED97]">
                      {fundAccount.isPending
                        ? "Funding…"
                        : "Fund wallet (testnet)"}
                    </Text>
                  </Pressable>
                  {fundAccount.isError ? (
                    <Text className="mt-2 text-[13px] font-semibold text-[#FF6B6B]">
                      Funding failed - please try again.
                    </Text>
                  ) : fundAccount.isSuccess ? (
                    <Text className="mt-2 text-[13px] font-semibold text-[#5BED97]">
                      Funded!
                    </Text>
                  ) : null}
                </>
              ) : null}
              {account.custody === "custodial" ? (
                <View className="mt-4 rounded-xl bg-[#1E1E20] px-4 py-3">
                  <Text className="text-[13px] font-semibold leading-[18px] text-[#8E8E92]">
                    Your recovery code was shown once when this wallet was
                    created and can&apos;t be displayed again. If you need to
                    approve a new device, use the code you saved at setup.
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <Text className="text-[14px] font-semibold text-[#8E8E92]">
              No wallet connected.
            </Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          className="mt-3 flex-row items-center gap-2 self-start rounded-full bg-[#242426] px-4 py-2.5"
          onPress={() => router.push("/wallet")}
        >
          <Wallet color="#FFFFFF" size={16} strokeWidth={2.5} />
          <Text className="text-[14px] font-bold text-white">Manage wallets</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          className="mt-3 flex-row items-center gap-2 self-start rounded-full bg-[#242426] px-4 py-2.5"
          onPress={() => router.push("/profile/notification-preferences")}
        >
          <Bell color="#FFFFFF" size={16} strokeWidth={2.5} />
          <Text className="text-[14px] font-bold text-white">Notifications</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          className="mt-8 flex-row items-center gap-2 self-start rounded-full bg-[#242426] px-4 py-2.5"
          onPress={signOut}
        >
          <LogOut color="#FF6B6B" size={16} strokeWidth={2.5} />
          <Text className="text-[14px] font-bold text-[#FF6B6B]">Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
