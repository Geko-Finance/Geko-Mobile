import {
  selectBestSwapQuote,
  type SwapAggregator,
  type SwapExecutionResult,
  type SwapQuote,
  type SwapQuoteRequest,
} from '@/src/domain/swap';
import type { WalletSigner } from '@/src/domain/wallet';

import { NativeStellarAggregator } from './native-stellar-aggregator';
import { SoroswapAggregator } from './soroswap-aggregator';

export interface SwapQuoteResult {
  readonly best: SwapQuote;
  readonly quotes: readonly SwapQuote[];
  readonly unavailableSources: readonly string[];
}

export class SwapRouter {
  constructor(private readonly aggregators: readonly SwapAggregator[]) {}

  async quote(request: SwapQuoteRequest): Promise<SwapQuoteResult> {
    const results = await Promise.allSettled(
      this.aggregators.map((aggregator) => aggregator.quote(request)),
    );
    const quotes = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    const unavailableSources = results.flatMap((result, index) =>
      result.status === 'rejected'
        ? [this.aggregators[index]?.source ?? 'unknown']
        : [],
    );
    const best = selectBestSwapQuote(quotes);

    if (best === undefined) {
      throw new Error('No swap route is currently available for this pair');
    }

    return { best, quotes, unavailableSources };
  }

  async execute(
    quote: SwapQuote,
    sourcePublicKey: string,
    signer: WalletSigner,
  ): Promise<SwapExecutionResult> {
    const aggregator = this.aggregators.find(
      (candidate) => candidate.source === quote.source,
    );

    if (aggregator === undefined) {
      throw new Error(`No adapter is registered for ${quote.source}`);
    }

    if (new Date(quote.expiresAt).getTime() <= Date.now()) {
      throw new Error('This swap quote has expired; request a fresh quote');
    }

    const route = await aggregator.route(quote, sourcePublicKey);
    return aggregator.execute(route, signer);
  }
}

export const swapRouter = new SwapRouter([
  new SoroswapAggregator(),
  new NativeStellarAggregator(),
]);
