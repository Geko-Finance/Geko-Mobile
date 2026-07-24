import { Injectable } from '@nestjs/common';
import { CavosCustodialWalletProvider } from './providers/cavos-custodial-wallet.provider';
import { NonCustodialWalletProvider } from './providers/non-custodial-wallet.provider';
import type { WalletProvider } from './providers/wallet-provider.interface';

@Injectable()
export class WalletProviderRegistry {
  private readonly providers: Map<
    WalletProvider['custodyType'],
    WalletProvider
  >;

  constructor(
    cavosCustodialWalletProvider: CavosCustodialWalletProvider,
    nonCustodialWalletProvider: NonCustodialWalletProvider,
  ) {
    this.providers = new Map<WalletProvider['custodyType'], WalletProvider>([
      [cavosCustodialWalletProvider.custodyType, cavosCustodialWalletProvider],
      [nonCustodialWalletProvider.custodyType, nonCustodialWalletProvider],
    ]);
  }

  get(custodyType: WalletProvider['custodyType']): WalletProvider {
    const provider = this.providers.get(custodyType);

    if (!provider) {
      throw new Error(`No wallet provider registered for ${custodyType}`);
    }

    return provider;
  }
}
