import type {
  EncryptedKey,
  KeyMetadata,
  KeyStore,
} from "@stellar/typescript-wallet-sdk-km";

import {
  deleteSecureJsonItem,
  getSecureJsonItem,
  setSecureJsonItem,
} from "@/src/services/storage/secure-json-storage";

const INDEX_KEY = "geko.wallet.local.index.v1";
const KEY_PREFIX = "geko.wallet.local.key.v1.";

const keyStorageKey = (id: string): string => `${KEY_PREFIX}${id}`;
const metadataFor = (key: EncryptedKey): KeyMetadata => ({ id: key.id });

export class SecureStoreKeyStore implements KeyStore {
  readonly name = "GekoSecureStoreKeyStore";

  async configure(): Promise<void> {}

  private async loadIndex(): Promise<string[]> {
    return (await getSecureJsonItem<string[]>(INDEX_KEY)) ?? [];
  }

  private async saveIndex(ids: string[]): Promise<void> {
    await setSecureJsonItem(INDEX_KEY, ids);
  }

  async storeKeys(keys: EncryptedKey[]): Promise<KeyMetadata[]> {
    const index = await this.loadIndex();
    const incomingIds = keys.map((key) => key.id);

    if (
      new Set(incomingIds).size !== incomingIds.length ||
      incomingIds.some((id) => index.includes(id))
    ) {
      throw new Error("One or more wallet keys already exist.");
    }

    await Promise.all(
      keys.map((key) => setSecureJsonItem(keyStorageKey(key.id), key))
    );
    await this.saveIndex([...index, ...incomingIds]);

    return keys.map(metadataFor);
  }

  async updateKeys(keys: EncryptedKey[]): Promise<KeyMetadata[]> {
    const index = await this.loadIndex();

    if (keys.some((key) => !index.includes(key.id))) {
      throw new Error("One or more wallet keys do not exist.");
    }

    await Promise.all(
      keys.map((key) => setSecureJsonItem(keyStorageKey(key.id), key))
    );

    return keys.map(metadataFor);
  }

  async loadKey(id: string): Promise<EncryptedKey | undefined> {
    return (
      (await getSecureJsonItem<EncryptedKey>(keyStorageKey(id))) ?? undefined
    );
  }

  async removeKey(id: string): Promise<KeyMetadata | undefined> {
    const key = await this.loadKey(id);

    if (key === undefined) {
      return undefined;
    }

    await deleteSecureJsonItem(keyStorageKey(id));
    const index = await this.loadIndex();
    await this.saveIndex(index.filter((entry) => entry !== id));

    return metadataFor(key);
  }

  async loadAllKeys(): Promise<EncryptedKey[]> {
    const index = await this.loadIndex();
    const keys = await Promise.all(index.map((id) => this.loadKey(id)));

    return keys.filter((key): key is EncryptedKey => key !== undefined);
  }
}
