const STELLAR_DECIMALS = 7;
const STROOPS_PER_UNIT = 10n ** BigInt(STELLAR_DECIMALS);
const BASIS_POINTS = 10_000n;

/** Converts a positive Stellar decimal amount into its exact 7-decimal integer units. */
export function decimalToStroops(value: string): bigint {
  const normalized = value.trim();
  const match = /^(\d+)(?:\.(\d{1,7}))?$/.exec(normalized);

  if (match === null) {
    throw new Error('Amount must be a positive number with at most 7 decimals');
  }

  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? '').padEnd(STELLAR_DECIMALS, '0'));
  const result = whole * STROOPS_PER_UNIT + fraction;

  if (result <= 0n) {
    throw new Error('Amount must be greater than zero');
  }

  return result;
}

/** Formats exact 7-decimal integer units without converting through a floating point number. */
export function stroopsToDecimal(value: bigint): string {
  if (value < 0n) {
    throw new Error('Amount cannot be negative');
  }

  const whole = value / STROOPS_PER_UNIT;
  const fraction = (value % STROOPS_PER_UNIT)
    .toString()
    .padStart(STELLAR_DECIMALS, '0')
    .replace(/0+$/, '');

  return fraction.length === 0 ? whole.toString() : `${whole}.${fraction}`;
}

/** Applies slippage with integer floor rounding so the minimum can never exceed the quote. */
export function minimumReceiveAmount(
  quotedAmount: string,
  slippageBps: number,
): string {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps >= 10_000) {
    throw new Error('Slippage must be an integer between 0 and 9999 basis points');
  }

  const quoted = decimalToStroops(quotedAmount);
  const minimum =
    (quoted * (BASIS_POINTS - BigInt(slippageBps))) / BASIS_POINTS;

  return stroopsToDecimal(minimum);
}

/**
 * Estimates price impact in basis points by comparing the full quote's rate with a
 * small probe quote's rate, using cross multiplication to avoid floating point math.
 */
export function estimatePriceImpactBps(input: {
  amountIn: string;
  amountOut: string;
  probeAmountIn: string;
  probeAmountOut: string;
}): number {
  const amountIn = decimalToStroops(input.amountIn);
  const amountOut = decimalToStroops(input.amountOut);
  const probeIn = decimalToStroops(input.probeAmountIn);
  const probeOut = decimalToStroops(input.probeAmountOut);
  const spotScaled = probeOut * amountIn;
  const executionScaled = amountOut * probeIn;

  if (executionScaled >= spotScaled) {
    return 0;
  }

  return Number(((spotScaled - executionScaled) * BASIS_POINTS) / spotScaled);
}
