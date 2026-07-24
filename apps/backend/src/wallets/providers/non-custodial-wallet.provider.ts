import { Horizon, NotFoundError, StrKey } from '@stellar/stellar-sdk';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WalletRecord } from '../wallets.repository';
import type {
  ProvisionedWallet,
  ProvisionWalletInput,
  WalletBalance,
  WalletProvider,
} from './wallet-provider.interface';

type StellarNetwork = 'testnet' | 'mainnet';

const HORIZON_URLS: Record<StellarNetwork, string> = {
  testnet: 'https://horizon-testnet.stellar.org',
  mainnet: 'https://horizon.stellar.org',
};

function xlmToStroops(xlm: string): string {
  const [whole = '0', fraction = ''] = xlm.split('.');
  const paddedFraction = fraction.padEnd(7, '0').slice(0, 7);
  return (BigInt(whole) * 10_000_000n + BigInt(paddedFraction)).toString();
}

/**
 * Non-custodial wallets deliberately do NOT implement SigningCapableWalletProvider.
 * The private key never touches the backend — there is no server-side signing surface.
 */
@Injectable()
export class NonCustodialWalletProvider implements WalletProvider {
  readonly custodyType = 'non_custodial' as const;

  private readonly horizonServer: Horizon.Server;

  constructor(private readonly configService: ConfigService) {
    const network = this.configService.get<string>('CAVOS_NETWORK');

    if (network !== 'testnet' && network !== 'mainnet') {
      throw new Error(
        'Fatal: CAVOS_NETWORK must be "testnet" or "mainnet".',
      );
    }

    this.horizonServer = new Horizon.Server(HORIZON_URLS[network]);
  }

  async provisionWallet(input: ProvisionWalletInput): Promise<ProvisionedWallet> {
    if (input.custodyType !== 'non_custodial') {
      throw new Error(
        'NonCustodialWalletProvider only provisions non_custodial wallets',
      );
    }

    if (!StrKey.isValidEd25519PublicKey(input.publicKey)) {
      throw new BadRequestException(
        'publicKey must be a valid Stellar Ed25519 public key',
      );
    }

    return {
      publicAddress: input.publicKey,
      status: 'ready',
      providerDetails: {
        backupConfirmedAt: null,
      },
    };
  }

  async getBalance(wallet: WalletRecord): Promise<WalletBalance> {
    try {
      const account = await this.horizonServer.loadAccount(
        wallet.publicAddress,
      );
      const nativeBalance = account.balances.find(
        (balance) => balance.asset_type === 'native',
      );

      if (!nativeBalance || nativeBalance.asset_type !== 'native') {
        return { stroops: '0' };
      }

      return { stroops: xlmToStroops(nativeBalance.balance) };
    } catch (error) {
      if (this.isAccountNotFoundError(error)) {
        return { stroops: '0' };
      }

      throw error;
    }
  }

  private isAccountNotFoundError(error: unknown): boolean {
    if (error instanceof NotFoundError) {
      return true;
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as { response?: { status?: unknown } }).response
        ?.status === 'number'
    ) {
      return (error as { response: { status: number } }).response.status === 404;
    }

    return false;
  }
}
