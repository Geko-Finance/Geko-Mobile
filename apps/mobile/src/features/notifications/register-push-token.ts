import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { apiRequest } from "@/src/services/api/api-client";
import {
  getAsyncJsonItem,
  setAsyncJsonItem,
} from "@/src/services/storage/async-json-storage";

const DEVICE_ID_STORAGE_KEY = "geko.push.device-id.v1";

type DevicePlatform = "ios" | "android";

interface RegisterDevicePayload {
  pushToken?: string;
  platform: DevicePlatform;
  deviceId: string;
  appVersion?: string;
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getAsyncJsonItem<string>(DEVICE_ID_STORAGE_KEY);

  if (existing !== null && existing.length > 0) {
    return existing;
  }

  const deviceId = randomUUID();
  await setAsyncJsonItem(DEVICE_ID_STORAGE_KEY, deviceId);
  return deviceId;
}

function getEasProjectId(): string | undefined {
  const eas = Constants.expoConfig?.extra?.eas;

  if (
    eas !== null &&
    typeof eas === "object" &&
    "projectId" in eas &&
    typeof eas.projectId === "string" &&
    eas.projectId.length > 0
  ) {
    return eas.projectId;
  }

  return undefined;
}

async function ensureNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  if (!current.canAskAgain) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Registers this installation with the backend for push delivery. Never throws. */
export async function registerPushToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      return;
    }

    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      return;
    }

    const platform: DevicePlatform = Platform.OS;

    if (!(await ensureNotificationPermissions())) {
      return;
    }

    const projectId = getEasProjectId();
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId !== undefined ? { projectId } : undefined
    );
    const deviceId = await getOrCreateDeviceId();
    const appVersion = Constants.expoConfig?.version;

    await apiRequest<{ ok: boolean }, RegisterDevicePayload>("/devices", {
      body: {
        deviceId,
        platform,
        pushToken: tokenResult.data,
        ...(appVersion !== undefined ? { appVersion } : {}),
      },
      method: "POST",
      requiresAuth: true,
    });
  } catch (error) {
    console.warn("Push token registration failed:", error);
  }
}
