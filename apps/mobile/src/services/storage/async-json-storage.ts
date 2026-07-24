import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StateStorage } from "zustand/middleware";

/**
 * Zustand-persist storage adapter backed by AsyncStorage.
 * For NON-SECRET data only (account metadata, preferences); secrets and tokens
 * must keep using the SecureStore utilities in secure-json-storage.ts.
 */
export const asyncStateStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};

/** Read a JSON value from AsyncStorage. For NON-SECRET data only. */
export async function getAsyncJsonItem<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key);

  if (value === null) {
    return null;
  }

  return JSON.parse(value) as T;
}

/** Persist a JSON value to AsyncStorage. For NON-SECRET data only. */
export async function setAsyncJsonItem<T>(
  key: string,
  value: T
): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function deleteAsyncJsonItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
