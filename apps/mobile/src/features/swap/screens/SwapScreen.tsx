import { ArrowDownUp, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appConfig } from '@/src/config/env';
import { decimalToStroops, type SwapQuote } from '@/src/domain/swap';
import {
  canSend,
  makeAssetId,
  NATIVE_ASSET,
  type Asset,
} from '@/src/domain/wallet';
import { BackButton } from '@/src/features/shared/components/BackButton';
import { useAccountBalances } from '@/src/features/wallet/api/wallet-queries';
import { useActiveAccount } from '@/src/features/wallet/state/wallet-store';

import {
  useExecuteSwap,
  useSwapQuotes,
  useSwapTransactionStatus,
} from '../api/swap-queries';

const SLIPPAGE_OPTIONS = [10, 50, 100] as const;

function configuredUsdc(): Asset {
  const issuer =
    appConfig.stellarNetwork === 'mainnet'
      ? appConfig.cctpUsdcIssuerMainnet
      : appConfig.cctpUsdcIssuerTestnet;

  return {
    id: makeAssetId('USDC', issuer),
    code: 'USDC',
    issuer,
    type: 'credit_alphanum4',
  };
}

function formatPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

function isPositiveAmount(value: string): boolean {
  try {
    decimalToStroops(value);
    return true;
  } catch {
    return false;
  }
}

function hasEnoughBalance(amount: string, balance: string | undefined): boolean {
  if (balance === undefined) {
    return false;
  }

  try {
    return decimalToStroops(amount) <= decimalToStroops(balance);
  } catch {
    return false;
  }
}

