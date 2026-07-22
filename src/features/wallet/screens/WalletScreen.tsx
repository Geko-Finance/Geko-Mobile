import { useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  isLikelyStellarPublicKey,
  makeWatchOnlyAccount,
} from "@/src/domain/wallet";
import type { StellarNetworkId, WalletCustody } from "@/src/domain/wallet";
import { useSession } from "@/src/features/auth/session/SessionProvider";
import { BackButton } from "@/src/features/shared/components/BackButton";
import {
  useActiveNetworkId,
  useCreateTestWallet,
} from "@/src/features/wallet/api/wallet-queries";
import {
  useWalletAccounts,
  useWalletStore,
} from "@/src/features/wallet/state/wallet-store";

function formatPublicKey(publicKey: string): string {
  return `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;
}

function formatNetworkLabel(networkId: StellarNetworkId): string {
  return networkId === "testnet" ? "Testnet" : "Mainnet";
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

export function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const accounts = useWalletAccounts();
  const activeAccountId = useWalletStore((state) => state.activeAccountId);
  const addAccount = useWalletStore((state) => state.addAccount);
  const removeAccount = useWalletStore((state) => state.removeAccount);
  const networkId = useActiveNetworkId();
  const createTestWallet = useCreateTestWallet();

  const [name, setName] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const networkLabel = formatNetworkLabel(networkId);
  const inlineError =
    validationError ??
    (createTestWallet.isError ? createTestWallet.error.message : null);

  const handleWatchAddress = () => {
    if (session === null) {
      return;
    }

    createTestWallet.reset();
    const key = publicKey.trim();

    if (!isLikelyStellarPublicKey(key)) {
      setValidationError(
        "That doesn't look like a Stellar public key (starts with G, 56 characters)."
      );
      return;
    }

    if (accounts.some((entry) => entry.id === key)) {
      setValidationError("That wallet is already in your list.");
      return;
    }

    addAccount(
      makeWatchOnlyAccount(name.trim() || "Watched wallet", key, session.user.id)
    );
    setName("");
    setPublicKey("");
    setValidationError(null);
  };

  const handleCreateTestWallet = () => {
    setValidationError(null);
    createTestWallet.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          setName("");
        },
      }
    );
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2">
          <BackButton />
        </View>
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          WALLET
        </Text>

        <View className="mt-2 flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-[32px] font-extrabold text-white">
            Wallets
          </Text>
          <View className="rounded-full bg-[#123B2B] px-3 py-1.5">
            <Text className="text-[12px] font-bold text-[#5BED97]">
              {networkLabel}
            </Text>
          </View>
        </View>

        <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214]">
          {accounts.length === 0 ? (
            <Text className="px-4 py-5 text-[15px] font-semibold text-[#8E8E92]">
              No wallets yet
            </Text>
          ) : (
            accounts.map((entry, index) => {
              const isActive = entry.id === activeAccountId;

              return (
                <View
                  key={entry.id}
                  className={`flex-row items-center ${
                    index < accounts.length - 1 ? "border-b border-[#1E1E20]" : ""
                  }`}
                >
                  <Pressable
                    accessibilityLabel={`Open ${entry.name}, ${formatPublicKey(entry.publicKey)}`}
                    accessibilityRole="button"
                    className="min-h-[72px] flex-1 px-4 py-4"
                    onPress={() => {
                      router.push({
                        pathname: "/wallet/[accountId]",
                        params: { accountId: entry.id },
                      });
                    }}
                  >
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="text-[16px] font-bold text-white">
                        {entry.name}
                      </Text>
                      {isActive ? (
                        <View className="rounded-full bg-[#242426] px-2 py-0.5">
                          <Text className="text-[11px] font-bold text-[#5BED97]">
                            Active
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="mt-1 text-[13px] font-semibold text-[#8E8E92]">
                      {formatPublicKey(entry.publicKey)} ·{" "}
                      {formatCustodyLabel(entry.custody)}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Remove ${entry.name}`}
                    accessibilityRole="button"
                    className="px-4 py-4"
                    hitSlop={8}
                    onPress={() => {
                      Alert.alert("Remove wallet?", entry.name, [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () => {
                            removeAccount(entry.id);
                          },
                        },
                      ]);
                    }}
                  >
                    <Trash2 color="#8E8E92" size={18} strokeWidth={2.25} />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        <Text className="mb-3 mt-6 text-[20px] font-extrabold text-white">
          Add wallet
        </Text>

        <View className="overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
          <TextInput
            autoCapitalize="words"
            autoComplete="off"
            autoCorrect={false}
            className="rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            placeholder="Name"
            placeholderTextColor="#6E6E72"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect={false}
            className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            placeholder="G… public key"
            placeholderTextColor="#6E6E72"
            value={publicKey}
            onChangeText={setPublicKey}
          />

          {inlineError !== null ? (
            <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
              {inlineError}
            </Text>
          ) : null}

          <Pressable
            accessibilityLabel="Create wallet without a seed phrase"
            accessibilityRole="button"
            className="mt-4 self-start rounded-full bg-[#242426] px-4 py-2.5"
            onPress={() => router.push("/onboarding/custodial")}
          >
            <Text className="text-[14px] font-bold text-white">
              Create wallet without a seed phrase
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Watch address"
            accessibilityRole="button"
            className="mt-3 self-start rounded-full bg-[#242426] px-4 py-2.5"
            onPress={handleWatchAddress}
          >
            <Text className="text-[14px] font-bold text-white">
              Watch address
            </Text>
          </Pressable>

          {networkId === "testnet" ? (
            <>
              <Pressable
                accessibilityLabel="Create test wallet"
                accessibilityRole="button"
                className="mt-3 self-start rounded-full bg-[#242426] px-4 py-2.5"
                disabled={createTestWallet.isPending}
                onPress={handleCreateTestWallet}
              >
                {createTestWallet.isPending ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text className="text-[14px] font-bold text-white">
                      Creating…
                    </Text>
                  </View>
                ) : (
                  <Text className="text-[14px] font-bold text-white">
                    Create test wallet
                  </Text>
                )}
              </Pressable>
              <Text className="mt-3 text-[13px] font-semibold text-[#8E8E92]">
                Generates a throwaway watch-only account funded by Friendbot.
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
