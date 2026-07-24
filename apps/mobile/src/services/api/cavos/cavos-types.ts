/** Backend custodial wallet record from the Wallets API. */
export interface BackendCustodialWallet {
  readonly id: string;
  readonly custodyType: string;
  readonly publicAddress: string;
  readonly status: "pending" | "needs_device_approval" | "ready";
  readonly isPrimary: boolean;
  readonly label: string | null;
}

/** Result of wallet execute: on-chain transaction hash only. */
export interface CavosExecuteResult {
  readonly hash: string;
}
