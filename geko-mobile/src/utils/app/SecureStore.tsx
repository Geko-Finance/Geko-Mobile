import storageUtil from "./storageUtility";

export interface SecureItemKV {
  key: string;
  value: string;
}

export const setSecureItemAsync = async (
  key: string,
  value: string
): Promise<void> => {
  await storageUtil.setItem(key, value);
};

export const setMultiSecureItemsAsync = async (
  items: SecureItemKV[]
): Promise<void> => {
  await Promise.all(
    items.map(({ key, value }) => storageUtil.setItem(key, value))
  );
};

export const getSecureItemAsync = async (
  key: string
): Promise<string | null> => {
  return storageUtil.getItem(key);
};

export const deleteSecureItemAsync = async (key: string): Promise<void> => {
  await storageUtil.removeItem(key);
};

export const deleteMultiSecureItemsAsync = async (
  keys: string[]
): Promise<void> => {
  await Promise.all(keys.map((key) => storageUtil.removeItem(key)));
};
