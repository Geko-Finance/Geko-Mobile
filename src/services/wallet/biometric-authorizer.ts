import * as LocalAuthentication from "expo-local-authentication";

import { LocalWalletError } from "./local-wallet-errors";

export interface BiometricAuthorizer {
  authorize(reason: string): Promise<void>;
}

export const deviceBiometricAuthorizer: BiometricAuthorizer = {
  async authorize(reason) {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);

    if (!hasHardware || !isEnrolled) {
      throw new LocalWalletError(
        "BIOMETRIC_UNAVAILABLE",
        "Set up Face ID, Touch ID, or fingerprint authentication before using a self-custody wallet."
      );
    }

    const result = await LocalAuthentication.authenticateAsync({
      cancelLabel: "Cancel",
      disableDeviceFallback: true,
      fallbackLabel: "",
      promptMessage: reason,
    });

    if (!result.success) {
      throw new LocalWalletError(
        "BIOMETRIC_CANCELLED",
        "Biometric authentication was cancelled or unsuccessful."
      );
    }
  },
};
