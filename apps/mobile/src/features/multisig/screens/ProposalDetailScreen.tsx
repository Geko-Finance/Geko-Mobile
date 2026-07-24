import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";

import { BackButton } from "@/src/features/shared/components/BackButton";
import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { useWalletAccount, useWalletAccounts } from "@/src/features/wallet/state/wallet-store";
import { buildSep7TxUri } from "@/src/services/sep7/sep7-uri";
import { collectedWeight, requiredThreshold } from "@/src/services/multisig/threshold-math";

import { useMultisigAccount } from "../api/multisig-queries";
import { signProposal, submitProposal } from "../api/propose-flow";
import { useProposal } from "../state/proposal-store";
import { useSession } from "@/src/features/auth/session/SessionProvider";

function formatPublicKey(publicKey: string): string {
  return `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;
}

export function ProposalDetailScreen() {
  const { id, accountId } = useLocalSearchParams<{ id: string; accountId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const account = useWalletAccount(accountId);
  const localAccounts = useWalletAccounts();
  const multisig = useMultisigAccount(account?.publicKey);
  const proposal = useProposal(id);

  const [selectedSignerKey, setSelectedSignerKey] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signedKeys = useMemo(
    () => new Set(proposal?.signatures.map((signature) => signature.signerKey) ?? []),
    [proposal],
  );

  const availableSignerKeys = useMemo(() => {
    if (multisig.data === undefined) {
      return [];
    }
    const remaining = multisig.data.signers
      .filter((signer) => !signedKeys.has(signer.key))
      .map((signer) => signer.key);
    const localKeys = new Set(
      localAccounts
        .filter((entry) => entry.custody === "non_custodial")
        .map((entry) => entry.publicKey),
    );
    return remaining.filter((key) => localKeys.has(key));
  }, [multisig.data, signedKeys, localAccounts]);

  if (account === undefined || account.custody !== "non_custodial") {
    return (
      <ScreenPlaceholder
        description="Multisig is only available for self-custody wallets on this device."
        eyebrow="Multisig"
        title="Not available"
      />
    );
  }

  if (proposal === undefined) {
    return (
      <ScreenPlaceholder
        description="This proposal is no longer available on this device."
        eyebrow="Multisig"
        title="Proposal not found"
      />
    );
  }

  const collected =
    multisig.data === undefined
      ? undefined
      : collectedWeight(multisig.data.signers, Array.from(signedKeys));
  const required =
    multisig.data === undefined
      ? undefined
      : requiredThreshold(multisig.data.thresholds, proposal.thresholdCategory);
  const shareUri = buildSep7TxUri({
    xdr: proposal.envelopeXdr,
    networkPassphrase: proposal.networkPassphrase,
  });
  const signerToUse = selectedSignerKey ?? availableSignerKeys[0] ?? null;

  const handleSign = async () => {
    if (
      signerToUse === null ||
      pin.length !== 6 ||
      multisig.data === undefined ||
      session === null
    ) {
      return;
    }

    setError(null);
    setIsWorking(true);
    try {
      await signProposal({
        account: multisig.data,
        envelopeXdr: proposal.envelopeXdr,
        operationKind: proposal.operationKind,
        networkPassphrase: proposal.networkPassphrase,
        ownerUserId: session.user.id,
        signerPublicKey: signerToUse,
        pinProvider: async () => pin,
      });
      setPin("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to sign.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleSubmit = async () => {
    if (multisig.data === undefined) {
      return;
    }

    setError(null);
    setIsWorking(true);
    try {
      await submitProposal({ account: multisig.data, proposal });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to submit.");
    } finally {
      setIsWorking(false);
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
        <View className="mb-2">
          <BackButton />
        </View>
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          Multisig
        </Text>
        <Text className="mt-2 text-[28px] font-extrabold text-white">
          {proposal.operationKind === "payment" ? "Payment proposal" : "Signer change proposal"}
        </Text>

        <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
          <Text className="text-[13px] font-semibold text-[#8E8E92]">Progress</Text>
          <Text className="mt-1 text-[18px] font-extrabold text-white">
            {collected !== undefined && required !== undefined
              ? `${collected} of ${required} weight`
              : "Loading…"}
          </Text>
          <View className="mt-3">
            {multisig.data?.signers.map((signer) => (
              <View key={signer.key} className="flex-row items-center justify-between py-1.5">
                <Text className="text-[14px] font-semibold text-[#D8D8DC]">
                  {formatPublicKey(signer.key)}
                </Text>
                <Text
                  className="text-[13px] font-bold"
                  style={{ color: signedKeys.has(signer.key) ? "#5BED97" : "#8E8E92" }}
                >
                  {signedKeys.has(signer.key) ? "Signed" : "Waiting"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {proposal.status === "submitted" ? (
          <View className="mt-4 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
            <Text className="text-[15px] font-bold text-[#5BED97]">Submitted</Text>
            {proposal.submittedHash !== undefined ? (
              <Text selectable className="mt-2 text-[13px] font-semibold text-[#8E8E92]">
                {proposal.submittedHash}
              </Text>
            ) : null}
          </View>
        ) : null}

        {proposal.status === "ready" ? (
          <View className="mt-4 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
            <Text className="text-[15px] font-bold text-[#FFCC66]">
              Threshold met - ready to submit
            </Text>
            <Pressable
              accessibilityRole="button"
              className="mt-4 self-start rounded-full bg-[#237BFF] px-4 py-2.5"
              disabled={isWorking}
              onPress={() => void handleSubmit()}
            >
              {isWorking ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-[14px] font-bold text-white">Submit</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {proposal.status === "collecting" ? (
          <>
            <View className="mt-4 items-center overflow-hidden rounded-[20px] bg-white p-5">
              <QRCode value={shareUri} size={200} backgroundColor="#FFFFFF" color="#000000" />
            </View>
            <Text className="mt-3 text-[13px] font-semibold text-[#8E8E92]">
              Share this QR with the next co-signer, or scan an updated one they send back.
            </Text>
            <Pressable
              accessibilityRole="button"
              className="mt-3 self-start rounded-full bg-[#242426] px-4 py-2.5"
              onPress={() =>
                router.push({
                  pathname: "/multisig/scan",
                  params: { accountId: account.id },
                })
              }
            >
              <Text className="text-[14px] font-bold text-white">Scan updated signature</Text>
            </Pressable>

            {availableSignerKeys.length > 0 ? (
              <View className="mt-4 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
                <Text className="text-[15px] font-bold text-white">Sign on this device</Text>
                {availableSignerKeys.length > 1 ? (
                  <View className="mt-3 gap-2">
                    {availableSignerKeys.map((key) => (
                      <Pressable
                        key={key}
                        accessibilityRole="button"
                        className={`rounded-full px-3 py-2 ${
                          signerToUse === key
                            ? "border border-[#5BED97] bg-[#242426]"
                            : "border border-[#303033]"
                        }`}
                        onPress={() => setSelectedSignerKey(key)}
                      >
                        <Text className="text-[13px] font-bold text-white">
                          {formatPublicKey(key)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <TextInput
                  className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-white"
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="6-digit wallet PIN"
                  placeholderTextColor="#6E6E72"
                  secureTextEntry
                  value={pin}
                  onChangeText={setPin}
                />
                <Pressable
                  accessibilityRole="button"
                  className="mt-3 self-start rounded-full bg-[#237BFF] px-4 py-2.5"
                  disabled={isWorking || pin.length !== 6}
                  style={{ opacity: isWorking || pin.length !== 6 ? 0.5 : 1 }}
                  onPress={() => void handleSign()}
                >
                  {isWorking ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text className="text-[14px] font-bold text-white">Sign</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Text className="mt-4 text-[13px] font-semibold text-[#8E8E92]">
                You&apos;ve already signed, or none of this device&apos;s wallets are a
                signer on this account.
              </Text>
            )}
          </>
        ) : null}

        {error !== null ? (
          <Text className="mt-4 text-[13px] font-semibold text-[#FF6B6B]">{error}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
