import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  canAutoCompleteMint,
  nextStep,
  type CctpTransfer,
  type CctpTransferStep,
} from "@/src/domain/cctp";
import { BackButton } from "@/src/features/shared/components/BackButton";
import { useCctpTransfer } from "@/src/features/cctp/state/transfer-store";
import { useAccountBalances, useActiveNetworkId } from "@/src/features/wallet/api/wallet-queries";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";
import { usdcIssuer } from "@/src/services/api/cctp";
import { cctpChainDisplayName, cctpChainTxUrl } from "@/src/services/api/explorers";
import { LocalSigner } from "@/src/services/wallet/local-signer";

import {
  useCctpAttestationPolling,
  useCompleteCctpMint,
  useResumeSingleCctpTransfer,
} from "../api/cctp-queries";
import { hasUsdcTrustline } from "../api/inbound-instructions";

type ChainName = (chainId: CctpTransfer["sourceChainId"]) => string;

function stepLabels(transfer: CctpTransfer, chainName: ChainName): Record<CctpTransferStep, string> {
  const source = chainName(transfer.sourceChainId);
  const destination = chainName(transfer.destinationChainId);

  return {
    burn: `Sent from ${source}`,
    attestation: "Circle is confirming",
    mint:
      transfer.direction === "remote_to_stellar"
        ? "Arriving in your wallet"
        : `Ready to claim on ${destination}`,
  };
}

const STEPS: readonly CctpTransferStep[] = ["burn", "attestation", "mint"];

function stepState(
  step: CctpTransferStep,
  current: CctpTransferStep | "done" | "verify_burn"
): "done" | "active" | "pending" {
  const order: (CctpTransferStep | "done")[] = ["burn", "attestation", "mint", "done"];
  const currentIndex = order.indexOf(current === "verify_burn" ? "burn" : current);
  const stepIndex = order.indexOf(step);

  if (stepIndex < currentIndex) {
    return "done";
  }

  if (stepIndex === currentIndex) {
    return "active";
  }

  return "pending";
}

function statusLabel(transfer: CctpTransfer, chainName: ChainName): string {
  switch (transfer.status) {
    case "initiated":
    case "burning":
      return "Sending…";
    case "burned":
    case "attesting":
      return "Circle is confirming the transfer. This usually takes a few minutes.";
    case "attested":
      return transfer.direction === "remote_to_stellar"
        ? "Confirmed. Add it to your wallet to finish."
        : `Confirmed. Open a ${chainName(transfer.destinationChainId)} wallet to claim it.`;
    case "minting":
      return "Adding to your wallet…";
    case "minted":
      return "Done. The USDC is in your wallet.";
    case "failed":
      return "Something went wrong";
  }
}

/** Plain-language reason for a failed step; raw technical errors never reach the screen. */
function failureMessage(transfer: CctpTransfer): string {
  if (transfer.failureReason === "This transfer isn't headed to this wallet.") {
    return "Circle confirmed this transfer for a different wallet, so it can't be added here. Check the transaction ID.";
  }

  switch (transfer.failedStep) {
    case "attestation":
      return "Circle couldn't confirm this transfer yet. Tap Retry to check again.";
    case "mint":
      return "We couldn't add the USDC to your wallet. Enter your PIN and try again.";
    default:
      return "The send didn't go through. Check your wallet activity before trying again.";
  }
}

function shortHash(hash: string): string {
  return hash.length > 20 ? `${hash.slice(0, 10)}…${hash.slice(-8)}` : hash;
}

