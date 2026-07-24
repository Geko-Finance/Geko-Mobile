import * as LocalAuthentication from "expo-local-authentication";

import {
  getAsyncJsonItem,
  setAsyncJsonItem,
} from "@/src/services/storage/async-json-storage";

const BIOMETRIC_LOCK_PREFERENCE_KEY = "geko.biometric-lock.enabled.v1";

async function getDefaultBiometricLockEnabled(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);

  return hasHardware && isEnrolled;
}

/**
 * Local UI preference for requiring Face ID / Touch ID on app entry.
 * Defaults to true when the device has biometric hardware + enrollment.
 * Not synced to the backend `user_devices.biometric_lock_enabled` column.
 */
export async function isBiometricLockEnabled(): Promise<boolean> {
  const stored = await getAsyncJsonItem<boolean>(BIOMETRIC_LOCK_PREFERENCE_KEY);

  if (stored !== null) {
    return stored;
  }

  return getDefaultBiometricLockEnabled();
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  await setAsyncJsonItem(BIOMETRIC_LOCK_PREFERENCE_KEY, enabled);
}
