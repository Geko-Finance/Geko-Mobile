import {
  decimalToStroops,
  stroopsToDecimal,
  type SwapAggregator,
  type SwapExecutionResult,
  type SwapQuote,
  type SwapQuoteRequest,
  type SwapRoute,
  type SwapRouteHop,
} from '@/src/domain/swap';
import { apiRequest } from '@/src/services/api/api-client';
import { getActiveStellarNetwork } from '@/src/services/api/stellar/stellar-config';

import { toContractId } from './stellar-asset';
import { assertSafeSoroswapTransaction } from './soroswap-transaction';

interface SoroswapRouteStep {
  swapInfo?: {
    protocol?: string;
    path?: string[];
  };
  percent?: string | number;
}

interface SoroswapQuoteResponse {
  amountIn: string;
  amountOut: string | number;
  otherAmountThreshold: string | number;
  priceImpactPct?: string;
  platform?: string;
  platformFee?: { feeAmount?: string | number; feeBps?: number };
  routePlan?: SoroswapRouteStep[];
  [key: string]: unknown;
}

interface SoroswapBuildResponse {
  xdr: string;
}

interface SoroswapSendResponse {
  hash?: string;
  txHash?: string;
  status?: string;
}

function percentToBps(value: string | undefined): number {
  if (value === undefined || !/^\d+(?:\.\d+)?$/.test(value)) {
    return 0;
  }

  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
}

function routeSteps(quote: SoroswapQuoteResponse): SwapRouteHop[] {
  return (quote.routePlan ?? []).map((step) => ({
    label: step.swapInfo?.protocol ?? quote.platform ?? 'Soroswap',
    assetIds: step.swapInfo?.path ?? [],
    sharePercent: Number(step.percent ?? 100),
  }));
}

function isSoroswapQuote(value: unknown): value is SoroswapQuoteResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'amountIn' in value &&
    'amountOut' in value &&
    'otherAmountThreshold' in value
  );
}

export class SoroswapAggregator implements SwapAggregator {
  readonly source = 'soroswap' as const;

  async quote(request: SwapQuoteRequest): Promise<SwapQuote> {
    const network = getActiveStellarNetwork();
    const response = await apiRequest<SoroswapQuoteResponse>(
      `/swap/soroswap/quote?network=${network.id}`,
      {
        method: 'POST',
        requiresAuth: true,
        body: {
          assetIn: toContractId(request.sourceAsset, network.networkPassphrase),
          assetOut: toContractId(
            request.destinationAsset,
            network.networkPassphrase,
          ),
          amount: decimalToStroops(request.sendAmount).toString(),
          tradeType: 'EXACT_IN',
          protocols: ['soroswap', 'phoenix', 'aqua'],
          slippageBps: request.slippageBps,
          maxHops: 2,
        },
      },
    );
    const receiveAmount = stroopsToDecimal(BigInt(response.amountOut));
    const minimumAmount = stroopsToDecimal(
      BigInt(response.otherAmountThreshold),
    );
    const feeAmount =
      response.platformFee?.feeAmount === undefined
        ? '0'
        : stroopsToDecimal(BigInt(response.platformFee.feeAmount));

    return {
      id: `soroswap:${request.sourceAsset.id}:${request.destinationAsset.id}:${Date.now()}`,
      source: this.source,
      sourceLabel: 'Soroswap',
      sourceAsset: request.sourceAsset,
      destinationAsset: request.destinationAsset,
      sendAmount: request.sendAmount,
      receiveAmount,
      netReceiveAmount: receiveAmount,
      minimumReceiveAmount: minimumAmount,
      feeAmount,
      feeAsset: request.sourceAsset,
      priceImpactBps: percentToBps(response.priceImpactPct),
      slippageBps: request.slippageBps,
      route: routeSteps(response),
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
      providerData: response,
    };
  }

  async route(quote: SwapQuote, sourcePublicKey: string): Promise<SwapRoute> {
    if (quote.source !== this.source || !isSoroswapQuote(quote.providerData)) {
      throw new Error('Invalid Soroswap quote');
    }

    const network = getActiveStellarNetwork();
    const response = await apiRequest<SoroswapBuildResponse>(
      `/swap/soroswap/build?network=${network.id}`,
      {
        method: 'POST',
        requiresAuth: true,
        body: {
          quote: quote.providerData,
          from: sourcePublicKey,
          to: sourcePublicKey,
        },
      },
    );

    if (typeof response.xdr !== 'string' || response.xdr.length === 0) {
      throw new Error('Soroswap did not return a transaction');
    }

    assertSafeSoroswapTransaction(
      response.xdr,
      network.networkPassphrase,
      sourcePublicKey,
    );

    return { quote, transactionXdr: response.xdr };
  }

  async execute(
    route: SwapRoute,
    signer: Parameters<SwapAggregator['execute']>[1],
  ): Promise<SwapExecutionResult> {
    const network = getActiveStellarNetwork();
    const { xdr } = await signer.signTransaction(route.transactionXdr, {
      networkPassphrase: network.networkPassphrase,
    });
    const response = await apiRequest<SoroswapSendResponse>(
      `/swap/soroswap/send?network=${network.id}`,
      {
        method: 'POST',
        requiresAuth: true,
        body: { xdr },
      },
    );
    const hash = response.hash ?? response.txHash;

    if (hash === undefined) {
      throw new Error('Soroswap did not return a transaction hash');
    }

    return { hash, status: 'submitted' };
  }
}
