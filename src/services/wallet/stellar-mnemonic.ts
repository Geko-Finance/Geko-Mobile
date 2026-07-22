import { hmac } from "@noble/hashes/hmac";
import { sha512 } from "@noble/hashes/sha512";
import { concatBytes, utf8ToBytes } from "@noble/hashes/utils";
import {
  entropyToMnemonic,
  mnemonicToSeedSync,
  validateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { Keypair } from "@stellar/stellar-base";
import { Buffer } from "buffer";
import { getRandomBytes } from "expo-crypto";

const STELLAR_DERIVATION_PATH = [44, 148, 0] as const;
const HARDENED_OFFSET = 0x80000000;

const serializeIndex = (index: number): Uint8Array => {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, index + HARDENED_OFFSET, false);
  return bytes;
};

export function generateStellarMnemonic(): string {
  return entropyToMnemonic(getRandomBytes(16), wordlist);
}

export function isValidStellarMnemonic(value: string): boolean {
  const words = value.trim().toLowerCase().split(/\s+/);

  return (
    (words.length === 12 || words.length === 24) &&
    validateMnemonic(words.join(" "), wordlist)
  );
}

/** Derives SEP-5 account index 0 at m/44'/148'/0' using SLIP-0010 Ed25519. */
export function deriveStellarKeypair(mnemonic: string): Keypair {
  const seed = mnemonicToSeedSync(mnemonic.trim().toLowerCase());
  let digest = hmac(sha512, utf8ToBytes("ed25519 seed"), seed);

  for (const index of STELLAR_DERIVATION_PATH) {
    digest = hmac(
      sha512,
      digest.slice(32),
      concatBytes(new Uint8Array([0]), digest.slice(0, 32), serializeIndex(index))
    );
  }

  return Keypair.fromRawEd25519Seed(Buffer.from(digest.slice(0, 32)));
}
