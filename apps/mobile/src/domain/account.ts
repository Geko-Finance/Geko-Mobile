import type { Money } from "./money";

export interface Account {
  balance: Money;
  id: string;
  name: string;
}
