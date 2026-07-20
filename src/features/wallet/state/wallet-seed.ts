import type { WalletAccount } from "@/src/domain/wallet";

/**
 * Throwaway Friendbot-funded Stellar TESTNET accounts used to seed development builds
 * until the custody epics ship real account creation.
 * Public keys only — no secret keys exist anywhere.
 * Periodic testnet resets wipe them — re-fund any key via
 * https://friendbot.stellar.org?addr=<publicKey>.
 */
export const DEV_SEED_ACCOUNTS: WalletAccount[] = [
  {
    createdAt: "2026-07-19T12:00:00.000Z",
    custody: "custodial",
    id: "GAIEHQHCLTEGCRHNAQC7ULVPDNTCULX6DKPCYUCLUZQT6E2Z6PV4L5L5",
    name: "Main Account",
    publicKey: "GAIEHQHCLTEGCRHNAQC7ULVPDNTCULX6DKPCYUCLUZQT6E2Z6PV4L5L5",
  },
  {
    createdAt: "2026-07-19T12:00:00.000Z",
    custody: "non_custodial",
    id: "GB5YQDSMT3HBGYP63HLCMHFC23LITKGSXXKAGQSTHGKNZTR7ZQGYW2GT",
    name: "Savings",
    publicKey: "GB5YQDSMT3HBGYP63HLCMHFC23LITKGSXXKAGQSTHGKNZTR7ZQGYW2GT",
  },
];
