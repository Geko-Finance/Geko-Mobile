import {
  Account,
  BASE_FEE,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk/base';

import {
  decimalToStroops,
  estimatePriceImpactBps,
  minimumReceiveAmount,
  stroopsToDecimal,
  type SwapAggregator,
  type SwapExecutionResult,
  type SwapQuote,
  type SwapQuoteRequest,
  type SwapRoute,
} from '@/src/domain/swap';
import type { Asset } from '@/src/domain/wallet';
import { appConfig } from '@/src/config/env';
import { submitSignedTransaction } from '@/src/services/api/stellar/horizon-submit';
import { fetchAccountSequence } from '@/src/services/api/stellar/stellar-sequence';
import { getActiveStellarNetwork } from '@/src/services/api/stellar/stellar-config';

import { toStellarAsset } from './stellar-asset';

interface HorizonPathAsset {
  asset_type: Asset['type'];
  asset_code?: string;
  asset_issuer?: string;
}

interface HorizonPathRecord {
  source_amount: string;
  destination_amount: string;
  path: HorizonPathAsset[];
}

interface HorizonPathResponse {
  _embedded: { records: HorizonPathRecord[] };
}

interface NativeProviderData {
  readonly path: HorizonPathAsset[];
}

function sourceAssetQuery(asset: Asset) {
  const result: Record<string, string> = {
    source_asset_type: asset.type,
  };

  if (asset.type !== 'native' && asset.issuer !== undefined) {
    result.source_asset_code = asset.code;
    result.source_asset_issuer = asset.issuer;
  }

  return result;
}

function pathAsset(asset: HorizonPathAsset): Asset {
  if (asset.asset_type === 'native') {
    return { id: 'XLM', code: 'XLM', type: 'native' };
  }

  if (asset.asset_code === undefined || asset.asset_issuer === undefined) {
    throw new Error('Horizon returned an incomplete path asset');
  }

  return {
    id: `${asset.asset_code}:${asset.asset_issuer}`,
    code: asset.asset_code,
    issuer: asset.asset_issuer,
    type: asset.asset_type,
  };
}

async function fetchBestPath(
  request: SwapQuoteRequest,
  sendAmount: string,
): Promise<HorizonPathRecord> {
  const network = getActiveStellarNetwork();
  const search = new URLSearchParams({
    ...sourceAssetQuery(request.sourceAsset),
    source_amount: sendAmount,
    destination_assets:
      request.destinationAsset.type === 'native'
        ? 'native'
        : `${request.destinationAsset.code}:${request.destinationAsset.issuer}`,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appConfig.requestTimeoutMs);

  try {
    const response = await fetch(
      `${network.horizonUrl}/paths/strict-send?${search.toString()}`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      throw new Error(`Stellar path quote failed with status ${response.status}`);
    }

    const body = (await response.json()) as HorizonPathResponse;
    const best = [...body._embedded.records].sort((left, right) => {
      const leftAmount = decimalToStroops(left.destination_amount);
      const rightAmount = decimalToStroops(right.destination_amount);
      return leftAmount === rightAmount ? 0 : leftAmount > rightAmount ? -1 : 1;
    })[0];

    if (best === undefined) {
      throw new Error('No native Stellar liquidity path is available');
    }

    return best;
  } finally {
    clearTimeout(timeout);
  }
}

function isNativeProviderData(value: unknown): value is NativeProviderData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    Array.isArray((value as NativeProviderData).path)
  );
}

export class NativeStellarAggregator implements SwapAggregator {
  readonly source = 'stellar-native' as const;

  async quote(request: SwapQuoteRequest): Promise<SwapQuote> {
    const sendStroops = decimalToStroops(request.sendAmount);
    const probeStroops = sendStroops > 100n ? sendStroops / 100n : sendStroops;
    const probeAmount = stroopsToDecimal(probeStroops);
    const fullPathPromise = fetchBestPath(request, request.sendAmount);
    const probePathPromise =
      probeAmount === request.sendAmount
        ? fullPathPromise
        : fetchBestPath(request, probeAmount);
    const [fullPath, probePath] = await Promise.all([
      fullPathPromise,
      probePathPromise,
    ]);
    const receiveAmount = fullPath.destination_amount;

    return {
      id: `stellar-native:${request.sourceAsset.id}:${request.destinationAsset.id}:${Date.now()}`,
      source: this.source,
      sourceLabel: 'Stellar DEX',
      sourceAsset: request.sourceAsset,
      destinationAsset: request.destinationAsset,
      sendAmount: request.sendAmount,
      receiveAmount,
      netReceiveAmount: receiveAmount,
      minimumReceiveAmount: minimumReceiveAmount(
        receiveAmount,
        request.slippageBps,
      ),
      feeAmount: stroopsToDecimal(BigInt(BASE_FEE)),
      feeAsset: { id: 'XLM', code: 'XLM', type: 'native' },
      priceImpactBps: estimatePriceImpactBps({
        amountIn: request.sendAmount,
        amountOut: receiveAmount,
        probeAmountIn: probeAmount,
        probeAmountOut: probePath.destination_amount,
      }),
      slippageBps: request.slippageBps,
      route: [
        {
          label: 'SDEX + liquidity pools',
          assetIds: [
            request.sourceAsset.id,
            ...fullPath.path.map((asset) => pathAsset(asset).id),
            request.destinationAsset.id,
          ],
          sharePercent: 100,
        },
      ],
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
      providerData: { path: fullPath.path } satisfies NativeProviderData,
    };
  }

  async route(quote: SwapQuote, sourcePublicKey: string): Promise<SwapRoute> {
    if (quote.source !== this.source || !isNativeProviderData(quote.providerData)) {
      throw new Error('Invalid native Stellar quote');
    }

    const network = getActiveStellarNetwork();
    const sequence = await fetchAccountSequence(sourcePublicKey);
    const account = new Account(sourcePublicKey, sequence);
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: network.networkPassphrase,
    })
      .addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset: toStellarAsset(quote.sourceAsset),
          sendAmount: quote.sendAmount,
          destination: sourcePublicKey,
          destAsset: toStellarAsset(quote.destinationAsset),
          destMin: quote.minimumReceiveAmount,
          path: quote.providerData.path.map((asset) =>
            toStellarAsset(pathAsset(asset)),
          ),
        }),
      )
      .setTimeout(30)
      .build();

    return { quote, transactionXdr: transaction.toXDR() };
  }

  async execute(
    route: SwapRoute,
    signer: Parameters<SwapAggregator['execute']>[1],
  ): Promise<SwapExecutionResult> {
    const { networkPassphrase } = getActiveStellarNetwork();
    const { xdr } = await signer.signTransaction(route.transactionXdr, {
      networkPassphrase,
    });
    const { hash } = await submitSignedTransaction(xdr);

    return { hash, status: 'submitted' };
  }
}
