import { LinearGradient } from "expo-linear-gradient";
import { Bell, Grid2X2 } from "lucide-react-native";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type InvestmentAsset = {
  asset: string;
  description: string;
  image: "usdc" | "xlm";
  name: string;
  symbol: "$" | "stellar";
  variant: "usdc" | "xlm";
};

const INVESTMENT_ASSETS: InvestmentAsset[] = [
  {
    asset: "USDC",
    description: "Stable growth asset",
    image: "usdc",
    name: "USD Coin",
    symbol: "$",
    variant: "usdc",
  },
  {
    asset: "XLM",
    description: "Fast global transfers",
    image: "xlm",
    name: "Stellar",
    symbol: "stellar",
    variant: "xlm",
  },
];

const CARD_IMAGES = {
  usdc: require("@/src/assets/images/invest/usdc-card.png"),
  xlm: require("@/src/assets/images/invest/xlm-card.png"),
};

const CARD_STYLES = {
  usdc: {
    coin: "bg-[#138BFF]",
    coinShadow: "bg-[#0643A8]",
    gradient: ["#087BFF", "#0064E8", "#021B55"] as const,
    glow: "bg-[#40C8FF]",
    symbol: "text-[#8DBAFF]",
  },
  xlm: {
    coin: "bg-[#1958B6]",
    coinShadow: "bg-[#041B4A]",
    gradient: ["#087BFF", "#0057D4", "#031943"] as const,
    glow: "bg-[#159DFF]",
    symbol: "text-[#8DBAFF]",
  },
};

function StellarMark() {
  return (
    <View className="h-[92px] w-[128px] items-center justify-center">
      <View className="absolute h-[84px] w-[84px] rounded-full border-[10px] border-[#8DBAFF]" />
      <View className="h-[14px] w-[124px] -rotate-[18deg] rounded-full bg-[#8DBAFF]" />
      <View className="mt-4 h-[14px] w-[124px] -rotate-[18deg] rounded-full bg-[#8DBAFF]" />
    </View>
  );
}

function InvestmentCard({
  asset,
  description,
  image,
  name,
  symbol,
  variant,
}: InvestmentAsset) {
  const style = CARD_STYLES[variant];

  const content = (
    <View style={styles.cardContent}>
      <Text className="text-[20px] font-bold text-white/45">
        Invest in
      </Text>
      <Text
        className="mt-1 text-[28px] font-extrabold text-white"
        numberOfLines={1}
      >
        {asset} - {name}
      </Text>
      <Text className="mt-2 text-[12px] font-bold uppercase text-white/35">
        {description}
      </Text>
    </View>
  );

  if (image) {
    return (
      <Pressable accessibilityRole="button" className="mt-4" style={styles.card}>
        <ImageBackground
          imageStyle={styles.cardImage}
          resizeMode="cover"
          source={CARD_IMAGES[image]}
          style={styles.imageCard}
        >
          {content}
        </ImageBackground>
      </Pressable>
    );
  }

  return (
    <Pressable accessibilityRole="button" className="mt-4" style={styles.card}>
      <LinearGradient
        colors={style.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientCard}
      >
        <View
          className={`absolute right-[-18px] top-[24px] h-[280px] w-[280px] rounded-full ${style.glow} opacity-35`}
        />
        <View
          className={`absolute right-[-48px] top-[38px] h-[292px] w-[292px] rounded-full ${style.coinShadow} opacity-55`}
        />
        <View
          className={`absolute right-[-32px] top-[52px] h-[272px] w-[272px] rounded-full ${style.coin}`}
        >
          <View className="absolute inset-[10px] rounded-full border border-white/15" />
          <View className="absolute inset-[28px] rounded-full border-[16px] border-[#8DBAFF]/70" />
          <View className="absolute inset-0 items-center justify-center">
            {symbol === "$" ? (
              <Text className={`text-[132px] font-black ${style.symbol}`}>
                $
              </Text>
            ) : (
              <StellarMark />
            )}
          </View>
        </View>

        {variant === "xlm" ? (
          <View className="absolute bottom-[-52px] right-[-40px] h-[156px] w-[156px] rounded-full bg-[#0E8DEB]" />
        ) : null}

        {content}
      </LinearGradient>
    </Pressable>
  );
}

export function InvestScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-36"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-5 flex-row items-center justify-between">
          <Grid2X2 color="#FFFFFF" fill="#FFFFFF" size={25} strokeWidth={2.5} />
          <Bell color="#8E8E92" fill="#8E8E92" size={25} strokeWidth={2.5} />
        </View>

        <Text className="text-[34px] font-extrabold leading-[39px] text-[#D8D8DC]">
          Start investing today{"\n"}& unlock rewards
        </Text>
        <Text className="mt-4 text-[15px] font-semibold leading-5 text-[#77777B]">
          Discover curated assets, start small, and grow your portfolio with a
          clear path toward long-term rewards.
        </Text>

        <View className="mt-4">
          {INVESTMENT_ASSETS.map((asset) => (
            <InvestmentCard key={asset.asset} {...asset} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    height: 236,
    overflow: "hidden",
  },
  cardContent: {
    bottom: 28,
    left: 24,
    position: "absolute",
    right: 24,
  },
  cardImage: {
    borderRadius: 20,
  },
  gradientCard: {
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  imageCard: {
    flex: 1,
  },
});
