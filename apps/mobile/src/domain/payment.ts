import type { Money } from "./money";

export type PaymentStatus = "draft" | "pending" | "completed" | "failed";

export interface Payment {
  amount: Money;
  id: string;
  recipientName: string;
  status: PaymentStatus;
}
