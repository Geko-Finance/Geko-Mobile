import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { isLikelyStellarPublicKey } from "@/src/domain/wallet";
import { useAddTrustline } from "@/src/features/payments/api/payment-queries";
import { BackButton } from "@/src/features/shared/components/BackButton";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";
import {
  searchAssets,
  type AssetSearchResult,
} from "@/src/services/api/stellar/asset-search";

export function AddAssetScreen() {
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const addTrustline = useAddTrustline();
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssetSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<AssetSearchResult | null>(null);
  const [code, setCode] = useState("");
  const [issuer, setIssuer] = useState("");

  const trimmedCode = code.trim();
  const trimmedIssuer = issuer.trim();
  const codeValid = trimmedCode.length > 0 && trimmedCode.length <= 12;
  const issuerValid = isLikelyStellarPublicKey(trimmedIssuer);
  const formValid = codeValid && issuerValid;
  const showHint =
    (trimmedCode.length > 0 && !codeValid) ||
    (trimmedIssuer.length > 0 && !issuerValid);

  const searchValid = selected !== null;
  const submitEnabled =
    mode === "search" ? searchValid : formValid;

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (mode !== "search" || trimmedQuery.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(() => {
      searchAssets(trimmedQuery)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsSearching(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [query, mode]);

  if (activeAccount === null) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="mb-2 px-6 pt-4">
          <BackButton />
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-white">No wallet connected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2">
          <BackButton />
        </View>
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          ADD ASSET
        </Text>
        <Text className="mt-2 text-[28px] font-extrabold text-white">
          Trust a new asset
        </Text>
        <Text className="mt-2 text-[13px] font-semibold text-[#8E8E92]">
          {mode === "search"
            ? "Search for a known asset or enter one manually."
            : "Enter the asset code and issuer address to hold and send it from this wallet."}
        </Text>

        {mode === "manual" ? (
          <View className="mt-6">
            <Pressable
              className="mb-3 self-start"
              onPress={() => setMode("search")}
            >
              <Text className="text-[13px] font-bold text-[#8E8E92]">
                ← Search instead
              </Text>
            </Pressable>
            <View className="rounded-[20px] bg-[#121214] px-5 py-5">
              <TextInput
                className="rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
                placeholder="Asset code (e.g. USDC)"
                placeholderTextColor="#6E6E72"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                value={code}
                onChangeText={setCode}
              />
              <TextInput
                className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
                placeholder="Issuer address (G...)"
                placeholderTextColor="#6E6E72"
                autoCapitalize="characters"
                autoCorrect={false}
                value={issuer}
                onChangeText={setIssuer}
              />
              {showHint ? (
                <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
                  Enter a valid asset code and issuer address.
                </Text>
              ) : null}
              {addTrustline.isError ? (
                <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
                  Couldn&apos;t add trustline — please try again.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {mode === "search" ? (
          <>
            <View className="mt-6 rounded-[20px] bg-[#121214] px-5 py-5">
              <TextInput
                className="rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
                placeholder="Search asset code (e.g. USDC)"
                placeholderTextColor="#6E6E72"
                autoCapitalize="characters"
                autoCorrect={false}
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  setSelected(null);
                }}
              />
              {isSearching ? (
                <View className="mt-3">
                  <ActivityIndicator color="#8E8E92" size="small" />
                </View>
              ) : selected !== null ? (
                <>
                  <View className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3">
                    <Text className="text-[15px] font-bold text-white">
                      {selected.code}
                    </Text>
                    <Text className="mt-0.5 text-[12px] font-semibold text-[#8E8E92]">
                      {`Issuer: ${selected.issuer.slice(0, 6)}…${selected.issuer.slice(-6)}`}
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelected(null)}>
                    <Text className="mt-2 text-[13px] font-bold text-[#8E8E92]">
                      Change
                    </Text>
                  </Pressable>
                </>
              ) : results.length > 0 ? (
                results.map((result, index) => (
                  <Pressable
                    key={`${result.code}-${result.issuer}`}
                    className={`${index === 0 ? "mt-3" : "mt-2"} rounded-xl bg-[#1E1E20] px-4 py-3`}
                    onPress={() => setSelected(result)}
                  >
                    <Text className="text-[15px] font-bold text-white">
                      {result.code}
                    </Text>
                    <Text className="mt-0.5 text-[12px] font-semibold text-[#8E8E92]">
                      {`${result.issuer.slice(0, 6)}…${result.issuer.slice(-6)} · ${result.trustlines} trustlines`}
                    </Text>
                  </Pressable>
                ))
              ) : query.trim().length >= 2 ? (
                <Text className="mt-3 text-[13px] font-semibold text-[#8E8E92]">
                  No matching assets found.
                </Text>
              ) : null}
              {addTrustline.isError ? (
                <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
                  Couldn&apos;t add trustline — please try again.
                </Text>
              ) : null}
            </View>
            <Pressable
              className="mt-3 self-start"
              onPress={() => setMode("manual")}
            >
              <Text className="text-[13px] font-bold text-[#8E8E92]">
                Can&apos;t find it? Enter manually
              </Text>
            </Pressable>
          </>
        ) : null}

        <Pressable
          accessibilityRole="button"
          className={`mt-7 self-start rounded-full px-4 py-2.5 ${
            submitEnabled ? "bg-[#237BFF]" : "bg-[#1B3A5C]"
          }`}
          disabled={!submitEnabled || addTrustline.isPending}
          onPress={() => {
            const assetCode =
              mode === "search" ? selected!.code : trimmedCode;
            const assetIssuer =
              mode === "search" ? selected!.issuer : trimmedIssuer;
            addTrustline.mutate(
              { account: activeAccount, code: assetCode, issuer: assetIssuer },
              { onSuccess: () => router.back() },
            );
          }}
        >
          {addTrustline.isPending ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text className="text-[14px] font-bold text-white">Adding…</Text>
            </View>
          ) : (
            <Text
              className={`text-[14px] font-bold ${
                submitEnabled ? "text-white" : "text-white/50"
              }`}
            >
              Add asset
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
