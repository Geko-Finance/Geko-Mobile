import { Module } from '@nestjs/common';
import { CavosCustodialWalletProvider } from './providers/cavos-custodial-wallet.provider';
import { NonCustodialWalletProvider } from './providers/non-custodial-wallet.provider';
import { EncryptedDbSecretsStore } from './secrets/encrypted-db-secrets-store';
import { SECRETS_STORE } from './secrets/secrets-store.interface';
import { WalletSecretsService } from './secrets/wallet-secrets.service';
import { WalletProviderRegistry } from './wallet-provider.registry';
import { WalletsController } from './wallets.controller';
import { WalletsRepository } from './wallets.repository';
import { WalletsService } from './wallets.service';

@Module({
  controllers: [WalletsController],
  providers: [
    WalletsRepository,
    WalletsService,
    {
      provide: SECRETS_STORE,
      useClass: EncryptedDbSecretsStore,
    },
    WalletSecretsService,
    CavosCustodialWalletProvider,
    NonCustodialWalletProvider,
    WalletProviderRegistry,
  ],
  exports: [WalletsRepository, WalletsService],
})
export class WalletsModule {}
