import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  IssuedAssetId,
  NativeAssetId,
  PublicKeypair,
} from "@stellar/typescript-wallet-sdk";

import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";
import { useActiveNetworkId } from "@/src/features/wallet/api/wallet-queries";
import { useActiveAccount } from "@/src/features/wallet/state/wallet-store";
import {
  createStellarWallet,
  getActiveStellarNetwork,
} from "@/src/services/api/stellar/stellar-config";
import { getWalletSigner } from "@/src/services/wallet/signer-factory";

type ConfirmParams = {
  amount?: string;
  assetCode?: string;
  assetIssuer?: string;
  destination?: string;
  memo?: string;
};

export function ConfirmPaymentScreen() {
  const params = useLocalSearchParams<ConfirmParams>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const account = useActiveAccount();
  const networkId = useActiveNetworkId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const destination = params.destination;
  const amount = params.amount && params.amount !== "" ? params.amount : undefined;
  const assetCode =
    params.assetCode && params.assetCode !== "" ? params.assetCode : undefined;
  const assetIssuer =
    params.assetIssuer && params.assetIssuer !== "" ? params.assetIssuer : undefined;
  const memo = params.memo && params.memo !== "" ? params.memo : undefined;

  if (destination === undefined) {
    return (
      <ScreenPlaceholder
        description="Scan a payment QR code first."
        eyebrow="Payments"
        title="Nothing to confirm"
      />
    );
  }

  if (account === null) {
    return (
      <ScreenPlaceholder
        description="Create or select a wallet before paying."
        eyebrow="Payments"
        title="No active wallet"
      />
    );
  }

  const handleConfirm = async () => {
    if (amount === undefined) {
      setSubmitError("This request has no amount — cannot submit yet.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const config = getActiveStellarNetwork();
      const wallet = createStellarWallet(config);
      const asset =
        assetCode !== undefined && assetIssuer !== undefined
          ? new IssuedAssetId(assetCode, assetIssuer)
          : new NativeAssetId();

      const builder = await wallet.stellar().transaction({
        sourceAddress: PublicKeypair.fromPublicKey(account.publicKey),
      });
      const unsignedTransaction = builder
        .transfer(destination, asset, amount)
        .build();

      const signer = getWalletSigner(account);
      const signedXdr = await signer.signTransaction(unsignedTransaction.toXDR(), {
        networkPassphrase: config.networkPassphrase,
      });

      const signedTransaction = wallet.stellar().decodeTransaction(signedXdr);
      await wallet.stellar().submitTransaction(signedTransaction);

      router.replace("/payments/success");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Payment failed to submit."
      );
    } finally {
      setIsSubmitting(false);
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
          Payments
        </Text>
        <Text className="mt-2 text-[32px] font-extrabold text-white">Confirm</Text>

        <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
          <Text className="text-[13px] font-semibold text-[#8E8E92]">To</Text>
          <Text className="mt-1 text-[15px] font-semibold text-white">
            {`${destination.slice(0, 4)}…${destination.slice(-4)}`}
          </Text>

          <Text className="mt-4 text-[13px] font-semibold text-[#8E8E92]">
            Amount
          </Text>
          <Text className="mt-1 text-[15px] font-semibold text-white">
            {amount ?? "Not specified"} {assetCode ?? "XLM"}
          </Text>

          {memo !== undefined ? (
            <>
              <Text className="mt-4 text-[13px] font-semibold text-[#8E8E92]">
                Memo
              </Text>
              <Text className="mt-1 text-[15px] font-semibold text-white">
                {memo}
              </Text>
            </>
          ) : null}
        </View>

        {submitError !== null ? (
          <Text className="mt-4 text-[13px] font-semibold text-[#FF6B6B]">
            {submitError}
          </Text>
        ) : null}

        <Pressable
          accessibilityLabel="Confirm payment"
          accessibilityRole="button"
          className="mt-6 items-center rounded-full bg-[#5BED97] px-5 py-3.5"
          disabled={isSubmitting}
          onPress={() => {
            void handleConfirm();
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#123B2B" />
          ) : (
            <Text className="text-[15px] font-extrabold text-[#123B2B]">
              Confirm and pay ({networkId === "mainnet" ? "Mainnet" : "Testnet"})
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
