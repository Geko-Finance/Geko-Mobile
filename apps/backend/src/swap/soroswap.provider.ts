import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type StellarNetwork = 'testnet' | 'mainnet';

@Injectable()
export class SoroswapProvider {
  private static readonly DEFAULT_BASE_URL = 'https://api.soroswap.finance';
  private static readonly REQUEST_TIMEOUT_MS = 30_000;

  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    this.apiKey = configService.get<string>('SOROSWAP_API_KEY');
    this.baseUrl =
      configService.get<string>('SOROSWAP_API_URL') ??
      SoroswapProvider.DEFAULT_BASE_URL;
  }

  quote(body: Record<string, unknown>, network: StellarNetwork) {
    return this.request('/quote', network, body);
  }

  build(body: Record<string, unknown>, network: StellarNetwork) {
    return this.request('/quote/build', network, body);
  }

  send(body: Record<string, unknown>, network: StellarNetwork) {
    return this.request('/send', network, body);
  }

  private async request(
    path: string,
    network: StellarNetwork,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    if (typeof this.apiKey !== 'string' || this.apiKey.trim().length === 0) {
      throw new ServiceUnavailableException(
        'Soroswap aggregator is not configured',
      );
    }

    const url = new URL(path, this.baseUrl);
    url.searchParams.set('network', network);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      SoroswapProvider.REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const responseBody: unknown = await response
        .json()
        .catch(() => undefined);

      if (!response.ok) {
        throw new BadGatewayException(
          `Soroswap request failed with status ${response.status}`,
        );
      }

      return responseBody;
    } catch (error) {
      if (
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      throw new BadGatewayException('Soroswap request failed');
    } finally {
      clearTimeout(timeout);
    }
  }
}
