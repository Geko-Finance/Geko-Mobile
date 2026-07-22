import { Keypair } from "@stellar/stellar-base";
import {
  KeyManager,
  KeyType,
  ScryptEncrypter,
  type Key,
} from "@stellar/typescript-wallet-sdk-km";

import { deviceBiometricAuthorizer } from "./biometric-authorizer";
import type { BiometricAuthorizer } from "./biometric-authorizer";
import { LocalWalletError } from "./local-wallet-errors";
import { SecureStoreKeyStore } from "./secure-store-key-store";
import {
  deriveStellarKeypair,
  generateStellarMnemonic,
  isValidStellarMnemonic,
} from "./stellar-mnemonic";

export type RecoveryKind = "mnemonic" | "secret_key";

export interface LocalWalletMaterial {
  readonly publicKey: string;
  readonly recoveryKind: RecoveryKind;
  readonly recoveryValue: string;
  readonly secretKey: string;
}

export interface RevealedRecovery {
  readonly kind: RecoveryKind;
  readonly value: string;
}

interface LocalKeyExtra {
  recoveryKind: RecoveryKind;
  recoveryValue: string;
}

const PIN_PATTERN = /^\d{6}$/;

export function isValidWalletPin(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}

const createKeyManager = (): KeyManager => {
  const manager = new KeyManager({
    keyStore: new SecureStoreKeyStore(),
    shouldCache: false,
  });
  manager.registerEncrypter(ScryptEncrypter);
  return manager;
};

const materialFromKeypair = (
  keypair: Keypair,
  recoveryKind: RecoveryKind,
  recoveryValue: string
): LocalWalletMaterial => ({
  publicKey: keypair.publicKey(),
  recoveryKind,
  recoveryValue,
  secretKey: keypair.secret(),
});

export function generateLocalWalletMaterial(): LocalWalletMaterial {
  const mnemonic = generateStellarMnemonic();
  return materialFromKeypair(
    deriveStellarKeypair(mnemonic),
    "mnemonic",
    mnemonic
  );
}

export function importLocalWalletMaterial(input: string): LocalWalletMaterial {
  const normalized = input.trim();

  if (isValidStellarMnemonic(normalized)) {
    const mnemonic = normalized.toLowerCase().replace(/\s+/g, " ");
    return materialFromKeypair(
      deriveStellarKeypair(mnemonic),
      "mnemonic",
      mnemonic
    );
  }

  try {
    const keypair = Keypair.fromSecret(normalized.toUpperCase());
    return materialFromKeypair(keypair, "secret_key", keypair.secret());
  } catch {
    throw new LocalWalletError(
      "INVALID_RECOVERY",
      "Enter a valid 12- or 24-word recovery phrase, or a Stellar secret key beginning with S."
    );
  }
}

export async function storeLocalWalletMaterial(
  material: LocalWalletMaterial,
  pin: string
): Promise<void> {
  if (!isValidWalletPin(pin)) {
    throw new LocalWalletError(
      "INVALID_PIN",
      "Your wallet PIN must contain exactly six digits."
    );
  }

  const manager = createKeyManager();
  const existingIds = await manager.loadAllKeyIds();

  if (existingIds.includes(material.publicKey)) {
    throw new LocalWalletError(
      "DUPLICATE_WALLET",
      "This self-custody wallet is already stored on this device."
    );
  }

  await manager.storeKey({
    encrypterName: ScryptEncrypter.name,
    key: {
      extra: {
        recoveryKind: material.recoveryKind,
        recoveryValue: material.recoveryValue,
      } satisfies LocalKeyExtra,
      id: material.publicKey,
      privateKey: material.secretKey,
      publicKey: material.publicKey,
      type: KeyType.plaintextKey,
    },
    password: pin,
  });
}

const loadLocalKey = async (publicKey: string, pin: string): Promise<Key> => {
  try {
    return await createKeyManager().loadKey(publicKey, pin);
  } catch {
    const ids = await createKeyManager().loadAllKeyIds();

    if (!ids.includes(publicKey)) {
      throw new LocalWalletError(
        "MISSING_KEY",
        "The encrypted key for this wallet is missing from this device."
      );
    }

    throw new LocalWalletError(
      "INVALID_PIN",
      "That wallet PIN is incorrect."
    );
  }
};

export async function revealLocalWalletRecovery(
  publicKey: string,
  pin: string,
  authorizer: BiometricAuthorizer = deviceBiometricAuthorizer
): Promise<RevealedRecovery> {
  await authorizer.authorize("Reveal wallet recovery details");
  const key = await loadLocalKey(publicKey, pin);
  const extra = key.extra as LocalKeyExtra | undefined;

  if (
    extra === undefined ||
    (extra.recoveryKind !== "mnemonic" &&
      extra.recoveryKind !== "secret_key") ||
    typeof extra.recoveryValue !== "string"
  ) {
    throw new LocalWalletError(
      "MISSING_KEY",
      "Recovery details are unavailable for this wallet."
    );
  }

  return { kind: extra.recoveryKind, value: extra.recoveryValue };
}

export async function removeLocalWallet(publicKey: string): Promise<void> {
  await createKeyManager().removeKey(publicKey);
}
