import { describe, expect, it, jest } from "@jest/globals";

import type { BiometricAuthorizer } from "../biometric-authorizer";
import { LocalWalletError } from "../local-wallet-errors";
import {
  importLocalWalletMaterial,
  removeLocalWallet,
  revealLocalWalletRecovery,
  storeLocalWalletMaterial,
} from "../local-wallet-service";

const MNEMONIC =
  "illness spike retreat truth genius clock brain pass fit cave bargain toe";
const SECRET = "SBGWSG6BTNCKCOB3DIFBGCVMUPQFYPA2G4O34RMTB343OYPXU5DJDVMN";

describe("local wallet lifecycle", () => {
  it("imports and securely reveals a mnemonic after biometric authorization", async () => {
    const material = importLocalWalletMaterial(MNEMONIC);
    const authorize = jest.fn(async () => {});
    const authorizer: BiometricAuthorizer = { authorize };

    await storeLocalWalletMaterial(material, "123456");
    const revealed = await revealLocalWalletRecovery(
      material.publicKey,
      "123456",
      authorizer
    );

    expect(authorize).toHaveBeenCalledTimes(1);
    expect(revealed).toEqual({ kind: "mnemonic", value: MNEMONIC });
  });

  it("rejects invalid recovery input and an incorrect PIN", async () => {
    expect(() => importLocalWalletMaterial("not a wallet")).toThrow(
      LocalWalletError
    );

    const material = importLocalWalletMaterial(MNEMONIC);
    await storeLocalWalletMaterial(material, "123456");

    await expect(
      revealLocalWalletRecovery(material.publicKey, "000000", {
        authorize: async () => {},
      })
    ).rejects.toMatchObject({ code: "INVALID_PIN" });
  });

  it("imports a Stellar secret key", () => {
    const material = importLocalWalletMaterial(SECRET);

    expect(material.recoveryKind).toBe("secret_key");
    expect(material.publicKey).toBe(
      "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ6"
    );
  });

  it("rejects duplicate encrypted wallets", async () => {
    const material = importLocalWalletMaterial(MNEMONIC);
    await storeLocalWalletMaterial(material, "123456");

    await expect(
      storeLocalWalletMaterial(material, "123456")
    ).rejects.toMatchObject({ code: "DUPLICATE_WALLET" });
  });

  it("removes the encrypted key", async () => {
    const material = importLocalWalletMaterial(MNEMONIC);
    await storeLocalWalletMaterial(material, "123456");
    await removeLocalWallet(material.publicKey);

    await expect(
      revealLocalWalletRecovery(material.publicKey, "123456", {
        authorize: async () => {},
      })
    ).rejects.toMatchObject({ code: "MISSING_KEY" });
  });
});
