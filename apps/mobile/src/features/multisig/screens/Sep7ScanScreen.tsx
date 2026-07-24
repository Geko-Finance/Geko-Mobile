import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/src/features/auth/session/SessionProvider";
import { BackButton } from "@/src/features/shared/components/BackButton";
import { useWalletAccounts } from "@/src/features/wallet/state/wallet-store";

import { handleSep7Uri } from "../deep-link/handle-sep7-uri";

export function Sep7ScanScreen() {
  const router = useRouter();
  const { session } = useSession();
  const localAccounts = useWalletAccounts();
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (handled || session === null) {
      return;
    }

    setHandled(true);
    setScanError(null);

    const result = await handleSep7Uri({
      uri: data,
      ownerUserId: session.user.id,
      localAccounts,
    });

    if (result.outcome === "ignored") {
      setScanError("That doesn't look like a multisig signing link.");
      setHandled(false);
      setTimeout(() => setScanError(null), 2500);
      return;
    }

    if (result.outcome === "error") {
      setScanError(result.message);
      setHandled(false);
      return;
    }

    router.replace({
      pathname: "/multisig/proposal/[id]",
      params: { id: result.proposalId, accountId: result.accountId },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="mb-2 px-5 pt-2">
        <BackButton />
      </View>

      {permission === null ? null : !permission.granted ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[15px] font-semibold text-[#8E8E92]">
            Camera access is needed to scan a signing link.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="mt-4 rounded-full bg-[#242426] px-4 py-2.5"
            onPress={requestPermission}
          >
            <Text className="text-[14px] font-bold text-white">Grant camera access</Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-1">
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => {
              void handleBarcodeScanned({ data });
            }}
          />

          <View className="absolute left-0 right-0 top-16 items-center px-6">
            <Text className="text-[13px] font-bold uppercase tracking-wide text-white">
              SCAN
            </Text>
            <Text className="mt-1 text-center text-[15px] font-semibold text-white">
              Point your camera at a multisig signing QR code
            </Text>
          </View>

          {scanError !== null ? (
            <View className="absolute bottom-12 left-6 right-6 rounded-xl bg-[#1E1E20] px-4 py-3">
              <Text className="text-center text-[13px] font-semibold text-[#FF6B6B]">
                {scanError}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}
