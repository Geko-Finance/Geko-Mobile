import type { Asset } from '@/src/domain/wallet';
import { rankSwapQuotes, type SwapQuote } from '..';

const xlm: Asset = { id: 'XLM', code: 'XLM', type: 'native' };
const usdc: Asset = {
  id: 'USDC:GISSUER',
  code: 'USDC',
  issuer: 'GISSUER',
  type: 'credit_alphanum4',
};

function quote(
  id: string,
  receiveAmount: string,
  netReceiveAmount: string,
  priceImpactBps = 0,
): SwapQuote {
  return {
    id,
    source: id === 'native' ? 'stellar-native' : 'soroswap',
    sourceLabel: id,
    sourceAsset: xlm,
    destinationAsset: usdc,
    sendAmount: '10',
    receiveAmount,
    netReceiveAmount,
    minimumReceiveAmount: netReceiveAmount,
    feeAmount: '0',
    feeAsset: usdc,
    priceImpactBps,
    slippageBps: 50,
    route: [],
    expiresAt: '2026-08-20T00:00:00.000Z',
    providerData: null,
  };
}

describe('rankSwapQuotes', () => {
  it('selects the best net output instead of the best gross output', () => {
    const grossWinner = quote('soroswap', '10.5', '9.9');
    const netWinner = quote('native', '10.2', '10.2');

    expect(rankSwapQuotes([grossWinner, netWinner]).map(({ id }) => id)).toEqual([
      'native',
      'soroswap',
    ]);
  });

  it('uses lower price impact as the deterministic tie breaker', () => {
    expect(
      rankSwapQuotes([
        quote('soroswap', '10', '10', 25),
        quote('native', '10', '10', 10),
      ])[0]?.id,
    ).toBe('native');
  });
});