export function CctpTransferStatusScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transfer = useCctpTransfer(id);
  const activeAccount = useActiveAccount();
  const networkId = useActiveNetworkId();
  const balances = useAccountBalances(transfer?.stellarPublicKey);
  const attestationQuery = useCctpAttestationPolling(transfer);
  const completeMint = useCompleteCctpMint();
  const resume = useResumeSingleCctpTransfer();
  const [walletPin, setWalletPin] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  if (transfer === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="mb-2 px-6 pt-4">
          <BackButton />
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white">This transfer could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const chainName: ChainName = (chainId) => cctpChainDisplayName(chainId, networkId);
  const sourceName = chainName(transfer.sourceChainId);
  const destinationName = chainName(transfer.destinationChainId);
  const step = nextStep(transfer);
  const labels = stepLabels(transfer, chainName);
  const autoMintable = canAutoCompleteMint(transfer.direction);
  const needsVerification = step === "verify_burn";
  const awaitingExternalMint = !autoMintable && transfer.status === "attested";
  const canSign = activeAccount?.custody === "non_custodial";
  const mintFailed = transfer.status === "failed" && transfer.failedStep === "mint";
  const showMintForm = autoMintable && canSign && (transfer.status === "attested" || mintFailed);
  const missingTrustline =
    autoMintable && balances.data !== undefined && !hasUsdcTrustline(balances.data, networkId);
  const canRetryAttestation = transfer.status === "failed" && transfer.failedStep === "attestation";
  const mintBusy = completeMint.isPending || resume.isPending;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2">
          <BackButton />
        </View>
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          {`${sourceName} → ${destinationName}`}
        </Text>
        <Text className="mt-2 text-[28px] font-extrabold text-white">
          {transfer.amount === "" ? "USDC" : `${transfer.amount} USDC`}
        </Text>
        {transfer.amount === "" ? (
          <Text className="mt-1 text-[12px] font-semibold text-[#6E6E72]">
            The amount shows up once Circle confirms.
          </Text>
        ) : null}
        <Text className="mt-2 text-[14px] font-semibold text-[#8E8E92]">{statusLabel(transfer, chainName)}</Text>

        <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214]">
          {STEPS.map((entry, index) => {
            const state = awaitingExternalMint && entry === "mint" ? "done" : stepState(entry, step);

            return (
              <View
                key={entry}
                className={`flex-row items-center px-4 py-4 ${
                  index < STEPS.length - 1 ? "border-b border-[#1E1E20]" : ""
                }`}
              >
                <View
                  className={`h-8 w-8 items-center justify-center rounded-full ${
                    state === "done"
                      ? "bg-[#123B2B]"
                      : state === "active"
                        ? "bg-[#123A5C]"
                        : "bg-[#1E1E20]"
                  }`}
                >
                  {state === "active" && transfer.status !== "failed" && transfer.status !== "attested" ? (
                    <ActivityIndicator color="#237BFF" size="small" />
                  ) : (
                    <Text
                      className={`text-[12px] font-bold ${
                        state === "done" ? "text-[#5BED97]" : "text-[#8E8E92]"
                      }`}
                    >
                      {state === "done" ? "✓" : index + 1}
                    </Text>
                  )}
                </View>
                <Text className="ml-3 text-[15px] font-bold text-white">{labels[entry]}</Text>
              </View>
            );
          })}
        </View>

        {transfer.burnTxHash !== undefined ? (
          <View className="mt-4 flex-row items-center justify-between rounded-[16px] bg-[#121214] px-4 py-3">
            <View>
              <Text className="text-[12px] font-bold uppercase tracking-wide text-[#8E8E92]">
                Transaction ID
              </Text>
              <Text className="mt-1 text-[13px] font-semibold text-white">
                {shortHash(transfer.burnTxHash)}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                className="rounded-full bg-[#1E1E20] px-3 py-1"
                onPress={() => Clipboard.setStringAsync(transfer.burnTxHash ?? "")}
              >
                <Text className="text-[12px] font-bold text-[#237BFF]">Copy</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                className="rounded-full bg-[#1E1E20] px-3 py-1"
                onPress={() =>
                  WebBrowser.openBrowserAsync(
                    cctpChainTxUrl(transfer.sourceChainId, networkId, transfer.burnTxHash ?? "")
                  )
                }
              >
                <Text className="text-[12px] font-bold text-[#237BFF]">View</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {needsVerification ? (
          <View className="mt-4 rounded-[16px] bg-[#2A1F12] px-4 py-3">
            <Text className="text-[13px] font-semibold text-[#F2B84B]">
              We lost track of this transfer while sending. Check your wallet activity before
              trying again so you don&apos;t send twice.
            </Text>
          </View>
        ) : null}

        {transfer.status === "failed" ? (
          <View className="mt-4 rounded-[16px] bg-[#3A1414] px-4 py-3">
            <Text className="text-[13px] font-semibold text-[#FF6B6B]">{failureMessage(transfer)}</Text>
          </View>
        ) : null}

        {awaitingExternalMint ? (
          <View className="mt-4 rounded-[16px] bg-[#121214] px-4 py-3">
            <Text className="text-[13px] font-semibold text-[#8E8E92]">
              {`To finish, claim the USDC from a wallet on ${destinationName} using Circle's transfer details.`}
            </Text>
            <Pressable className="mt-2" onPress={() => setShowDetails((value) => !value)}>
              <Text className="text-[13px] font-bold text-[#237BFF]">
                {showDetails ? "Hide technical details" : "Show technical details"}
              </Text>
            </Pressable>
            {showDetails ? (
              <>
                <Text className="mt-2 text-[11px] font-semibold text-[#5BED97]" numberOfLines={2}>
                  {transfer.messageBytes}
                </Text>
                <Text className="mt-1 text-[11px] font-semibold text-[#5BED97]" numberOfLines={2}>
                  {transfer.attestation}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}

        {showMintForm && missingTrustline ? (
          <Pressable
            accessibilityRole="button"
            className="mt-4 rounded-[16px] bg-[#2A1F12] px-4 py-3"
            onPress={() =>
              router.push({
                pathname: "/payments/add-asset",
                params: { code: "USDC", issuer: usdcIssuer(networkId) },
              })
            }
          >
            <Text className="text-[13px] font-semibold text-[#F2B84B]">
              This wallet can&apos;t hold USDC yet. Tap here to add USDC, then come back to finish.
            </Text>
          </Pressable>
        ) : null}

        {showMintForm && activeAccount !== null ? (
          <View className="mt-6 rounded-[20px] bg-[#121214] px-5 py-5">
            <Text className="text-[13px] font-semibold text-[#8E8E92]">Wallet PIN</Text>
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
            <Pressable
              accessibilityRole="button"
              className={`mt-4 self-start rounded-full px-4 py-2.5 ${
                walletPin.length === 6 && !missingTrustline ? "bg-[#237BFF]" : "bg-[#1B3A5C]"
              }`}
              disabled={walletPin.length !== 6 || missingTrustline || mintBusy}
              onPress={() => {
                const signer = new LocalSigner({
                  publicKey: activeAccount.publicKey,
                  pinProvider: async () => walletPin,
                });

                if (mintFailed) {
                  resume.mutate({ transferId: transfer.id, signer });
                } else {
                  completeMint.mutate({ transferId: transfer.id, signer });
                }
              }}
            >
              {mintBusy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-[14px] font-bold text-white">
                  {mintFailed ? "Try again" : "Add to my wallet"}
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {transfer.status === "minted" ? (
          <View className="mt-6 items-center">
            <View className="rounded-full bg-[#123B2B] px-4 py-2">
              <Text className="text-[13px] font-bold text-[#5BED97]">Transfer complete</Text>
            </View>
            {transfer.mintTxHash !== undefined ? (
              <Pressable
                accessibilityRole="link"
                className="mt-4"
                onPress={() =>
                  WebBrowser.openBrowserAsync(
                    cctpChainTxUrl(transfer.destinationChainId, networkId, transfer.mintTxHash ?? "")
                  )
                }
              >
                <Text className="text-[13px] font-bold text-[#237BFF]">View on Stellar Expert</Text>
              </Pressable>
            ) : null}
            <Pressable
              className="mt-6 rounded-full bg-[#242426] px-6 py-3"
              onPress={() => router.replace("/home")}
            >
              <Text className="text-[14px] font-bold text-white">Done</Text>
            </Pressable>
          </View>
        ) : null}

        {canRetryAttestation && activeAccount !== null ? (
          <Pressable
            className="mt-4 self-start rounded-full bg-[#242426] px-4 py-2.5"
            disabled={resume.isPending}
            onPress={() =>
              resume.mutate({
                transferId: transfer.id,
                // Checking Circle again signs nothing; the signer is only required by the resume API.
                signer: new LocalSigner({
                  publicKey: activeAccount.publicKey,
                  pinProvider: async () => walletPin,
                }),
              })
            }
          >
            {resume.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-[14px] font-bold text-white">Retry</Text>
            )}
          </Pressable>
        ) : null}

        {attestationQuery.isError ? (
          <Text className="mt-3 text-[13px] font-semibold text-[#8E8E92]">
            Circle hasn&apos;t confirmed yet. We&apos;ll keep checking.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
