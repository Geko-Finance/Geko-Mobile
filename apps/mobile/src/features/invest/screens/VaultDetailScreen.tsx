import { useLocalSearchParams } from "expo-router";
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
import { useQueryClient } from "@tanstack/react-query";

import { BackButton } from "@/src/features/shared/components/BackButton";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { Skeleton } from "@/src/features/shared/components/ui/skeleton";
import { useActiveNetworkId } from "@/src/features/wallet/api/wallet-queries";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";
import { LocalSigner } from "@/src/services/wallet/local-signer";
import { getLocalWalletErrorMessage } from "@/src/services/wallet/local-wallet-errors";

import {
  earnKeys,
  useDepositToVault,
  useVaultPosition,
  useVaults,
  useWithdrawFromVault,
} from "../api/earn-queries";

const STELLAR_ASSET_DECIMALS = 7;

type WithdrawPercentage = 25 | 50 | 75 | 100;

function parseDecimalAmountToSmallestUnit(amount: string, decimals: number): bigint {
  const trimmed = amount.trim();

  if (trimmed === "") {
    throw new Error("Amount is required.");
  }

  if (trimmed.startsWith("-")) {
    throw new Error("Amount must be positive.");
  }

  const parts = trimmed.split(".");

  if (parts.length > 2) {
    throw new Error("Invalid amount.");
  }

  const integerPart = parts[0] ?? "";
  const fractionalPart = parts[1] ?? "";

  if (!/^\d*$/.test(integerPart) || !/^\d*$/.test(fractionalPart)) {
    throw new Error("Invalid amount.");
  }

  if (integerPart === "" && fractionalPart === "") {
    throw new Error("Amount is required.");
  }

  const whole = integerPart === "" ? "0" : integerPart;
  const paddedFraction = fractionalPart.padEnd(decimals, "0").slice(0, decimals);

  return BigInt(`${whole}${paddedFraction}`);
}

function computeWithdrawShares(shares: bigint, percentage: WithdrawPercentage): bigint {
  if (percentage === 100) {
    return shares;
  }

  return (shares * BigInt(percentage)) / 100n;
}

function formatContractAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function VaultDetailScreen() {
  const { vaultId } = useLocalSearchParams<{ vaultId: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const networkId = useActiveNetworkId();
  const activeAccount = useActiveAccount();

  const vaultsQuery = useVaults(activeAccount?.publicKey);
  const positionQuery = useVaultPosition(vaultId, activeAccount?.publicKey);
  const depositMutation = useDepositToVault();
  const withdrawMutation = useWithdrawFromVault();

  const [depositAmount, setDepositAmount] = useState("");
  const [depositPin, setDepositPin] = useState("");
  const [depositParseError, setDepositParseError] = useState<string | null>(null);

  const [withdrawPin, setWithdrawPin] = useState("");
  const [selectedWithdrawPct, setSelectedWithdrawPct] = useState<WithdrawPercentage | null>(
    null
  );

  if (activeAccount === null) {
    return (
      <ScreenPlaceholder
        description="Add or create a wallet to view vault details and manage your position."
        eyebrow="Invest"
        title="Connect a wallet"
      />
    );
  }

  const isLoading = vaultsQuery.isLoading || positionQuery.isLoading;

  if (isLoading) {
    return (
      <View className="flex-1 bg-black">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-10"
          contentContainerStyle={{ paddingTop: insets.top + 16 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-2">
            <BackButton />
          </View>
          <Skeleton className="h-10 w-3/4 rounded-xl" startColor="bg-[#242426]" />
          <Skeleton className="mt-4 h-24 w-full rounded-[20px]" startColor="bg-[#242426]" />
          <Skeleton className="mt-4 h-48 w-full rounded-[20px]" startColor="bg-[#242426]" />
          <Skeleton className="mt-4 h-48 w-full rounded-[20px]" startColor="bg-[#242426]" />
        </ScrollView>
      </View>
    );
  }

  const vault = vaultsQuery.data?.find((entry) => entry.id === vaultId);

  if (vault === undefined) {
    return (
      <ScreenPlaceholder
        description="This vault isn't in the list for the active network. Return to Invest and choose another vault."
        eyebrow="Invest"
        title="Vault not found"
      />
    );
  }

  const position = positionQuery.data;
  const isSingleAsset = vault.info.assetAddresses.length === 1;
  const hasPosition = position !== undefined && position.shares > 0n;
  const isNonCustodial = activeAccount.custody === "non_custodial";

  const invalidateVaultQueries = () => {
    void queryClient.invalidateQueries({ queryKey: earnKeys.vaults(networkId) });
    void queryClient.invalidateQueries({
      queryKey: earnKeys.vaultPosition(vault.id, activeAccount.publicKey),
    });
  };

  const handleDeposit = () => {
    setDepositParseError(null);

    let parsedAmount: bigint;

    try {
      parsedAmount = parseDecimalAmountToSmallestUnit(depositAmount, STELLAR_ASSET_DECIMALS);

      if (parsedAmount === 0n) {
        throw new Error("Amount must be greater than zero.");
      }
    } catch (caught) {
      setDepositParseError(
        caught instanceof Error ? caught.message : "Invalid amount."
      );
      return;
    }

    const signer = new LocalSigner({
      publicKey: activeAccount.publicKey,
      pinProvider: async () => depositPin,
    });

    depositMutation.mutate(
      {
        input: {
          vaultAddress: vault.id,
          amountsDesired: [parsedAmount],
          amountsMin: [0n], // TODO: no slippage protection yet - must be added before mainnet/real funds
          invest: false,
        },
        signer,
      },
      {
        onSuccess: () => {
          setDepositAmount("");
          setDepositPin("");
          invalidateVaultQueries();
        },
      }
    );
  };

  const handleWithdraw = () => {
    if (position === undefined || selectedWithdrawPct === null) {
      return;
    }

    const withdrawShares = computeWithdrawShares(position.shares, selectedWithdrawPct);

    if (withdrawShares === 0n) {
      return;
    }

    const signer = new LocalSigner({
      publicKey: activeAccount.publicKey,
      pinProvider: async () => withdrawPin,
    });

    withdrawMutation.mutate(
      {
        input: {
          vaultAddress: vault.id,
          withdrawShares,
          minAmountsOut: [0n], // TODO: no slippage protection yet - must be added before mainnet/real funds
        },
        signer,
      },
      {
        onSuccess: () => {
          setWithdrawPin("");
          setSelectedWithdrawPct(null);
          invalidateVaultQueries();
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
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2">
          <BackButton />
        </View>

        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#77777B]">
          Invest
        </Text>
        <Text className="mt-2 text-[32px] font-extrabold text-white">{vault.name}</Text>
        <Text className="mt-1 text-[13px] font-semibold text-[#77777B]">
          {formatContractAddress(vault.id)}
        </Text>

        <View className="mt-6 overflow-hidden rounded-[20px] bg-[#141416] px-4 py-4">
          <Text className="text-[13px] font-semibold text-[#77777B]">Your position</Text>

          {positionQuery.isError ? (
            <Text className="mt-2 text-[15px] font-semibold text-[#77777B]">
              Unable to load position.
            </Text>
          ) : position !== undefined ? (
            <>
              <Text className="mt-2 text-[18px] font-extrabold text-white">
                {`${position.shares.toString()} shares`}
              </Text>
              {position.underlyingValue.map(({ asset, totalAmount }) => (
                <Text
                  key={asset}
                  className="mt-1 text-[13px] font-semibold text-[#77777B]"
                >
                  {`${asset} value: ${totalAmount.toString()} (smallest units)`}
                </Text>
              ))}
            </>
          ) : null}
        </View>

        {!isSingleAsset ? (
          <View className="mt-4 rounded-[16px] border border-[#303033] bg-[#1D1D1F] px-4 py-4">
            <Text className="text-[14px] font-semibold text-[#77777B]">
              Multi-asset vault deposits/withdrawals aren&apos;t supported in this UI yet
            </Text>
          </View>
        ) : (
          <>
            <View className="mt-6 rounded-[20px] bg-[#141416] p-4">
              <Text className="text-[18px] font-extrabold text-white">Deposit</Text>

              {!isNonCustodial ? (
                <Text className="mt-3 text-[14px] font-semibold text-[#77777B]">
                  Vault deposits need a self-custody wallet
                </Text>
              ) : (
                <>
                  <Text className="mt-1 text-[13px] leading-5 text-[#77777B]">
                    Enter the amount to deposit and your six-digit wallet PIN.
                  </Text>
                  <TextInput
                    className="mt-3 rounded-xl bg-[#1D1D1F] px-4 py-3 text-white"
                    keyboardType="decimal-pad"
                    placeholder="Amount"
                    placeholderTextColor="#6E6E72"
                    value={depositAmount}
                    onChangeText={(value) => {
                      setDepositAmount(value);
                      setDepositParseError(null);
                    }}
                  />
                  <TextInput
                    className="mt-3 rounded-xl bg-[#1D1D1F] px-4 py-3 text-white"
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="Wallet PIN"
                    placeholderTextColor="#6E6E72"
                    secureTextEntry
                    value={depositPin}
                    onChangeText={setDepositPin}
                  />
                  <Pressable
                    accessibilityRole="button"
                    className="mt-3 self-start rounded-full bg-[#087BFF] px-5 py-2.5"
                    disabled={
                      depositMutation.isPending ||
                      depositPin.length !== 6 ||
                      depositAmount.trim() === ""
                    }
                    onPress={() => handleDeposit()}
                  >
                    {depositMutation.isPending ? (
                      <View className="flex-row items-center gap-2">
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text className="text-[14px] font-bold text-white">Depositing…</Text>
                      </View>
                    ) : (
                      <Text className="text-[14px] font-bold text-white">Confirm deposit</Text>
                    )}
                  </Pressable>
                  {depositParseError !== null ? (
                    <Text className="mt-3 text-[13px] font-semibold text-[#F45F64]">
                      {depositParseError}
                    </Text>
                  ) : null}
                  {depositMutation.isError ? (
                    <Text className="mt-3 text-[13px] font-semibold text-[#F45F64]">
                      {getLocalWalletErrorMessage(depositMutation.error)}
                    </Text>
                  ) : null}
                  {depositMutation.isSuccess ? (
                    <Text className="mt-3 text-[13px] font-semibold text-[#5BED97]">
                      Deposit submitted successfully.
                    </Text>
                  ) : null}
                </>
              )}
            </View>

            <View className="mt-4 rounded-[20px] bg-[#141416] p-4">
              <Text className="text-[18px] font-extrabold text-white">Withdraw</Text>

              {!isNonCustodial ? (
                <Text className="mt-3 text-[14px] font-semibold text-[#77777B]">
                  Vault withdrawals need a self-custody wallet
                </Text>
              ) : !hasPosition ? (
                <Text className="mt-3 text-[14px] font-semibold text-[#77777B]">
                  No position to withdraw
                </Text>
              ) : (
                <>
                  <Text className="mt-1 text-[13px] leading-5 text-[#77777B]">
                    Choose how much of your position to withdraw, then enter your wallet PIN.
                  </Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {([25, 50, 75, 100] as const).map((pct) => {
                      const label = pct === 100 ? "Max" : `${pct}%`;
                      const isSelected = selectedWithdrawPct === pct;

                      return (
                        <Pressable
                          key={pct}
                          accessibilityRole="button"
                          className={`rounded-full px-4 py-2.5 ${
                            isSelected
                              ? "bg-[#087BFF]"
                              : "bg-[#1D1D1F] border border-[#303033]"
                          }`}
                          disabled={position.shares === 0n}
                          onPress={() => setSelectedWithdrawPct(pct)}
                        >
                          <Text
                            className={`text-[14px] font-bold ${
                              isSelected ? "text-white" : "text-[#D8D8DC]"
                            }`}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <TextInput
                    className="mt-3 rounded-xl bg-[#1D1D1F] px-4 py-3 text-white"
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="Wallet PIN"
                    placeholderTextColor="#6E6E72"
                    secureTextEntry
                    value={withdrawPin}
                    onChangeText={setWithdrawPin}
                  />
                  <Pressable
                    accessibilityRole="button"
                    className="mt-3 self-start rounded-full bg-[#087BFF] px-5 py-2.5"
                    disabled={
                      withdrawMutation.isPending ||
                      withdrawPin.length !== 6 ||
                      selectedWithdrawPct === null ||
                      position.shares === 0n
                    }
                    onPress={() => handleWithdraw()}
                  >
                    {withdrawMutation.isPending ? (
                      <View className="flex-row items-center gap-2">
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text className="text-[14px] font-bold text-white">Withdrawing…</Text>
                      </View>
                    ) : (
                      <Text className="text-[14px] font-bold text-white">Confirm withdraw</Text>
                    )}
                  </Pressable>
                  {withdrawMutation.isError ? (
                    <Text className="mt-3 text-[13px] font-semibold text-[#F45F64]">
                      {getLocalWalletErrorMessage(withdrawMutation.error)}
                    </Text>
                  ) : null}
                  {withdrawMutation.isSuccess ? (
                    <Text className="mt-3 text-[13px] font-semibold text-[#5BED97]">
                      Withdrawal submitted successfully.
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
