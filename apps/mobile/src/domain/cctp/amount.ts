/**
 * Stellar represents USDC in seven fractional digits; every other CCTP-supported
 * chain's USDC uses six (standard ERC-20 decimals). Source:
 * https://developers.circle.com/cctp/references/stellar ("precision differences").
 * On-chain amounts are always decimal strings, never floats (see domain/wallet/balance.ts).
 */
const STELLAR_USDC_DECIMALS = 7;
const REMOTE_USDC_DECIMALS = 6;

function decimalToUnits(amount: string, decimals: number): bigint {
  const trimmed = amount.trim();
  const negative = trimmed.startsWith("-");

  if (negative) {
    throw new Error("CCTP transfer amount must not be negative");
  }

  const [whole, fraction = ""] = trimmed.split(".");

  if (!/^\d+$/.test(whole) || (fraction.length > 0 && !/^\d+$/.test(fraction))) {
    throw new Error(`Invalid decimal amount: "${amount}"`);
  }

  if (fraction.length > decimals) {
    throw new Error(
      `Amount "${amount}" has more than ${decimals} fractional digits`
    );
  }

  const paddedFraction = fraction.padEnd(decimals, "0");
  return BigInt(whole + paddedFraction);
}

function unitsToDecimal(units: bigint, decimals: number): string {
  const raw = units.toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, raw.length - decimals);
  const fraction = raw.slice(raw.length - decimals).replace(/0+$/, "");

  return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}

/** Parses a Stellar-precision (7dp) USDC decimal string into its smallest on-chain unit. */
export function stellarAmountToUnits(amount: string): bigint {
  return decimalToUnits(amount, STELLAR_USDC_DECIMALS);
}

/** Formats a Stellar-precision (7dp) smallest-unit amount back into a decimal string. */
export function unitsToStellarAmount(units: bigint): string {
  return unitsToDecimal(units, STELLAR_USDC_DECIMALS);
}

/** Parses a remote-chain-precision (6dp) USDC decimal string into its smallest on-chain unit. */
export function remoteAmountToUnits(amount: string): bigint {
  return decimalToUnits(amount, REMOTE_USDC_DECIMALS);
}

/** Formats a remote-chain-precision (6dp) smallest-unit amount back into a decimal string. */
export function unitsToRemoteAmount(units: bigint): string {
  return unitsToDecimal(units, REMOTE_USDC_DECIMALS);
}

/** Converts a Stellar-precision (7dp) decimal amount into its remote-chain-precision (6dp) equivalent, truncating any excess precision. */
export function stellarAmountToRemoteAmount(amount: string): string {
  const stellarUnits = stellarAmountToUnits(amount);
  const remoteUnits = stellarUnits / 10n ** BigInt(STELLAR_USDC_DECIMALS - REMOTE_USDC_DECIMALS);

  return unitsToRemoteAmount(remoteUnits);
}

/** Converts a remote-chain-precision (6dp) decimal amount into its Stellar-precision (7dp) equivalent. */
export function remoteAmountToStellarAmount(amount: string): string {
  const remoteUnits = remoteAmountToUnits(amount);
  const stellarUnits = remoteUnits * 10n ** BigInt(STELLAR_USDC_DECIMALS - REMOTE_USDC_DECIMALS);

  return unitsToStellarAmount(stellarUnits);
}
