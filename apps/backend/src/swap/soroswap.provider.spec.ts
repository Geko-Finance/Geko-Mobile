import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { SoroswapProvider } from './soroswap.provider';

describe('SoroswapProvider', () => {
  it('stays gracefully unavailable when no server-side API key is configured', async () => {
    const config = {
      get: jest.fn((name: string) =>
        name === 'SOROSWAP_API_URL' ? 'https://api.soroswap.finance' : undefined,
      ),
    } as unknown as ConfigService;
    const provider = new SoroswapProvider(config);

    await expect(
      provider.quote(
        {
          assetIn: 'CA',
          assetOut: 'CB',
          amount: '10000000',
          tradeType: 'EXACT_IN',
          protocols: ['soroswap'],
        },
        'testnet',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
