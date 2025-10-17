import * as SecureStore from "expo-secure-store";

export interface IStorageUtil {
  setItem: (key: string, value: string) => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
}

const setItem = async (key: string, value: string): Promise<void> => {
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

const getItem = async (key: string): Promise<string | null> => {
  return SecureStore.getItemAsync(key);
};

const removeItem = async (key: string): Promise<void> => {
  await SecureStore.deleteItemAsync(key);
};

const storageUtil: IStorageUtil = {
  setItem,
  getItem,
  removeItem,
};

export default storageUtil;
