import {
  ArrowDown,
  Bell,
  ChevronDown,
  CircleDollarSign,
  Grid2X2,
  Send,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { canSend } from "@/src/domain/wallet";
import {
  CARD_ASSETS,
  FinanceCard,
} from "@/src/features/home/components/FinanceCard";
import { QuickAction } from "@/src/features/home/components/QuickAction";
import { TransactionRow } from "@/src/features/home/components/TransactionRow";
import {
  useAccountBalances,
  useAccountTransactions,
} from "@/src/features/wallet/api/wallet-queries";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";

type TransactionPeriod = "today" | "week" | "month";

const PERIOD_OPTIONS: { label: string; value: TransactionPeriod }[] = [
  { label: "Today", value: "today" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeAccount = useActiveAccount();
  const balances = useAccountBalances(activeAccount?.publicKey);
  const transactions = useAccountTransactions(activeAccount?.publicKey);
  const [selectedPeriod, setSelectedPeriod] =
    useState<TransactionPeriod>("month");
  const [showComingSoon, setShowComingSoon] = useState(false);
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const stickyOpacity = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [170, 260],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [scrollY]
  );
  const stickyTranslateY = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [170, 260],
        outputRange: [-16, 0],
        extrapolate: "clamp",
      }),
    [scrollY]
  );
  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY]
  );
  const formattedBalance = useMemo(() => {
    const nativeBalance = balances.data?.find((b) => b.asset.type === "native");

    if (nativeBalance === undefined) {
      return "0.00 XLM";
    }

    return `${Number(nativeBalance.amount).toFixed(2)} XLM`;
  }, [balances.data]);
  const otherBalances = (balances.data ?? []).filter(
    (b) => b.asset.type !== "native"
  );

  const ownerName = activeAccount?.name ?? "Wallet";

  const visibleTransactions = useMemo(() => {
    const entries = transactions.data ?? [];
    const now = Date.now();

    return entries
      .filter((entry) => {
        const age = now - new Date(entry.createdAt).getTime();

        if (selectedPeriod === "today") {
          return age < DAY_MS;
        }

        if (selectedPeriod === "week") {
          return age < 7 * DAY_MS;
        }

        return age < 30 * DAY_MS;
      })
      .map((entry) => {
        const isReceived = entry.type === "received";
        const createdAt = new Date(entry.createdAt);

        return {
          id: entry.id,
          amount: `${isReceived ? "+" : "-"}${Number(entry.amountXlm).toFixed(2)} XLM`,
          amountTone: isReceived ? ("green" as const) : ("red" as const),
          icon: isReceived ? ArrowDown : Send,
          meta: `${createdAt.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })} · ${createdAt.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}`,
          title: `${entry.counterparty.slice(0, 4)}...${entry.counterparty.slice(-4)}`,
        };
      });
  }, [selectedPeriod, transactions.data]);

  if (activeAccount === null) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">No wallet connected.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickyHeader,
          {
            opacity: stickyOpacity,
            top: insets.top + 8,
            transform: [{ translateY: stickyTranslateY }],
          },
        ]}
      >
        <Image
          source={CARD_ASSETS.blue}
          className="h-[54px] w-[86px] rounded-[10px]"
        />
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-extrabold text-white">
            {ownerName}
          </Text>
          <Text className="mt-0.5 text-[13px] font-semibold text-white/55">
            Balance {formattedBalance}
          </Text>
        </View>
        <View className="rounded-full bg-[#123B2B] px-3 py-1.5">
          <Text className="text-[12px] font-bold text-[#5BED97]">Active</Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8 flex-row items-center justify-between">
          <Grid2X2 color="#FFFFFF" fill="#FFFFFF" size={25} strokeWidth={2.5} />
          <Bell color="#8E8E92" fill="#8E8E92" size={25} strokeWidth={2.5} />
        </View>

        <FinanceCard balance={formattedBalance} color="blue" owner={ownerName} />

        <View className="mt-4">
          <View className="flex-row gap-2.5">
            <QuickAction
              disabled={!canSend(activeAccount)}
              icon={Send}
              label="Send"
              onPress={() => router.push("/payments/send-options")}
            />
            <QuickAction
              icon={ArrowDown}
              label="Receive"
              onPress={() => router.push("/payments/receive")}
            />
            <QuickAction
              icon={CircleDollarSign}
              label="Buy & Sell"
              onPress={() => setShowComingSoon(true)}
            />
          </View>
          {showComingSoon ? (
            <Pressable
              className="mt-2 rounded-xl bg-[#1E1E20] px-4 py-3"
              onPress={() => setShowComingSoon(false)}
            >
              <Text className="text-[13px] font-semibold text-[#8E8E92]">
                Buy & Sell is coming soon.
              </Text>
            </Pressable>
          ) : null}
        </View>

        {otherBalances.length > 0 ? (
          <View className="mt-4 overflow-hidden rounded-[20px] bg-[#121214]">
            {otherBalances.map((balance, index) => (
              <View
                key={balance.asset.id}
                className={`flex-row items-center justify-between px-4 py-3 ${
                  index < otherBalances.length - 1 ? "border-b border-[#1E1E20]" : ""
                }`}
              >
                <Text className="text-[15px] font-bold text-white">
                  {balance.asset.code}
                </Text>
                <Text className="text-[15px] font-semibold text-[#8E8E92]">
                  {Number(balance.amount).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-[29px] font-extrabold text-[#A6A6A8]">
            Transactions
          </Text>
          <View className="flex-row items-center">
            <Text className="text-[20px] font-bold text-[#77777B]">All</Text>
            <ChevronDown color="#77777B" size={19} strokeWidth={3} />
          </View>
        </View>

        <View className="mt-4 flex-row rounded-full border border-[#303033] p-1">
          {PERIOD_OPTIONS.map((option) => {
            const isSelected = selectedPeriod === option.value;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className={`h-[42px] flex-1 items-center justify-center rounded-full ${
                  isSelected ? "bg-[#242426]" : "bg-transparent"
                }`}
                key={option.value}
                onPress={() => setSelectedPeriod(option.value)}
              >
                <Text
                  className={`text-[17px] ${
                    isSelected
                      ? "font-extrabold text-[#D8D8DC]"
                      : "font-bold text-[#9D9D9F]"
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-4 overflow-hidden rounded-[20px] bg-[#121214] pb-24">
          {transactions.isLoading ? null : visibleTransactions.length === 0 ? (
            <Text className="px-4 py-6 text-[#8E8E92]">No transactions yet.</Text>
          ) : (
            visibleTransactions.map((transaction) => (
              <TransactionRow key={transaction.id} {...transaction} />
            ))
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    alignItems: "center",
    backgroundColor: "rgba(18,18,20,0.94)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    left: 20,
    padding: 10,
    position: "absolute",
    right: 20,
    zIndex: 10,
  },
});
