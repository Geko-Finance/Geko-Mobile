import "@/src/services/crypto/crypto-polyfill";

import { SigningKeypair } from "@stellar/typescript-wallet-sdk";

import type {
  SignTransactionOptions,
  WalletSigner,
} from "@/src/domain/wallet";
import {
  createStellarWallet,
  getStellarNetworkConfigByPassphrase,
} from "@/src/services/api/stellar/stellar-config";
import {
  getSecureJsonItem,
  setSecureJsonItem,
} from "@/src/services/storage/secure-json-storage";

/** SecureStore key for a given account's signing secret; never log this key's value. */
export function secretStorageKeyFor(accountId: string): string {
  return `geko.wallet.signer.secret.${accountId}`;
}

/** Persists a freshly generated secret key for `accountId`. Call once, right after generating the keypair. */
export async function persistSigningSecret(
  accountId: string,
  secretKey: string
): Promise<void> {
  await setSecureJsonItem(secretStorageKeyFor(accountId), secretKey);
}

async function loadSigningSecret(accountId: string): Promise<string> {
  const secret = await getSecureJsonItem<string>(secretStorageKeyFor(accountId));

  if (secret === null) {
    throw new Error(`No signing key stored for account ${accountId}`);
  }

  return secret;
}

/**
 * Non-custodial `WalletSigner` backed by a real keypair generated on-device and persisted in
 * SecureStore. Never logs the secret key, the account address, or transaction XDR.
 */
export class LocalWalletSigner implements WalletSigner {
  readonly custody = "non_custodial" as const;

  constructor(private readonly accountId: string) {}

  async getAddress(): Promise<string> {
    return this.getPublicKey();
  }

  async getPublicKey(): Promise<string> {
    const secret = await loadSigningSecret(this.accountId);
    return SigningKeypair.fromSecret(secret).publicKey;
  }

  async signTransaction(
    transactionXdr: string,
    options: SignTransactionOptions
  ): Promise<string> {
    const secret = await loadSigningSecret(this.accountId);
    const signingKeypair = SigningKeypair.fromSecret(secret);
    const networkConfig = getStellarNetworkConfigByPassphrase(
      options.networkPassphrase
    );
    const wallet = createStellarWallet(networkConfig);

    const decoded = wallet.stellar().decodeTransaction(transactionXdr);
    const signed = signingKeypair.sign(decoded);

    return signed.toXDR();
  }
}
