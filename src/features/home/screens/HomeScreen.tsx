import {
  ArrowDown,
  Bell,
  ChevronDown,
  CircleDollarSign,
  Grid2X2,
  PiggyBank,
  Repeat2,
  Send,
} from "lucide-react-native";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CARD_ASSETS,
  FinanceCard,
} from "@/src/features/home/components/FinanceCard";
import { QuickAction } from "@/src/features/home/components/QuickAction";
import { TransactionRow } from "@/src/features/home/components/TransactionRow";

const TRANSACTIONS = [
  {
    amount: "+$30,00",
    amountTone: "green" as const,
    icon: Repeat2,
    meta: "Today - 6:22 AM",
    title: "Jose Sanchez",
  },
  {
    amount: "$450,00",
    amountTone: "yellow" as const,
    icon: PiggyBank,
    meta: "Yesterday - 12:31 PM",
    title: "Mexico Trip Budget",
  },
  {
    amount: "-$145,00",
    amountTone: "red" as const,
    icon: Repeat2,
    meta: "Nov 9 - 15:01 PM",
    title: "Christmas Gift",
  },
  {
    amount: "+$50,00",
    amountTone: "green" as const,
    icon: Send,
    meta: "Nov 4 - 12:31 PM",
    title: "Salary Bonus",
  },
  {
    amount: "+$150,00",
    amountTone: "green" as const,
    icon: ArrowDown,
    meta: "Nov 2 - 9:15 AM",
    title: "Freelance Project",
  },
  {
    amount: "-$32,80",
    amountTone: "red" as const,
    icon: CircleDollarSign,
    meta: "Oct 31 - 8:04 PM",
    title: "Coffee & Snacks",
  },
  {
    amount: "+$920,00",
    amountTone: "green" as const,
    icon: ArrowDown,
    meta: "Oct 29 - 10:00 AM",
    title: "Payroll Deposit",
  },
  {
    amount: "$120,00",
    amountTone: "yellow" as const,
    icon: PiggyBank,
    meta: "Oct 26 - 2:45 PM",
    title: "Emergency Fund",
  },
  {
    amount: "-$76,10",
    amountTone: "red" as const,
    icon: Send,
    meta: "Oct 22 - 7:18 PM",
    title: "Dinner Transfer",
  },
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const stickyOpacity = scrollY.interpolate({
    inputRange: [170, 260],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const stickyTranslateY = scrollY.interpolate({
    inputRange: [170, 260],
    outputRange: [-16, 0],
    extrapolate: "clamp",
  });

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
            Jonathan Doe
          </Text>
          <Text className="mt-0.5 text-[13px] font-semibold text-white/55">
            Balance $6,480.00
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
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8 flex-row items-center justify-between">
          <Grid2X2 color="#FFFFFF" fill="#FFFFFF" size={25} strokeWidth={2.5} />
          <Bell color="#8E8E92" fill="#8E8E92" size={25} strokeWidth={2.5} />
        </View>

        <FinanceCard balance="$6,480.00" color="blue" owner="Jonathan Doe" />

        <View className="mt-4 flex-row gap-2.5">
          <QuickAction icon={Send} label="Send" />
          <QuickAction icon={ArrowDown} label="Receive" />
          <QuickAction icon={CircleDollarSign} label="Buy & Sell" />
        </View>

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
          <View className="h-[42px] flex-1 items-center justify-center">
            <Text className="text-[17px] font-bold text-[#9D9D9F]">Today</Text>
          </View>
          <View className="h-[42px] flex-1 items-center justify-center">
            <Text className="text-[17px] font-bold text-[#9D9D9F]">Week</Text>
          </View>
          <View className="h-[42px] flex-1 items-center justify-center rounded-full bg-[#242426]">
            <Text className="text-[17px] font-extrabold text-[#D8D8DC]">
              Month
            </Text>
          </View>
        </View>

        <View className="mt-4 overflow-hidden rounded-[20px] bg-[#121214] pb-24">
          {TRANSACTIONS.map((transaction) => (
            <TransactionRow
              key={`${transaction.meta}-${transaction.title}`}
              {...transaction}
            />
          ))}
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
