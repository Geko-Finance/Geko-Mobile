import {
  deleteSecureItemAsync,
  getSecureItemAsync,
  setSecureItemAsync,
} from "@/src/utils/app/SecureStore";

export async function getSecureJsonItem<T>(key: string): Promise<T | null> {
  const value = await getSecureItemAsync(key);

  if (!value) {
    return null;
  }

  return JSON.parse(value) as T;
}

export async function setSecureJsonItem<T>(
  key: string,
  value: T
): Promise<void> {
  await setSecureItemAsync(key, JSON.stringify(value));
}

export async function deleteSecureJsonItem(key: string): Promise<void> {
  await deleteSecureItemAsync(key);
}