function AssetSelector({
  assets,
  selectedId,
  onSelect,
}: {
  assets: readonly Asset[];
  selectedId: string;
  onSelect: (assetId: string) => void;
}) {
  return (
    <View className="mt-3 flex-row flex-wrap gap-2">
      {assets.map((asset) => {
        const selected = asset.id === selectedId;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`rounded-full px-4 py-2 ${
              selected ? 'bg-[#237BFF]' : 'bg-[#242426]'
            }`}
            key={asset.id}
            onPress={() => onSelect(asset.id)}
          >
            <Text
              className={`text-[13px] font-bold ${
                selected ? 'text-white' : 'text-[#A6A6A8]'
              }`}
            >
              {asset.code}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function QuoteDetails({ quote }: { quote: SwapQuote }) {
  return (
    <View className="mt-5 rounded-[20px] bg-[#121214] px-5 py-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-[#8E8E92]">
          Best route
        </Text>
        <Text className="text-[13px] font-extrabold text-[#5BED97]">
          {quote.sourceLabel}
        </Text>
      </View>
      <View className="mt-4 flex-row items-end justify-between">
        <Text className="text-[13px] font-semibold text-[#8E8E92]">
          You receive
        </Text>
        <Text className="text-[22px] font-extrabold text-white">
          {quote.receiveAmount} {quote.destinationAsset.code}
        </Text>
      </View>
      <View className="mt-4 flex-row justify-between">
        <Text className="text-[13px] font-semibold text-[#8E8E92]">
          Minimum received
        </Text>
        <Text className="text-[13px] font-bold text-white">
          {quote.minimumReceiveAmount} {quote.destinationAsset.code}
        </Text>
      </View>
      <View className="mt-3 flex-row justify-between">
        <Text className="text-[13px] font-semibold text-[#8E8E92]">
          Price impact
        </Text>
        <Text
          className={`text-[13px] font-bold ${
            quote.priceImpactBps > 300 ? 'text-[#FFB84D]' : 'text-white'
          }`}
        >
          {formatPercent(quote.priceImpactBps)}
        </Text>
      </View>
      <View className="mt-3 flex-row justify-between">
        <Text className="text-[13px] font-semibold text-[#8E8E92]">
          Slippage tolerance
        </Text>
        <Text className="text-[13px] font-bold text-white">
          {formatPercent(quote.slippageBps)}
        </Text>
      </View>
      <View className="mt-3 flex-row justify-between">
        <Text className="text-[13px] font-semibold text-[#8E8E92]">Fee</Text>
        <Text className="text-[13px] font-bold text-white">
          {quote.feeAmount} {quote.feeAsset.code}
        </Text>
      </View>
    </View>
  );
}

export function SwapScreen() {
  const account = useActiveAccount();
  const balances = useAccountBalances(account?.publicKey);
  const quoteMutation = useSwapQuotes();
  const executeMutation = useExecuteSwap();
  const [sourceAssetId, setSourceAssetId] = useState(NATIVE_ASSET.id);
  const [destinationAssetId, setDestinationAssetId] = useState(
    configuredUsdc().id,
  );
  const [amount, setAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(50);
  const [reviewQuote, setReviewQuote] = useState<SwapQuote | null>(null);
  const [walletPin, setWalletPin] = useState('');
  const [transactionHash, setTransactionHash] = useState<string>();
  const status = useSwapTransactionStatus(transactionHash);
  const assets = useMemo(() => {
    const byId = new Map<string, Asset>();
    byId.set(NATIVE_ASSET.id, NATIVE_ASSET);
    byId.set(configuredUsdc().id, configuredUsdc());
    for (const balance of balances.data ?? []) {
      byId.set(balance.asset.id, balance.asset);
    }
    return [...byId.values()];
  }, [balances.data]);
  const sourceAsset =
    assets.find((asset) => asset.id === sourceAssetId) ?? NATIVE_ASSET;
  const destinationAsset =
    assets.find((asset) => asset.id === destinationAssetId) ?? configuredUsdc();
  const sourceBalance = balances.data?.find(
    (balance) => balance.asset.id === sourceAsset.id,
  );
  const needsPin = account?.custody === 'non_custodial';
  const amountValid = isPositiveAmount(amount);
  const destinationReady =
    destinationAsset.type === 'native' ||
    balances.data?.some(
      (balance) => balance.asset.id === destinationAsset.id,
    ) === true;
  const sufficientBalance = hasEnoughBalance(amount, sourceBalance?.amount);
  const canQuote =
    account !== null &&
    canSend(account) &&
    amountValid &&
    sufficientBalance &&
    destinationReady &&
    sourceAsset.id !== destinationAsset.id;
  const canExecute =
    reviewQuote !== null &&
    !executeMutation.isPending &&
    (!needsPin || walletPin.length === 6);

  const resetQuote = () => {
    setReviewQuote(null);
    setTransactionHash(undefined);
    quoteMutation.reset();
    executeMutation.reset();
  };

  if (account === null) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="px-6 pt-4">
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
        contentContainerClassName="px-6 pb-12 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackButton />
        <Text className="mt-5 text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          STELLAR SWAP
        </Text>
        <Text className="mt-2 text-[30px] font-extrabold text-white">
          Trade the best route
        </Text>
        <Text className="mt-2 text-[13px] font-semibold leading-5 text-[#8E8E92]">
          Quotes compare Soroswap with Stellar&apos;s native DEX and liquidity pools.
        </Text>

        {transactionHash === undefined ? (
          <>
            <View className="mt-6 rounded-[20px] bg-[#121214] px-5 py-5">
              <Text className="text-[13px] font-semibold text-[#8E8E92]">
                You pay
              </Text>
              <AssetSelector
                assets={assets}
                selectedId={sourceAsset.id}
                onSelect={(id) => {
                  setSourceAssetId(id);
                  resetQuote();
                }}
              />
              <TextInput
                className="mt-4 rounded-xl bg-[#1E1E20] px-4 py-4 text-[22px] font-extrabold text-white"
                keyboardType="decimal-pad"
                onChangeText={(value) => {
                  setAmount(value);
                  resetQuote();
                }}
                placeholder="0.00"
                placeholderTextColor="#5F5F63"
                value={amount}
              />
              <Text className="mt-2 text-[12px] font-semibold text-[#6E6E72]">
                Balance {sourceBalance?.amount ?? '0'} {sourceAsset.code}
              </Text>

              <Pressable
                accessibilityLabel="Reverse swap assets"
                accessibilityRole="button"
                className="my-4 h-10 w-10 items-center justify-center self-center rounded-full bg-[#242426]"
                onPress={() => {
                  setSourceAssetId(destinationAsset.id);
                  setDestinationAssetId(sourceAsset.id);
                  resetQuote();
                }}
              >
                <ArrowDownUp color="#FFFFFF" size={18} />
              </Pressable>

              <Text className="text-[13px] font-semibold text-[#8E8E92]">
                You receive
              </Text>
              <AssetSelector
                assets={assets}
                selectedId={destinationAsset.id}
                onSelect={(id) => {
                  setDestinationAssetId(id);
                  resetQuote();
                }}
              />
              {!destinationReady ? (
                <Text className="mt-3 text-[12px] font-semibold leading-4 text-[#FFB84D]">
                  Add a trustline for {destinationAsset.code} before swapping into it.
                </Text>
              ) : null}
            </View>

            {amountValid && !sufficientBalance ? (
              <Text className="mt-4 text-[13px] font-semibold text-[#FF6B6B]">
                The swap amount exceeds your available balance.
              </Text>
            ) : null}

            <Text className="mt-6 text-[13px] font-semibold text-[#8E8E92]">
              Slippage tolerance
            </Text>
            <View className="mt-3 flex-row gap-2">
              {SLIPPAGE_OPTIONS.map((option) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: slippageBps === option }}
                  className={`rounded-full px-4 py-2 ${
                    slippageBps === option ? 'bg-[#237BFF]' : 'bg-[#242426]'
                  }`}
                  key={option}
                  onPress={() => {
                    setSlippageBps(option);
                    resetQuote();
                  }}
                >
                  <Text className="text-[13px] font-bold text-white">
                    {formatPercent(option)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {quoteMutation.isError ? (
              <Text className="mt-4 text-[13px] font-semibold text-[#FF6B6B]">
                {quoteMutation.error.message}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              className={`mt-7 rounded-full px-5 py-3 ${
                canQuote ? 'bg-[#237BFF]' : 'bg-[#1B3A5C]'
              }`}
              disabled={!canQuote || quoteMutation.isPending}
              onPress={() =>
                quoteMutation.mutate(
                  {
                    sourceAsset,
                    destinationAsset,
                    sendAmount: amount.trim(),
                    slippageBps,
                  },
                  { onSuccess: ({ best }) => setReviewQuote(best) },
                )
              }
            >
              {quoteMutation.isPending ? (
                <View className="flex-row items-center justify-center gap-2">
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text className="text-[15px] font-bold text-white">
                    Comparing routes…
                  </Text>
                </View>
              ) : (
                <Text className="text-center text-[15px] font-bold text-white">
                  Review best quote
                </Text>
              )}
            </Pressable>

            {reviewQuote !== null ? (
              <>
                <QuoteDetails quote={reviewQuote} />
                {(quoteMutation.data?.unavailableSources.length ?? 0) > 0 ? (
                  <Text className="mt-3 text-[12px] leading-4 text-[#8E8E92]">
                    Some sources were unavailable; this is the best live route returned.
                  </Text>
                ) : null}
                {needsPin ? (
                  <View className="mt-5 rounded-[20px] bg-[#121214] px-5 py-5">
                    <Text className="text-[13px] font-semibold text-[#8E8E92]">
                      Wallet PIN
                    </Text>
                    <TextInput
                      className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
                      keyboardType="number-pad"
                      maxLength={6}
                      onChangeText={setWalletPin}
                      placeholder="6-digit wallet PIN"
                      placeholderTextColor="#6E6E72"
                      secureTextEntry
                      value={walletPin}
                    />
                  </View>
                ) : null}

                {executeMutation.isError ? (
                  <Text className="mt-4 text-[13px] font-semibold text-[#FF6B6B]">
                    {executeMutation.error.message}
                  </Text>
                ) : null}

                <View className="mt-6 flex-row gap-3">
                  <Pressable
                    accessibilityRole="button"
                    className="flex-1 rounded-full bg-[#242426] px-5 py-3"
                    onPress={resetQuote}
                  >
                    <Text className="text-center text-[15px] font-bold text-white">
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    className={`flex-1 rounded-full px-5 py-3 ${
                      canExecute ? 'bg-[#237BFF]' : 'bg-[#1B3A5C]'
                    }`}
                    disabled={!canExecute}
                    onPress={() =>
                      executeMutation.mutate(
                        {
                          account,
                          quote: reviewQuote,
                          ...(needsPin
                            ? { pinProvider: async () => walletPin }
                            : {}),
                        },
                        {
                          onSuccess: ({ hash }) => setTransactionHash(hash),
                        },
                      )
                    }
                  >
                    {executeMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text className="text-center text-[15px] font-bold text-white">
                        Confirm swap
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : null}
          </>
        ) : (
          <View className="mt-8 items-center rounded-[24px] bg-[#121214] px-6 py-8">
            {status.data === 'confirmed' ? (
              <CheckCircle2 color="#5BED97" size={48} />
            ) : (
              <RefreshCw color="#5AA2FF" size={48} />
            )}
            <Text className="mt-5 text-[24px] font-extrabold text-white">
              {status.data === 'confirmed'
                ? 'Swap confirmed'
                : status.data === 'failed'
                  ? 'Swap failed'
                  : 'Swap submitted'}
            </Text>
            <Text className="mt-3 text-[13px] font-semibold text-[#8E8E92]">
              {shortHash(transactionHash)}
            </Text>
            {status.data === 'pending' || status.isLoading ? (
              <View className="mt-5 flex-row items-center gap-2">
                <ActivityIndicator color="#5AA2FF" size="small" />
                <Text className="text-[13px] font-semibold text-[#8E8E92]">
                  Waiting for Stellar confirmation…
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
