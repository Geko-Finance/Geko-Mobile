import { appConfig } from '@/src/config/env';
import { getActiveStellarNetwork } from '@/src/services/api/stellar/stellar-config';

export type SwapTransactionStatus = 'pending' | 'confirmed' | 'failed';

export async function fetchSwapTransactionStatus(
  hash: string,
): Promise<SwapTransactionStatus> {
  const { horizonUrl } = getActiveStellarNetwork();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appConfig.requestTimeoutMs);

  try {
    const response = await fetch(
      `${horizonUrl}/transactions/${encodeURIComponent(hash)}`,
      { signal: controller.signal },
    );

    if (response.status === 404) {
      return 'pending';
    }

    if (!response.ok) {
      return 'failed';
    }

    const body = (await response.json()) as { successful?: boolean };
    return body.successful === false ? 'failed' : 'confirmed';
  } finally {
    clearTimeout(timeout);
  }
}
