import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { SwapQuote, SwapQuoteRequest } from '@/src/domain/swap';
import { canSend, type WalletAccount, type WalletSigner } from '@/src/domain/wallet';
import { walletKeys, useActiveNetworkId } from '@/src/features/wallet/api/wallet-queries';
import { CavosRawSigner } from '@/src/services/api/cavos/cavos-raw-signer';
import {
  fetchSwapTransactionStatus,
  swapRouter,
  type SwapQuoteResult,
  type SwapTransactionStatus,
} from '@/src/services/api/swap';
import {
  LocalSigner,
  type WalletPinProvider,
} from '@/src/services/wallet/local-signer';

export const swapKeys = {
  all: ['swap'] as const,
  status: (hash: string) => [...swapKeys.all, 'status', hash] as const,
};

function createSigner(
  account: WalletAccount,
  pinProvider?: WalletPinProvider,
): WalletSigner {
  if (!canSend(account)) {
    throw new Error('This account cannot sign swap transactions');
  }

  if (account.custody === 'custodial') {
    return new CavosRawSigner(account.id, account.publicKey);
  }

  if (pinProvider === undefined) {
    throw new Error('Wallet PIN is required to sign this swap');
  }

  return new LocalSigner({ publicKey: account.publicKey, pinProvider });
}

export function useSwapQuotes() {
  return useMutation<SwapQuoteResult, Error, SwapQuoteRequest>({
    mutationFn: (request) => swapRouter.quote(request),
  });
}

export function useExecuteSwap() {
  const queryClient = useQueryClient();
  const networkId = useActiveNetworkId();

  return useMutation({
    mutationFn: async (input: {
      account: WalletAccount;
      quote: SwapQuote;
      pinProvider?: WalletPinProvider;
    }) => {
      const signer = createSigner(input.account, input.pinProvider);
      return swapRouter.execute(
        input.quote,
        input.account.publicKey,
        signer,
      );
    },
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({
        queryKey: walletKeys.balances(networkId, input.account.publicKey),
      });
      queryClient.invalidateQueries({
        queryKey: walletKeys.transactions(networkId, input.account.publicKey),
      });
    },
  });
}

export function useSwapTransactionStatus(hash: string | undefined) {
  return useQuery<SwapTransactionStatus, Error>({
    enabled: hash !== undefined,
    queryFn: () => fetchSwapTransactionStatus(hash!),
    queryKey: swapKeys.status(hash ?? 'none'),
    refetchInterval: (query) =>
      query.state.data === undefined || query.state.data === 'pending'
        ? 2_500
        : false,
  });
}
