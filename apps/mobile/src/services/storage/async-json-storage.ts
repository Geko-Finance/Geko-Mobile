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
