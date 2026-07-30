import { randomUUID } from "expo-crypto";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { REMOTE_CCTP_CHAINS, type CctpChain } from "@/src/domain/cctp";
import { useSession } from "@/src/features/auth/session/SessionProvider";
import { BackButton } from "@/src/features/shared/components/BackButton";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";
import { LocalSigner } from "@/src/services/wallet/local-signer";

import { useRecordExternalCctpBurn, useStartStellarToRemoteTransfer } from "../api/cctp-queries";

type Direction = "send" | "receive";

export function SelectCctpTransferScreen() {
  const router = useRouter();
  const { session } = useSession();
  const activeAccount = useActiveAccount();
  const startSend = useStartStellarToRemoteTransfer();
  const recordReceive = useRecordExternalCctpBurn();

  const [direction, setDirection] = useState<Direction>("send");
  const [chain, setChain] = useState<CctpChain>(REMOTE_CCTP_CHAINS[0]);
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [burnTxHash, setBurnTxHash] = useState("");
  const [walletPin, setWalletPin] = useState("");

  const mutation = direction === "send" ? startSend : recordReceive;
  const needsPin = direction === "send" && activeAccount?.custody === "non_custodial";
  const canUseCctp = activeAccount?.custody === "non_custodial";
  const amountValid = /^\d+(\.\d{1,7})?$/.test(amount.trim()) && Number(amount) > 0;
  const formValid =
    amountValid &&
    (direction === "send"
      ? /^0x[0-9a-fA-F]{40}$/.test(recipientAddress.trim())
      : burnTxHash.trim().length > 0) &&
    (!needsPin || walletPin.length === 6);

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
          OTHER CHAINS
        </Text>
        <Text className="mt-2 text-[28px] font-extrabold text-white">
          Move USDC cross-chain
        </Text>
        <Text className="mt-2 text-[13px] font-semibold text-[#8E8E92]">
          Powered by Circle&apos;s CCTP - native USDC, no wrapped assets.
        </Text>

        <View className="mt-6 flex-row gap-2 rounded-full bg-[#121214] p-1">
          {(["send", "receive"] as const).map((option) => (
            <Pressable
              key={option}
              className={`flex-1 rounded-full py-2.5 ${
                direction === option ? "bg-[#237BFF]" : ""
              }`}
              onPress={() => setDirection(option)}
            >
              <Text
                className={`text-center text-[13px] font-bold ${
                  direction === option ? "text-white" : "text-[#8E8E92]"
                }`}
              >
                {option === "send" ? "Send from Stellar" : "Receive on Stellar"}
              </Text>
            </Pressable>
          ))}
        </View>

        {!canUseCctp ? (
          <View className="mt-4 rounded-[16px] bg-[#2A1F12] px-4 py-3">
            <Text className="text-[13px] font-semibold text-[#F2B84B]">
              {activeAccount.name} can&apos;t sign Soroban transactions - switch to a
              non-custodial wallet to use cross-chain transfers.
            </Text>
          </View>
        ) : null}

        <View className="mt-6 rounded-[20px] bg-[#121214] px-5 py-5">
          <Text className="text-[13px] font-semibold text-[#8E8E92]">
            {direction === "send" ? "Destination chain" : "Source chain"}
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {REMOTE_CCTP_CHAINS.map((option) => (
              <Pressable
                key={option.id}
                className={`rounded-full px-4 py-2 ${
                  chain.id === option.id ? "bg-[#237BFF]" : "bg-[#1E1E20]"
                }`}
                onPress={() => setChain(option)}
              >
                <Text
                  className={`text-[13px] font-bold ${
                    chain.id === option.id ? "text-white" : "text-[#8E8E92]"
                  }`}
                >
                  {option.displayName}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="mt-5 text-[13px] font-semibold text-[#8E8E92]">
            Amount (USDC)
          </Text>
          <TextInput
            className="mt-2 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#6E6E72"
            value={amount}
            onChangeText={setAmount}
          />

          {direction === "send" ? (
            <>
              <Text className="mt-5 text-[13px] font-semibold text-[#8E8E92]">
                {`Recipient address on ${chain.displayName}`}
              </Text>
              <TextInput
                className="mt-2 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="0x..."
                placeholderTextColor="#6E6E72"
                value={recipientAddress}
                onChangeText={setRecipientAddress}
              />
            </>
          ) : (
            <>
              <Text className="mt-5 text-[13px] font-semibold text-[#8E8E92]">
                {`Burn transaction hash on ${chain.displayName}`}
              </Text>
              <TextInput
                className="mt-2 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="0x..."
                placeholderTextColor="#6E6E72"
                value={burnTxHash}
                onChangeText={setBurnTxHash}
              />
              <Text className="mt-2 text-[12px] leading-4 text-[#6E6E72]">
                {"Burn on the source chain first, using domain 27 and this wallet's forwarder recipient - "}
                the app then tracks attestation and mints into this account.
              </Text>
            </>
          )}

          {needsPin ? (
            <>
              <Text className="mt-5 text-[13px] font-semibold text-[#8E8E92]">
                Wallet PIN
              </Text>
              <TextInput
                className="mt-2 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
                keyboardType="number-pad"
                maxLength={6}
                placeholder="6-digit wallet PIN"
                placeholderTextColor="#6E6E72"
                secureTextEntry
                value={walletPin}
                onChangeText={setWalletPin}
              />
            </>
          ) : null}

          {mutation.isError ? (
            <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
              Couldn&apos;t start this transfer - please try again.
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          className={`mt-7 self-start rounded-full px-4 py-2.5 ${
            formValid && canUseCctp ? "bg-[#237BFF]" : "bg-[#1B3A5C]"
          }`}
          disabled={!formValid || !canUseCctp || mutation.isPending}
          onPress={() => {
            if (session === null) {
              return;
            }

            const id = randomUUID();

            if (direction === "send") {
              const signer = new LocalSigner({
                publicKey: activeAccount.publicKey,
                pinProvider: async () => walletPin,
              });

              startSend.mutate(
                {
                  id,
                  ownerUserId: session.user.id,
                  sourceChainId: "stellar",
                  destinationChainId: chain.id,
                  stellarPublicKey: activeAccount.publicKey,
                  recipientAddress: recipientAddress.trim(),
                  amount: amount.trim(),
                  signer,
                },
                { onSuccess: () => router.push({ pathname: "/cctp/status", params: { id } }) }
              );
            } else {
              recordReceive.mutate(
                {
                  id,
                  ownerUserId: session.user.id,
                  sourceChainId: chain.id,
                  stellarPublicKey: activeAccount.publicKey,
                  amount: amount.trim(),
                  burnTxHash: burnTxHash.trim(),
                },
                { onSuccess: () => router.push({ pathname: "/cctp/status", params: { id } }) }
              );
            }
          }}
        >
          {mutation.isPending ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text className="text-[14px] font-bold text-white">Starting…</Text>
            </View>
          ) : (
            <Text
              className={`text-[14px] font-bold ${
                formValid && canUseCctp ? "text-white" : "text-white/50"
              }`}
            >
              {direction === "send" ? "Start burn" : "Track transfer"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
