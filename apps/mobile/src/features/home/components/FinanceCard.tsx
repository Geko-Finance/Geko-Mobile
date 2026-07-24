import type { ImageSourcePropType } from "react-native";
import { ImageBackground, Text, View } from "react-native";

export type FinanceCardColor = "blue" | "green" | "red" | "navy";

interface FinanceCardProps {
  balance: string;
  color?: FinanceCardColor;
  owner: string;
}

export const CARD_ASSETS: Record<FinanceCardColor, ImageSourcePropType> = {
  blue: require("@/src/assets/images/cards/card-blue.png"),
  green: require("@/src/assets/images/cards/card-green.png"),
  navy: require("@/src/assets/images/cards/card-navy.png"),
  red: require("@/src/assets/images/cards/card-red.png"),
};

export function FinanceCard({
  balance,
  color = "blue",
  owner,
}: FinanceCardProps) {
  return (
    <ImageBackground
      source={CARD_ASSETS[color]}
      className="h-[232px] overflow-hidden rounded-[20px]"
      imageClassName="rounded-[20px]"
      resizeMode="cover"
    >
      <View className="flex-1 justify-between px-5 py-7">
        <View>
          <Text className="text-[20px] font-semibold text-white/60">
            Balance
          </Text>
          <Text className="mt-1 text-[27px] font-bold text-white">
            {balance}
          </Text>
        </View>

        <View>
          <Text className="text-[17px] font-semibold text-white/60">Owner</Text>
          <Text className="mt-1 text-[24px] font-bold text-white">{owner}</Text>
        </View>
      </View>
    </ImageBackground>
  );
}
