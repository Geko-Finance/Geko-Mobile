import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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

import { getKnownVaultsForNetwork } from "@/src/domain/earn/vault";
import {
  useVaults,
  type VaultWithInfo,
} from "@/src/features/invest/api/earn-queries";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { Skeleton } from "@/src/features/shared/components/ui/skeleton";
import { useActiveNetworkId } from "@/src/features/wallet/api/wallet-queries";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";
import type { VaultInfo } from "@/src/services/api/earn/vault-info-service";

type CardVariant = "usdc" | "xlm" | "generic";

type InvestmentCardProps = {
  asset: string;
  description: string;
  image?: "usdc" | "xlm";
  name: string;
  onPress: () => void;
  symbol: "$" | "stellar";
  variant: CardVariant;
};

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
  generic: {
    coin: "bg-[#138BFF]",
    coinShadow: "bg-[#0643A8]",
    gradient: ["#087BFF", "#0064E8", "#021B55"] as const,
    glow: "bg-[#40C8FF]",
    symbol: "text-[#8DBAFF]",
  },
};

function formatVaultTvl(info: VaultInfo): string {
  const total = info.totalManagedFunds.reduce(
    (sum, fund) => sum + fund.totalAmount,
    0n
  );

  return total.toString();
}

function getVaultAssetLabel(name: string): string {
  const firstWord = name.trim().split(/\s+/)[0];

  return firstWord || name;
}

function getVaultCardProps(vault: VaultWithInfo): Omit<InvestmentCardProps, "onPress"> {
  const nameLower = vault.name.toLowerCase();

  if (nameLower.includes("usdc")) {
    return {
      asset: getVaultAssetLabel(vault.name),
      description: `${formatVaultTvl(vault.info)} TVL`,
      image: "usdc",
      name: vault.name,
      symbol: "$",
      variant: "usdc",
    };
  }

  if (nameLower.includes("xlm") || nameLower.includes("stellar")) {
    return {
      asset: getVaultAssetLabel(vault.name),
      description: `${formatVaultTvl(vault.info)} TVL`,
      image: "xlm",
      name: vault.name,
      symbol: "stellar",
      variant: "xlm",
    };
  }

  return {
    asset: getVaultAssetLabel(vault.name),
    description: `${formatVaultTvl(vault.info)} TVL`,
    name: vault.name,
    symbol: "$",
    variant: "generic",
  };
}

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
  onPress,
  symbol,
  variant,
}: InvestmentCardProps) {
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
      <Pressable
        accessibilityRole="button"
        className="mt-4"
        onPress={onPress}
        style={styles.card}
      >
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
    <Pressable
      accessibilityRole="button"
      className="mt-4"
      onPress={onPress}
      style={styles.card}
    >
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

function VaultListSection() {
  const activeAccount = useActiveAccount();
  const router = useRouter();
  const networkId = useActiveNetworkId();
  const knownVaults = getKnownVaultsForNetwork(networkId);
  const vaultsQuery = useVaults(activeAccount?.publicKey);

  if (!activeAccount) {
    return (
      <ScreenPlaceholder
        description="Add or create a wallet to see available vaults."
        eyebrow="Invest"
        title="Connect a wallet"
      />
    );
  }

  if (vaultsQuery.isLoading) {
    return (
      <>
        <Skeleton
          className="mt-4 h-[236px] rounded-[20px]"
          startColor="bg-[#242426]"
        />
        <Skeleton
          className="mt-4 h-[236px] rounded-[20px]"
          startColor="bg-[#242426]"
        />
      </>
    );
  }

  if (vaultsQuery.isError) {
    return (
      <View className="mt-4 flex-row items-center justify-center gap-3">
        <Text className="text-[15px] font-semibold text-[#77777B]">
          Couldn&apos;t load vaults
        </Text>
        <Pressable accessibilityRole="button" onPress={() => vaultsQuery.refetch()}>
          <Text className="text-[15px] font-semibold text-[#087BFF]">Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (knownVaults.length === 0 || vaultsQuery.data?.length === 0) {
    return (
      <ScreenPlaceholder
        description="Vaults for this network aren't available yet — check back soon."
        eyebrow="Invest"
        title="No vaults yet"
      />
    );
  }

  return vaultsQuery.data!.map((vault) => {
    const cardProps = getVaultCardProps(vault);

    return (
      <InvestmentCard
        key={vault.id}
        {...cardProps}
        onPress={() =>
          router.push({
            pathname: "/invest/[vaultId]",
            params: { vaultId: vault.id },
          })
        }
      />
    );
  });
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
          <VaultListSection />
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
