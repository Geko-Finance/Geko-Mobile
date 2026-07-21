import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { decodeSep7Uri } from "@/src/domain/payments";

export function ScanPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  const hasScannedRef = useRef(false);

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain;

    return (
      <View
        className="flex-1 items-center justify-center bg-black px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-center text-[20px] font-extrabold text-white">
          Camera access needed
        </Text>
        <Text className="mt-3 text-center text-[15px] font-semibold text-[#8E8E92]">
          {canAskAgain
            ? "Geko needs camera access to scan a payment QR code."
            : "Camera access was denied. Enable it for Geko in your device Settings to scan a payment QR code."}
        </Text>
        <Pressable
          accessibilityLabel={
            canAskAgain ? "Grant camera access" : "Open Settings"
          }
          accessibilityRole="button"
          className="mt-6 rounded-full bg-[#242426] px-5 py-3"
          onPress={() => {
            if (canAskAgain) {
              void requestPermission();
            } else {
              void Linking.openSettings();
            }
          }}
        >
          <Text className="text-[14px] font-bold text-white">
            {canAskAgain ? "Grant camera access" : "Open Settings"}
          </Text>
        </Pressable>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (hasScannedRef.current) {
      return;
    }

    try {
      const request = decodeSep7Uri(data);

      if (request.kind !== "pay") {
        setScanError("This QR is a signed-transaction request, not a payment request.");
        return;
      }

      hasScannedRef.current = true;
      router.push({
        pathname: "/payments/confirm",
        params: {
          amount: request.amount ?? "",
          assetCode: request.assetCode ?? "",
          assetIssuer: request.assetIssuer ?? "",
          destination: request.destination,
          memo: request.memo ?? "",
        },
      });
    } catch {
      setScanError("That QR code isn't a valid payment request.");
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        facing="back"
        onBarcodeScanned={handleBarcodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        className="absolute inset-x-0 top-0 px-5"
        style={{ paddingTop: insets.top + 16 }}
      >
        <Text className="text-[20px] font-extrabold text-white">
          Scan to pay
        </Text>
        {scanError !== null ? (
          <View className="mt-3 rounded-[16px] bg-[#121214] px-4 py-3">
            <Text className="text-[14px] font-semibold text-white">
              {scanError}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
