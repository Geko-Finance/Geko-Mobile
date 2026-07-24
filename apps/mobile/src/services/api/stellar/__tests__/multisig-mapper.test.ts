import { describe, expect, it } from "@jest/globals";
import type { Horizon } from "@stellar/stellar-sdk";

import { mapHorizonAccountToMultisigAccount } from "../multisig-mapper";

const ACCOUNT_ID = "GMASTER0000000000000000000000000000000000000000000000000";
const SIGNER_B = "GSIGNERB000000000000000000000000000000000000000000000000";

/** Only the fields mapHorizonAccountToMultisigAccount reads - not a full Horizon fixture. */
const makeAccountRecord = (): Horizon.ServerApi.AccountRecord =>
  ({
    account_id: ACCOUNT_ID,
    signers: [
      { key: ACCOUNT_ID, weight: 1, type: "ed25519_public_key" },
      { key: SIGNER_B, weight: 1, type: "ed25519_public_key" },
    ],
    thresholds: {
      low_threshold: 1,
      med_threshold: 2,
      high_threshold: 3,
    },
  }) as unknown as Horizon.ServerApi.AccountRecord;

describe("mapHorizonAccountToMultisigAccount", () => {
  it("maps the account id, signers, and thresholds", () => {
    const result = mapHorizonAccountToMultisigAccount(makeAccountRecord());

    expect(result.publicKey).toBe(ACCOUNT_ID);
    expect(result.signers).toEqual([
      { key: ACCOUNT_ID, weight: 1 },
      { key: SIGNER_B, weight: 1 },
    ]);
    expect(result.thresholds).toEqual({
      masterWeight: 1,
      low: 1,
      medium: 2,
      high: 3,
    });
  });

  it("keeps the master key entry in signers alongside extracting its weight into thresholds.masterWeight", () => {
    const result = mapHorizonAccountToMultisigAccount(makeAccountRecord());
    const masterEntry = result.signers.find(
      (signer) => signer.key === result.publicKey,
    );

    expect(masterEntry?.weight).toBe(result.thresholds.masterWeight);
  });

  it("defaults masterWeight to 0 when Horizon omits the master key signer entry", () => {
    const record = makeAccountRecord();
    const withoutMaster = {
      ...record,
      signers: record.signers.filter((signer) => signer.key !== ACCOUNT_ID),
    } as Horizon.ServerApi.AccountRecord;

    const result = mapHorizonAccountToMultisigAccount(withoutMaster);

    expect(result.thresholds.masterWeight).toBe(0);
  });
});
