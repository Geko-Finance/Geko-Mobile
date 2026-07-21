import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";

import { isLikelyStellarPublicKey } from "@/src/domain/wallet";
import { BackButton } from "@/src/features/shared/components/BackButton";

export function ScanAddressScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedInvalid, setScannedInvalid] = useState(false);
  const [handled, setHandled] = useState(false);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (handled) {
      return;
    }

    if (isLikelyStellarPublicKey(data.trim())) {
      setHandled(true);
      router.replace({
        pathname: "/payments/send",
        params: { scannedAddress: data.trim() },
      });
      return;
    }

    setScannedInvalid(true);
    setTimeout(() => setScannedInvalid(false), 2000);
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="mb-2 px-5 pt-2">
        <BackButton />
      </View>

      {permission === null ? null : !permission.granted ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[15px] font-semibold text-[#8E8E92]">
            Camera access is needed to scan wallet addresses.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="mt-4 rounded-full bg-[#242426] px-4 py-2.5"
            onPress={requestPermission}
          >
            <Text className="text-[14px] font-bold text-white">
              Grant camera access
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-1">
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarcodeScanned}
          />

          <View className="absolute left-0 right-0 top-16 items-center px-6">
            <Text className="text-[13px] font-bold uppercase tracking-wide text-white">
              SCAN
            </Text>
            <Text className="mt-1 text-center text-[15px] font-semibold text-white">
              Point your camera at a Stellar address QR code
            </Text>
          </View>

          {scannedInvalid ? (
            <View className="absolute bottom-12 left-6 right-6 rounded-xl bg-[#1E1E20] px-4 py-3">
              <Text className="text-center text-[13px] font-semibold text-[#FF6B6B]">
                That doesn&apos;t look like a Stellar address.
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}
