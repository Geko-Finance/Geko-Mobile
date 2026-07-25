import type { ConfigService } from '@nestjs/config';
import { AbroadFinanceProvider } from './abroad-finance.provider';
import { CrossBorderProviderException } from '../exceptions/cross-border-provider.exception';
import { CrossBorderUnavailableException } from '../exceptions/cross-border-unavailable.exception';

const makeConfigService = (apiKey: string | undefined): ConfigService =>
  ({
    get: jest.fn((key: string) => (key === 'ABROAD_API_KEY' ? apiKey : undefined)),
  }) as unknown as ConfigService;

const mockFetchResponse = (status: number, body: unknown) => {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
};

describe('AbroadFinanceProvider - disabled (no ABROAD_API_KEY)', () => {
  let provider: AbroadFinanceProvider;
  let fetchSpy: jest.Mock;

  beforeEach(() => {
    provider = new AbroadFinanceProvider(makeConfigService(undefined));
    fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  it('reports itself as not enabled', () => {
    expect(provider.isEnabled()).toBe(false);
  });

  it('throws CrossBorderUnavailableException without calling fetch', async () => {
    await expect(
      provider.createQuote({
        amount: 100,
        cryptoCurrency: 'USDC',
        network: 'STELLAR',
        paymentMethod: 'BREB',
        targetCurrency: 'COP',
      }),
    ).rejects.toBeInstanceOf(CrossBorderUnavailableException);
    await expect(provider.getTransaction('abc')).rejects.toBeInstanceOf(
      CrossBorderUnavailableException,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('also treats a blank ABROAD_API_KEY as disabled', () => {
    const blankKeyProvider = new AbroadFinanceProvider(makeConfigService('   '));
    expect(blankKeyProvider.isEnabled()).toBe(false);
  });
});

describe('AbroadFinanceProvider - enabled', () => {
  let provider: AbroadFinanceProvider;

  beforeEach(() => {
    provider = new AbroadFinanceProvider(makeConfigService('test-api-key'));
  });

  it('maps createQuote request/response between camelCase and Abroad snake_case', async () => {
    const fetchSpy = mockFetchResponse(200, {
      quote_id: 'q-1',
      expiration_time: 1_700_000_000_000,
      value: 42.5,
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await provider.createQuote({
      amount: 400000,
      cryptoCurrency: 'USDC',
      network: 'STELLAR',
      paymentMethod: 'BREB',
      targetCurrency: 'COP',
    });

    expect(result).toEqual({ quoteId: 'q-1', expirationTime: 1_700_000_000_000, value: 42.5 });

    const [, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      amount: 400000,
      crypto_currency: 'USDC',
      network: 'STELLAR',
      payment_method: 'BREB',
      target_currency: 'COP',
    });
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe('test-api-key');
  });

  it('maps createTransaction request/response between camelCase and Abroad snake_case', async () => {
    const fetchSpy = mockFetchResponse(200, {
      id: 'tx-1',
      transaction_reference: 'ref-1',
      kycLink: null,
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await provider.createTransaction({
      quoteId: 'q-1',
      userId: 'user-1',
      accountNumber: '3001234567',
    });

    expect(result).toEqual({ id: 'tx-1', transactionReference: 'ref-1', kycLink: null });

    const [, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      quote_id: 'q-1',
      user_id: 'user-1',
      account_number: '3001234567',
    });
  });

  it('maps getTransaction response fields', async () => {
    global.fetch = mockFetchResponse(200, {
      id: 'tx-1',
      status: 'PROCESSING_PAYMENT',
      transaction_reference: 'ref-1',
      on_chain_tx_hash: 'hash-1',
      kycLink: null,
      user_id: 'user-1',
    }) as unknown as typeof fetch;

    const result = await provider.getTransaction('tx-1');

    expect(result).toEqual({
      id: 'tx-1',
      status: 'PROCESSING_PAYMENT',
      transactionReference: 'ref-1',
      onChainTxHash: 'hash-1',
      kycLink: null,
      userId: 'user-1',
    });
  });

  it('throws CrossBorderProviderException on a non-2xx response', async () => {
    global.fetch = mockFetchResponse(400, {
      message: 'Invalid or expired quote',
    }) as unknown as typeof fetch;

    await expect(
      provider.createQuote({
        amount: 100,
        cryptoCurrency: 'USDC',
        network: 'STELLAR',
        paymentMethod: 'BREB',
        targetCurrency: 'COP',
      }),
    ).rejects.toBeInstanceOf(CrossBorderProviderException);
  });
});
