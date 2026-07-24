import { getRandomValues } from "expo-crypto";

/**
 * Installs `crypto.getRandomValues` on `globalThis` when missing.
 * Must be imported (side effect) before any code path that generates Stellar
 * keypairs; required because Hermes lacks WebCrypto.
 */
type GlobalCryptoRef = {
  crypto?: {
    getRandomValues?(typedArray: ArrayBufferView): ArrayBufferView;
  };
};

const polyfillGetRandomValues = (
  typedArray: ArrayBufferView
): ArrayBufferView =>
  getRandomValues(typedArray as Parameters<typeof getRandomValues>[0]);

const globalRef = globalThis as unknown as GlobalCryptoRef;

if (globalRef.crypto === undefined) {
  globalRef.crypto = { getRandomValues: polyfillGetRandomValues };
} else if (globalRef.crypto.getRandomValues === undefined) {
  globalRef.crypto.getRandomValues = polyfillGetRandomValues;
}
