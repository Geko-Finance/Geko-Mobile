export const SECRETS_STORE = Symbol('SECRETS_STORE');

export interface SecretsStore {
  put(walletId: string, purpose: string, plaintext: string): Promise<void>;
  get(walletId: string, purpose: string): Promise<string | null>;
  delete(walletId: string, purpose: string): Promise<void>;
}
