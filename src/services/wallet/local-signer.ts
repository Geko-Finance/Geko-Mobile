import { Transaction, TransactionBuilder } from "@stellar/stellar-base";

import type {
  SignTransactionOptions,
  WalletSigner,
} from "@/src/domain/wallet";

import { deviceBiometricAuthorizer } from "./biometric-authorizer";
import type { BiometricAuthorizer } from "./biometric-authorizer";
import { LocalWalletError } from "./local-wallet-errors";
import { SecureStoreKeyStore } from "./secure-store-key-store";
import {
  KeyManager,
  ScryptEncrypter,
} from "@stellar/typescript-wallet-sdk-km";

export type WalletPinProvider = () => Promise<string>;

interface LocalSignerOptions {
  authorizer?: BiometricAuthorizer;
  pinProvider: WalletPinProvider;
  publicKey: string;
}

export class LocalSigner implements WalletSigner {
  readonly custody = "non_custodial" as const;
  private readonly authorizer: BiometricAuthorizer;
  private readonly pinProvider: WalletPinProvider;
  private readonly publicKey: string;

  constructor(options: LocalSignerOptions) {
    this.authorizer = options.authorizer ?? deviceBiometricAuthorizer;
    this.pinProvider = options.pinProvider;
    this.publicKey = options.publicKey;
  }

  async getAddress(): Promise<string> {
    return this.publicKey;
  }

  async getPublicKey(): Promise<string> {
    return this.publicKey;
  }

  async signTransaction(
    transactionXdr: string,
    options: SignTransactionOptions
  ): Promise<string> {
    await this.authorizer.authorize("Authorize transaction signing");
    const pin = await this.pinProvider();
    const manager = new KeyManager({
      keyStore: new SecureStoreKeyStore(),
      shouldCache: false,
    });
    manager.registerEncrypter(ScryptEncrypter);

    try {
      const transaction = TransactionBuilder.fromXDR(
        transactionXdr,
        options.networkPassphrase
      );

      if (!(transaction instanceof Transaction)) {
        throw new Error("Fee-bump envelopes are not supported by LocalSigner.");
      }

      const signed = await manager.signTransaction({
        id: this.publicKey,
        password: pin,
        transaction,
      });
      return signed.toXDR();
    } catch {
      const ids = await manager.loadAllKeyIds();

      if (!ids.includes(this.publicKey)) {
        throw new LocalWalletError(
          "MISSING_KEY",
          "The encrypted key for this wallet is missing from this device."
        );
      }

      throw new LocalWalletError(
        "INVALID_PIN",
        "Unable to sign. Check your wallet PIN and transaction details."
      );
    }
  }
}
