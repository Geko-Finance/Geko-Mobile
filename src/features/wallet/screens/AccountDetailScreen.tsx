import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Account,
  Asset,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-base";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isNativeAsset } from "@/src/domain/wallet";
import type { StellarNetworkId, WalletCustody } from "@/src/domain/wallet";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { Skeleton } from "@/src/features/shared/components/ui/skeleton";
import {
  isAccountNotFoundError,
  useAccountBalances,
  useActiveNetworkId,
} from "@/src/features/wallet/api/wallet-queries";
import {
  useWalletAccount,
  useWalletAccounts,
  useWalletStore,
} from "@/src/features/wallet/state/wallet-store";
import { appConfig } from "@/src/config/env";
import { getActiveStellarNetwork } from "@/src/services/api/stellar/stellar-config";
import { LocalSigner } from "@/src/services/wallet/local-signer";
import { getLocalWalletErrorMessage } from "@/src/services/wallet/local-wallet-errors";
import {
  revealLocalWalletRecovery,
  type RevealedRecovery,
} from "@/src/services/wallet/local-wallet-service";

function formatPublicKey(publicKey: string): string {
  return `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;
}

function trimTrailingZeros(amount: string): string {
  if (!amount.includes(".")) {
    return amount;
  }

  const trimmed = amount.replace(/\.?0+$/, "");

  return trimmed === "" || trimmed === "." ? "0" : trimmed;
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

function formatNetworkLabel(networkId: StellarNetworkId): string {
  return networkId === "testnet" ? "Testnet" : "Mainnet";
}

export function AccountDetailScreen() {
  const { accountId, funding } = useLocalSearchParams<{
    accountId: string;
    funding?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const account = useWalletAccount(accountId);
  const accounts = useWalletAccounts();
  const setActiveAccount = useWalletStore((state) => state.setActiveAccount);
  const networkId = useActiveNetworkId();
  const [walletPin, setWalletPin] = useState("");
  const [recovery, setRecovery] = useState<RevealedRecovery | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityStatus, setSecurityStatus] = useState<string | null>(null);
  const [isSecurityWorking, setIsSecurityWorking] = useState(false);
  const {
    data: balances,
    error,
    isError,
    isLoading,
    refetch,
  } = useAccountBalances(account?.publicKey);

  if (account === undefined) {
    return (
      <ScreenPlaceholder
        description="This account is not in your wallet. Return to the wallet list or choose another account."
        eyebrow="Wallet"
        title="Account not found"
      />
    );
  }

  const networkLabel = formatNetworkLabel(networkId);

  const revealRecovery = async () => {
    setSecurityError(null);
    setSecurityStatus(null);
    setIsSecurityWorking(true);
    try {
      const revealed = await revealLocalWalletRecovery(
        account.publicKey,
        walletPin
      );
      setRecovery(revealed);
      setWalletPin("");
    } catch (caught) {
      setSecurityError(getLocalWalletErrorMessage(caught));
    } finally {
      setIsSecurityWorking(false);
    }
  };

  const verifySigning = async () => {
    setSecurityError(null);
    setSecurityStatus(null);
    setIsSecurityWorking(true);
    try {
      const network = getActiveStellarNetwork();
      const transaction = new TransactionBuilder(
        new Account(account.publicKey, "0"),
        {
          fee: "100",
          networkPassphrase: network.networkPassphrase,
        }
      )
        .addOperation(
          Operation.payment({
            amount: "0.0000001",
            asset: Asset.native(),
            destination: account.publicKey,
          })
        )
        .setTimeout(30)
        .build();
      const signer = new LocalSigner({
        pinProvider: async () => walletPin,
        publicKey: account.publicKey,
      });
      const signedXdr = await signer.signTransaction(transaction.toXDR(), {
        networkPassphrase: network.networkPassphrase,
      });
      const signed = TransactionBuilder.fromXDR(
        signedXdr,
        network.networkPassphrase
      );

      const signature = signed.signatures[0]?.signature();
      if (
        signature === undefined ||
        !Keypair.fromPublicKey(account.publicKey).verify(
          signed.hash(),
          signature
        )
      ) {
        throw new Error("Signature verification failed.");
      }

      setWalletPin("");
      setSecurityStatus("Offline signing check passed. Nothing was submitted.");
    } catch (caught) {
      setSecurityError(getLocalWalletErrorMessage(caught));
    } finally {
      setIsSecurityWorking(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          Wallet
        </Text>

        <Text className="mt-2 text-[32px] font-extrabold text-white">
          {account.name}
        </Text>

        <View className="mt-3 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-[#242426] px-3 py-1.5">
            <Text className="text-[12px] font-bold text-[#D8D8DC]">
              {formatCustodyLabel(account.custody)}
            </Text>
          </View>
          <View className="rounded-full bg-[#123B2B] px-3 py-1.5">
            <Text className="text-[12px] font-bold text-[#5BED97]">
              {networkLabel}
            </Text>
          </View>
        </View>

        <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
          <Text className="text-[13px] font-semibold text-[#8E8E92]">
            Public key
          </Text>
          <Text className="mt-1 text-[15px] font-semibold text-white">
            {formatPublicKey(account.publicKey)}
          </Text>
        </View>

        {funding === "failed" ? (
          <View className="mt-4 rounded-[16px] border border-[#6E5520] bg-[#2B2312] px-4 py-4">
            <Text className="text-[14px] font-semibold text-[#FFCC66]">
              Your wallet is safely stored, but Friendbot could not fund it. You can retry by funding this public key later.
            </Text>
          </View>
        ) : null}

        {account.custody === "non_custodial" ? (
          <View className="mt-4 rounded-[20px] bg-[#121214] p-4">
            <Text className="text-[18px] font-extrabold text-white">Wallet security</Text>
            <Text className="mt-1 text-[13px] leading-5 text-[#8E8E92]">
              Enter your six-digit wallet PIN. Biometrics are required after you choose a protected action.
            </Text>
            <TextInput
              className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-white"
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Wallet PIN"
              placeholderTextColor="#6E6E72"
              secureTextEntry
              value={walletPin}
              onChangeText={setWalletPin}
            />
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Pressable
                accessibilityRole="button"
                className="rounded-full bg-[#242426] px-4 py-2.5"
                disabled={isSecurityWorking || walletPin.length !== 6}
                onPress={() => void revealRecovery()}
              >
                <Text className="text-[14px] font-bold text-white">Reveal recovery</Text>
              </Pressable>
              {appConfig.environment === "development" ? (
                <Pressable
                  accessibilityRole="button"
                  className="rounded-full bg-[#242426] px-4 py-2.5"
                  disabled={isSecurityWorking || walletPin.length !== 6}
                  onPress={() => void verifySigning()}
                >
                  <Text className="text-[14px] font-bold text-white">Test signing</Text>
                </Pressable>
              ) : null}
              {isSecurityWorking ? <ActivityIndicator color="#FFFFFF" /> : null}
            </View>
            {recovery !== null ? (
              <View className="mt-4 rounded-xl border border-[#6E5520] bg-[#2B2312] p-3">
                <Text className="text-[12px] font-bold uppercase text-[#FFCC66]">
                  {recovery.kind === "mnemonic" ? "Recovery phrase" : "Secret key"}
                </Text>
                <Text selectable className="mt-2 text-[15px] leading-6 text-white">
                  {recovery.value}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  className="mt-3 self-start"
                  onPress={() => setRecovery(null)}
                >
                  <Text className="font-bold text-[#FFCC66]">Hide</Text>
                </Pressable>
              </View>
            ) : null}
            {securityStatus !== null ? (
              <Text className="mt-3 text-[13px] font-semibold text-[#5BED97]">
                {securityStatus}
              </Text>
            ) : null}
            {securityError !== null ? (
              <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
                {securityError}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text className="mb-3 mt-6 text-[15px] font-bold text-[#8E8E92]">
          Accounts
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          {accounts.map((entry) => {
            const isActive = entry.id === accountId;

            return (
              <Pressable
                key={entry.id}
                accessibilityLabel={`Switch to ${entry.name}, ${formatPublicKey(entry.publicKey)}`}
                accessibilityRole="button"
                className={`rounded-full px-3 py-2 ${
                  isActive
                    ? "bg-[#242426] border border-[#5BED97]"
                    : "border border-[#303033]"
                }`}
                onPress={() => {
                  setActiveAccount(entry.id);
                  router.setParams({ accountId: entry.id });
                }}
              >
                <Text
                  className={`text-[13px] font-bold ${
                    isActive ? "text-[#D8D8DC]" : "text-[#8E8E92]"
                  }`}
                >
                  {entry.name}
                </Text>
                <Text className="mt-0.5 text-[11px] font-semibold text-[#8E8E92]">
                  {formatPublicKey(entry.publicKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text className="mb-3 mt-6 text-[20px] font-extrabold text-white">
          Balances
        </Text>

        {isLoading ? (
          <View className="overflow-hidden rounded-[20px] bg-[#121214] p-4">
            <Skeleton
              className="mb-3 h-14 w-full rounded-xl"
              startColor="bg-[#242426]"
            />
            <Skeleton
              className="mb-3 h-14 w-full rounded-xl"
              startColor="bg-[#242426]"
            />
            <Skeleton className="h-14 w-full rounded-xl" startColor="bg-[#242426]" />
          </View>
        ) : null}

        {!isLoading && isError && isAccountNotFoundError(error) ? (
          <View className="overflow-hidden rounded-[20px] bg-[#121214] px-4 py-5">
            <Text className="text-[15px] font-semibold text-[#D8D8DC]">
              {`This account isn't funded on ${networkLabel} yet.`}
            </Text>
          </View>
        ) : null}

        {!isLoading && isError && !isAccountNotFoundError(error) ? (
          <View className="overflow-hidden rounded-[20px] bg-[#121214] px-4 py-5">
            <Text className="text-[15px] font-semibold text-[#D8D8DC]">
              Unable to load balances. Check your connection and try again.
            </Text>
            <Pressable
              accessibilityLabel="Try again"
              accessibilityRole="button"
              className="mt-4 self-start rounded-full bg-[#242426] px-4 py-2"
              onPress={() => {
                void refetch();
              }}
            >
              <Text className="text-[14px] font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !isError && balances !== undefined && balances.length === 0 ? (
          <Text className="text-[15px] font-semibold text-[#8E8E92]">
            No balances
          </Text>
        ) : null}

        {!isLoading && !isError && balances !== undefined && balances.length > 0 ? (
          <View className="overflow-hidden rounded-[20px] bg-[#121214]">
            {balances.map((balance) => (
              <View
                key={balance.asset.id}
                className="flex-row items-center justify-between border-b border-[#1E1E20] px-4 py-4 last:border-b-0"
              >
                <View className="flex-1 pr-4">
                  <Text className="text-[16px] font-bold text-white">
                    {balance.asset.code}
                  </Text>
                  {!isNativeAsset(balance.asset) && balance.asset.issuer !== undefined ? (
                    <Text className="mt-0.5 text-[12px] font-semibold text-[#8E8E92]">
                      {formatPublicKey(balance.asset.issuer)}
                    </Text>
                  ) : null}
                </View>
                <Text className="text-[16px] font-semibold text-white">
                  {trimTrailingZeros(balance.amount)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
