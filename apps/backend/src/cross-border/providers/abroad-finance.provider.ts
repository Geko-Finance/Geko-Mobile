import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrossBorderProviderException } from '../exceptions/cross-border-provider.exception';
import { CrossBorderUnavailableException } from '../exceptions/cross-border-unavailable.exception';

type CrossBorderCryptoCurrency = 'USDC';
type CrossBorderNetwork = 'STELLAR' | 'SOLANA' | 'CELO';
type CrossBorderPaymentMethod = 'BREB' | 'PIX';
type CrossBorderTargetCurrency = 'COP' | 'BRL';

export interface CreateQuoteParams {
  amount: number;
  cryptoCurrency: CrossBorderCryptoCurrency;
  network: CrossBorderNetwork;
  paymentMethod: CrossBorderPaymentMethod;
  targetCurrency: CrossBorderTargetCurrency;
}

export interface CreateReverseQuoteParams {
  sourceAmount: number;
  cryptoCurrency: CrossBorderCryptoCurrency;
  network: CrossBorderNetwork;
  paymentMethod: CrossBorderPaymentMethod;
  targetCurrency: CrossBorderTargetCurrency;
}

export interface AbroadQuote {
  quoteId: string;
  expirationTime: number;
  value: number;
}

export interface CreateTransactionParams {
  quoteId: string;
  /** Our internal user id - sent to Abroad as `user_id`, never client-supplied. */
  userId: string;
  accountNumber: string;
  bankCode?: string;
  taxId?: string;
  redirectUrl?: string;
  qrCode?: string;
}

export interface AbroadTransaction {
  id: string;
  transactionReference: string;
  kycLink: string | null;
}

export interface AbroadTransactionStatus {
  id: string;
  status: string;
  transactionReference: string;
  onChainTxHash: string | null;
  kycLink: string | null;
  userId: string;
}

/**
 * Thin REST client for Abroad Finance (docs.abroad.finance) - no official SDK exists, this is
 * a plain fetch-based wrapper, following CavosCustodialWalletProvider's shape of "wrap an
 * external API behind domain-shaped (camelCase) methods, never leak the wire format".
 *
 * UNLIKE every other provider in this codebase, this one must NEVER throw in its constructor:
 * `ABROAD_API_KEY` is not configured yet (Abroad hasn't granted access - see the epic ticket),
 * and Nest instantiates providers eagerly at boot, so a constructor throw here would crash
 * Cavos wallets, auth, everything else. Instead, `enabled` is false until the key is set, and
 * every public method calls `assertEnabled()` first, throwing `CrossBorderUnavailableException`
 * (503) instead of attempting a network call.
 */
@Injectable()
export class AbroadFinanceProvider {
  private static readonly BASE_URL = 'https://api.abroad.finance';
  private static readonly REQUEST_TIMEOUT_MS = 10_000;

  private readonly enabled: boolean;
  private readonly apiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ABROAD_API_KEY');

    this.enabled = typeof apiKey === 'string' && apiKey.trim().length > 0;
    this.apiKey = apiKey;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async createQuote(params: CreateQuoteParams): Promise<AbroadQuote> {
    this.assertEnabled();

    const body = await this.request<{
      quote_id: string;
      expiration_time: number;
      value: number;
    }>('POST', '/quote', {
      amount: params.amount,
      crypto_currency: params.cryptoCurrency,
      network: params.network,
      payment_method: params.paymentMethod,
      target_currency: params.targetCurrency,
    });

    return {
      quoteId: body.quote_id,
      expirationTime: body.expiration_time,
      value: body.value,
    };
  }

  async createReverseQuote(params: CreateReverseQuoteParams): Promise<AbroadQuote> {
    this.assertEnabled();

    const body = await this.request<{
      quote_id: string;
      expiration_time: number;
      value: number;
    }>('POST', '/quote/reverse', {
      source_amount: params.sourceAmount,
      crypto_currency: params.cryptoCurrency,
      network: params.network,
      payment_method: params.paymentMethod,
      target_currency: params.targetCurrency,
    });

    return {
      quoteId: body.quote_id,
      expirationTime: body.expiration_time,
      value: body.value,
    };
  }

  async createTransaction(params: CreateTransactionParams): Promise<AbroadTransaction> {
    this.assertEnabled();

    const body = await this.request<{
      id: string;
      transaction_reference: string;
      kycLink: string | null;
    }>('POST', '/transaction', {
      quote_id: params.quoteId,
      user_id: params.userId,
      account_number: params.accountNumber,
      bank_code: params.bankCode ?? null,
      tax_id: params.taxId ?? null,
      redirectUrl: params.redirectUrl ?? null,
      qr_code: params.qrCode ?? null,
    });

    return {
      id: body.id,
      transactionReference: body.transaction_reference,
      kycLink: body.kycLink,
    };
  }

  async getTransaction(abroadTransactionId: string): Promise<AbroadTransactionStatus> {
    this.assertEnabled();

    const body = await this.request<{
      id: string;
      status: string;
      transaction_reference: string;
      on_chain_tx_hash: string | null;
      kycLink: string | null;
      user_id: string;
    }>('GET', `/transaction/${encodeURIComponent(abroadTransactionId)}`);

    return {
      id: body.id,
      status: body.status,
      transactionReference: body.transaction_reference,
      onChainTxHash: body.on_chain_tx_hash,
      kycLink: body.kycLink,
      userId: body.user_id,
    };
  }

  async listBanks(paymentMethod: CrossBorderPaymentMethod): Promise<unknown> {
    this.assertEnabled();

    return this.request('GET', '/payments/banks', undefined, {
      payment_method: paymentMethod,
    });
  }

  async getLiquidity(paymentMethod: CrossBorderPaymentMethod): Promise<unknown> {
    this.assertEnabled();

    return this.request('GET', '/payments/liquidity', undefined, {
      payment_method: paymentMethod,
    });
  }

  private assertEnabled(): void {
    if (!this.enabled) {
      throw new CrossBorderUnavailableException();
    }
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(path, AbroadFinanceProvider.BASE_URL);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      AbroadFinanceProvider.REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey as string,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const json: unknown = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new CrossBorderProviderException(response.status, json);
      }

      return json as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
