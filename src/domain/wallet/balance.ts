import type { Asset } from "./asset";

/**
 * On-chain asset balance.
 * `amount` is a decimal string with up to 7 fractional digits (Stellar on-chain precision);
 * never represent on-chain amounts as floats; this intentionally differs from the fiat `Money`
 * type in src/domain/money.ts which uses minor-unit numbers.
 * `limit` is the trustline limit for issued assets, absent for native.
 */
export interface Balance {
  readonly amount: string;
  readonly asset: Asset;
  readonly limit?: string;
}
