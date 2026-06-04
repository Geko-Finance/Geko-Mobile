import type { Money } from "./money";

export type TransactionStatus = "pending" | "posted" | "failed";

export interface Transaction {
  amount: Money;
  createdAt: string;
  id: string;
  merchantName: string;
  status: TransactionStatus;
}
