import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useMeQuery } from "@/src/features/auth/api/auth-queries";
import { useSession } from "@/src/features/auth/session/SessionProvider";
import {
  useRecoverWithCode,
  useViewRecoveryCode,
} from "@/src/features/profile/api/recovery-queries";
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
  const { session, signOut, status } = useSession();
  const meQuery = useMeQuery(status === "authenticated");
  const activeAccount = useActiveAccount();
  const account = activeAccount;
  const balances = useAccountBalances(activeAccount?.publicKey);
  const networkId = useActiveNetworkId();
  const fundAccount = useFundTestnetAccount();
  const viewRecoveryCode = useViewRecoveryCode();
  const recoverWithCode = useRecoverWithCode();
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");
  const [showRecoverInput, setShowRecoverInput] = useState(false);
  const [copiedRecoveryCode, setCopiedRecoveryCode] = useState(false);
  const displayName = meQuery.data?.fullName ?? session?.user.email ?? "Customer";
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

  const handleCopyRecoveryCode = async () => {
    if (revealedCode === null) {
      return;
    }

    await Clipboard.setStringAsync(revealedCode);
    setCopiedRecoveryCode(true);
    setTimeout(() => setCopiedRecoveryCode(false), 2000);
  };

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
                className="mt-3 self-start rounded-full bg-[#242426] px-4 py-2.5"
                onPress={() => router.push("/payments/add-asset")}
              >
                <Text className="text-[14px] font-bold text-white">Add asset</Text>
              </Pressable>
              {networkId === "testnet" ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    className="mt-3 self-start rounded-full bg-[#123B2B] px-4 py-2.5"
                    disabled={fundAccount.isPending}
                    onPress={() => fundAccount.mutate(account.publicKey)}
                  >
                    {fundAccount.isPending ? (
                      <View className="flex-row items-center gap-2">
                        <ActivityIndicator color="#5BED97" size="small" />
                        <Text className="text-[14px] font-bold text-[#5BED97]">
                          Funding…
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-[14px] font-bold text-[#5BED97]">
                        Fund wallet (testnet)
                      </Text>
                    )}
                  </Pressable>
                  {fundAccount.isError ? (
                    <Text className="mt-2 text-[13px] font-semibold text-[#FF6B6B]">
                      Funding failed — please try again.
                    </Text>
                  ) : fundAccount.isSuccess ? (
                    <Text className="mt-2 text-[13px] font-semibold text-[#5BED97]">
                      Funded!
                    </Text>
                  ) : null}
                </>
              ) : null}
              {account.custody === "custodial" ? (
                <View className="mt-4">
                  <Pressable
                    accessibilityRole="button"
                    className="self-start rounded-full bg-[#242426] px-4 py-2.5"
                    disabled={viewRecoveryCode.isPending}
                    onPress={() =>
                      viewRecoveryCode.mutate(account, {
                        onSuccess: (code) => setRevealedCode(code),
                      })
                    }
                  >
                    {viewRecoveryCode.isPending ? (
                      <View className="flex-row items-center gap-2">
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text className="text-[14px] font-bold text-white">
                          Loading…
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-[14px] font-bold text-white">
                        View recovery code
                      </Text>
                    )}
                  </Pressable>

                  {viewRecoveryCode.isSuccess && revealedCode === null ? (
                    <Text className="mt-2 text-[13px] font-semibold text-[#8E8E92]">
                      No recovery code on file for this account yet.
                    </Text>
                  ) : null}
                  {viewRecoveryCode.isError ? (
                    <Text className="mt-2 text-[13px] font-semibold text-[#FF6B6B]">
                      Couldn&apos;t load recovery code — please try again.
                    </Text>
                  ) : null}

                  {revealedCode !== null ? (
                    <View className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3">
                      <Text className="text-[13px] font-semibold text-[#8E8E92]">
                        Save this somewhere safe — anyone with this code can
                        approve a new device for this wallet.
                      </Text>
                      <Text
                        className="mt-2 text-[15px] font-bold text-white"
                        selectable
                      >
                        {revealedCode}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        className="mt-3 self-start rounded-full bg-[#242426] px-3 py-2"
                        onPress={handleCopyRecoveryCode}
                      >
                        <Text className="text-[13px] font-bold text-white">
                          {copiedRecoveryCode ? "Copied!" : "Copy code"}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    className="mt-3 self-start rounded-full bg-[#242426] px-4 py-2.5"
                    onPress={() => setShowRecoverInput((prev) => !prev)}
                  >
                    <Text className="text-[14px] font-bold text-white">
                      Recover with code
                    </Text>
                  </Pressable>

                  {showRecoverInput ? (
                    <View className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3">
                      <TextInput
                        className="rounded-lg bg-[#242426] px-3 py-2.5 text-[14px] font-semibold text-white"
                        placeholder="Paste your recovery code"
                        placeholderTextColor="#6E6E72"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={recoveryCodeInput}
                        onChangeText={setRecoveryCodeInput}
                      />
                      <Pressable
                        accessibilityRole="button"
                        className="mt-3 self-start rounded-full bg-[#237BFF] px-4 py-2.5"
                        disabled={
                          recoveryCodeInput.trim().length === 0 ||
                          recoverWithCode.isPending
                        }
                        onPress={() =>
                          recoverWithCode.mutate(
                            { account, code: recoveryCodeInput.trim() },
                            {
                              onSuccess: () => {
                                setShowRecoverInput(false);
                                setRecoveryCodeInput("");
                              },
                            },
                          )
                        }
                      >
                        {recoverWithCode.isPending ? (
                          <View className="flex-row items-center gap-2">
                            <ActivityIndicator color="#FFFFFF" size="small" />
                            <Text className="text-[14px] font-bold text-white">
                              Recovering…
                            </Text>
                          </View>
                        ) : (
                          <Text className="text-[14px] font-bold text-white">
                            Approve this device
                          </Text>
                        )}
                      </Pressable>
                      {recoverWithCode.isError ? (
                        <Text className="mt-2 text-[13px] font-semibold text-[#FF6B6B]">
                          That code didn&apos;t work — please check it and try
                          again.
                        </Text>
                      ) : null}
                      {recoverWithCode.isSuccess ? (
                        <Text className="mt-2 text-[13px] font-semibold text-[#5BED97]">
                          Device approved.
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
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
          className="mt-3 self-start rounded-full bg-[#242426] px-4 py-2.5"
          onPress={() => router.push("/wallet")}
        >
          <Text className="text-[14px] font-bold text-white">Manage wallets</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          className="mt-8 self-start rounded-full bg-[#242426] px-4 py-2.5"
          onPress={signOut}
        >
          <Text className="text-[14px] font-bold text-[#FF6B6B]">Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
