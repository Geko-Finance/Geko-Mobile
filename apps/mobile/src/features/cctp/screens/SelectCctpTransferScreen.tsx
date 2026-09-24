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
import { useActiveNetworkId } from "@/src/features/wallet/api/wallet-queries";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";
import { CCTP_OUTBOUND_ENABLED } from "@/src/services/api/cctp";
import { cctpChainDisplayName } from "@/src/services/api/explorers";
import { LocalSigner } from "@/src/services/wallet/local-signer";

import { useRecordExternalCctpBurn, useStartStellarToRemoteTransfer } from "../api/cctp-queries";
import { InboundInstructionsPanel } from "../components/InboundInstructionsPanel";

type Direction = "send" | "receive";

const EVM_TX_HASH = /^0x[0-9a-fA-F]{64}$/;

export function SelectCctpTransferScreen() {
  const router = useRouter();
  const { session } = useSession();
  const activeAccount = useActiveAccount();
  const startSend = useStartStellarToRemoteTransfer();
  const recordReceive = useRecordExternalCctpBurn();
  const networkId = useActiveNetworkId();

  const [direction, setDirection] = useState<Direction>("receive");
  const [chain, setChain] = useState<CctpChain>(REMOTE_CCTP_CHAINS[0]);
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [burnTxHash, setBurnTxHash] = useState("");
  const [walletPin, setWalletPin] = useState("");

  const mutation = direction === "send" ? startSend : recordReceive;
  const needsPin = direction === "send" && activeAccount?.custody === "non_custodial";
  const canUseCctp = activeAccount?.custody === "non_custodial";
  const amountValid = /^\d+(\.\d{1,6})?$/.test(amount.trim()) && Number(amount) > 0;
  const formValid =
    direction === "send"
      ? amountValid &&
        /^0x[0-9a-fA-F]{40}$/.test(recipientAddress.trim()) &&
        (!needsPin || walletPin.length === 6)
      : EVM_TX_HASH.test(burnTxHash.trim());

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
          OTHER NETWORKS
        </Text>
        <Text className="mt-2 text-[28px] font-extrabold text-white">
          {direction === "send" ? "Send USDC to another network" : "Receive USDC from another network"}
        </Text>
        <Text className="mt-2 text-[13px] font-semibold text-[#8E8E92]">
          Real USDC, moved by Circle. No wrapped tokens.
        </Text>

        {CCTP_OUTBOUND_ENABLED ? (
          <View className="mt-6 flex-row gap-2 rounded-full bg-[#121214] p-1">
            {(["receive", "send"] as const).map((option) => (
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
                  {option === "send" ? "Send out" : "Bring in"}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!canUseCctp ? (
          <View className="mt-4 rounded-[16px] bg-[#2A1F12] px-4 py-3">
            <Text className="text-[13px] font-semibold text-[#F2B84B]">
              {activeAccount.name} can&apos;t do transfers between networks yet. Switch to your
              self-custody wallet to continue.
            </Text>
          </View>
        ) : null}

        <View className="mt-6 rounded-[20px] bg-[#121214] px-5 py-5">
          <Text className="text-[13px] font-semibold text-[#8E8E92]">
            {direction === "send" ? "Where should the USDC go?" : "Where is the USDC coming from?"}
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
                  {cctpChainDisplayName(option.id, networkId)}
                </Text>
              </Pressable>
            ))}
          </View>

          {direction === "send" ? (
            <>
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
              <Text className="mt-5 text-[13px] font-semibold text-[#8E8E92]">
                {`Recipient address on ${cctpChainDisplayName(chain.id, networkId)}`}
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
          ) : null}

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
        </View>

        {direction === "receive" && canUseCctp ? (
          <>
            <InboundInstructionsPanel chain={chain} stellarPublicKey={activeAccount.publicKey} />

            <View className="mt-4 rounded-[20px] bg-[#121214] px-5 py-5">
              <Text className="text-[15px] font-bold text-white">2. Paste the transaction ID</Text>
              <Text className="mt-1 text-[12px] leading-4 text-[#6E6E72]">
                {`Once your ${cctpChainDisplayName(chain.id, networkId)} wallet confirms the send, copy its transaction ID here. We'll take it from there.`}
              </Text>
              <TextInput
                className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="0x..."
                placeholderTextColor="#6E6E72"
                value={burnTxHash}
                onChangeText={setBurnTxHash}
              />
              {burnTxHash.trim().length > 0 && !EVM_TX_HASH.test(burnTxHash.trim()) ? (
                <Text className="mt-2 text-[12px] font-semibold text-[#F2B84B]">
                  A transaction ID starts with 0x followed by 64 letters and numbers.
                </Text>
              ) : null}
            </View>
          </>
        ) : null}

        {mutation.isError ? (
          <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
            Couldn&apos;t start this transfer. Please try again.
          </Text>
        ) : null}

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
                  // Filled in from Circle's confirmed message - see cctp-flow.ts#pollAttestationStep.
                  amount: "",
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
              {direction === "send" ? "Send" : "Continue"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
