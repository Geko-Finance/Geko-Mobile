import { describe, expect, it } from "@jest/globals";

import {
  deriveStellarKeypair,
  generateStellarMnemonic,
  isValidStellarMnemonic,
} from "../stellar-mnemonic";

const SEP5_MNEMONIC =
  "illness spike retreat truth genius clock brain pass fit cave bargain toe";

describe("Stellar mnemonic derivation", () => {
  it("matches the SEP-5 account zero vector", () => {
    const keypair = deriveStellarKeypair(SEP5_MNEMONIC);

    expect(keypair.publicKey()).toBe(
      "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ6"
    );
    expect(keypair.secret()).toBe(
      "SBGWSG6BTNCKCOB3DIFBGCVMUPQFYPA2G4O34RMTB343OYPXU5DJDVMN"
    );
  });

  it("generates valid 12-word recovery phrases", () => {
    const mnemonic = generateStellarMnemonic();

    expect(mnemonic.split(" ")).toHaveLength(12);
    expect(isValidStellarMnemonic(mnemonic)).toBe(true);
  });

  it("rejects invalid recovery phrases", () => {
    expect(isValidStellarMnemonic("one two three")).toBe(false);
  });
});
