import { decimalToStroops } from './amount';
import type { SwapQuote } from './swap';

/** Returns quotes best-first using net output, never the provider's gross headline amount. */
export function rankSwapQuotes(quotes: readonly SwapQuote[]): SwapQuote[] {
  return [...quotes].sort((left, right) => {
    const leftNet = decimalToStroops(left.netReceiveAmount);
    const rightNet = decimalToStroops(right.netReceiveAmount);

    if (leftNet === rightNet) {
      return left.priceImpactBps - right.priceImpactBps;
    }

    return leftNet > rightNet ? -1 : 1;
  });
}

export function selectBestSwapQuote(
  quotes: readonly SwapQuote[],
): SwapQuote | undefined {
  return rankSwapQuotes(quotes)[0];
}
