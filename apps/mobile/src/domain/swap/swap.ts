import type { Asset, WalletSigner } from '@/src/domain/wallet';

export type SwapSource = 'soroswap' | 'stellar-native';
export type SwapExecutionStatus = 'submitted' | 'confirmed';

export interface SwapQuoteRequest {
  readonly sourceAsset: Asset;
  readonly destinationAsset: Asset;
  readonly sendAmount: string;
  readonly slippageBps: number;
}

export interface SwapRouteHop {
  readonly label: string;
  readonly assetIds: readonly string[];
  readonly sharePercent: number;
}

/** Provider-neutral exact-input quote. All asset amounts remain decimal strings. */
export interface SwapQuote {
  readonly id: string;
  readonly source: SwapSource;
  readonly sourceLabel: string;
  readonly sourceAsset: Asset;
  readonly destinationAsset: Asset;
  readonly sendAmount: string;
  readonly receiveAmount: string;
  /** Receive amount after fees charged in the destination asset. Used for ranking. */
  readonly netReceiveAmount: string;
  readonly minimumReceiveAmount: string;
  readonly feeAmount: string;
  readonly feeAsset: Asset;
  readonly priceImpactBps: number;
  readonly slippageBps: number;
  readonly route: readonly SwapRouteHop[];
  readonly expiresAt: string;
  /** Opaque wire response used only by the adapter that created this quote. */
  readonly providerData: unknown;
}

export interface SwapRoute {
  readonly quote: SwapQuote;
  readonly transactionXdr: string;
}

export interface SwapExecutionResult {
  readonly hash: string;
  readonly status: SwapExecutionStatus;
}

/** Port implemented independently by Soroswap and the native Stellar path-payment fallback. */
export interface SwapAggregator {
  readonly source: SwapSource;
  quote(request: SwapQuoteRequest): Promise<SwapQuote>;
  route(quote: SwapQuote, sourcePublicKey: string): Promise<SwapRoute>;
  execute(route: SwapRoute, signer: WalletSigner): Promise<SwapExecutionResult>;
}
