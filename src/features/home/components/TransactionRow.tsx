import type { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

interface TransactionRowProps {
  amount: string;
  amountTone: "green" | "yellow" | "red";
  icon: LucideIcon;
  meta: string;
  title: string;
}

const amountToneClassName: Record<TransactionRowProps["amountTone"], string> = {
  green: "bg-[#5BED97]",
  red: "bg-[#F45F64]",
  yellow: "bg-[#F2CB63]",
};

export function TransactionRow({
  amount,
  amountTone,
  icon: Icon,
  meta,
  title,
}: TransactionRowProps) {
  return (
    <View className="flex-row items-center border-b border-white/10 px-5 py-5">
      <View className="mr-4 h-[48px] w-[48px] items-center justify-center rounded-full bg-[#087BFF]">
        <Icon color="#FFFFFF" size={24} strokeWidth={3} />
      </View>

      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-[#77777B]">{meta}</Text>
        <Text className="mt-0.5 text-[19px] font-semibold text-[#D6D6DB]">
          {title}
        </Text>
      </View>

      <View className={`rounded-full px-4 py-2 ${amountToneClassName[amountTone]}`}>
        <Text className="text-[16px] font-extrabold text-[#06101B]">
          {amount}
        </Text>
      </View>
    </View>
  );
}
