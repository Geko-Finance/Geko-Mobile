import 'fake-indexeddb/auto';
import '../../auth/providers/cavos-node-polyfill';

import { Cavos, generateRecoveryCode } from '@cavos/kit';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WalletNeedsDeviceApprovalException } from '../exceptions/wallet-needs-device-approval.exception';
import { WalletSecretsService } from '../secrets/wallet-secrets.service';
import {
  type WalletRecord,
  WalletsRepository,
} from '../wallets.repository';
import type {
  ProvisionedWallet,
  ProvisionWalletInput,
  SigningCapableWalletProvider,
  WalletBalance,
} from './wallet-provider.interface';

type CavosNetwork = 'testnet' | 'mainnet';

type StellarWallet = Awaited<ReturnType<typeof Cavos.connect>> & {
  chain: 'stellar';
};

@Injectable()
export class CavosCustodialWalletProvider
  implements SigningCapableWalletProvider
{
  readonly custodyType = 'cavos_custodial' as const;

  private readonly appId: string;
  private readonly appSalt: string;
  private readonly network: CavosNetwork;

  constructor(
    private readonly configService: ConfigService,
    private readonly walletSecretsService: WalletSecretsService,
    private readonly walletsRepository: WalletsRepository,
  ) {
    const appId = this.configService.get<string>('CAVOS_APP_ID');
    const appSalt = this.configService.get<string>('CAVOS_APP_SALT');
    const network = this.configService.get<string>('CAVOS_NETWORK');

    if (!appId || appId.trim().length === 0) {
      throw new Error('Fatal: CAVOS_APP_ID is required.');
    }

    if (!appSalt || appSalt.trim().length === 0) {
      throw new Error('Fatal: CAVOS_APP_SALT is required.');
    }

    if (network !== 'testnet' && network !== 'mainnet') {
      throw new Error(
        'Fatal: CAVOS_NETWORK must be "testnet" or "mainnet".',
      );
    }

    this.appId = appId;
    this.appSalt = appSalt;
    this.network = network;
  }

  async provisionWallet(input: ProvisionWalletInput): Promise<ProvisionedWallet> {
    if (input.custodyType !== 'cavos_custodial') {
      throw new Error(
        'CavosCustodialWalletProvider only provisions cavos_custodial wallets',
      );
    }

    // Initial creation — no wallets row / wallet.id yet, so connect directly
    // (not via connectStellarWallet). Recovery-code setup happens in
    // finalizeProvisioning once a wallet.id exists.
    const wallet = await Cavos.connect({
      appId: this.appId,
      appSalt: this.appSalt,
      chain: 'stellar',
      identity: { userId: input.userId },
      network: this.network,
    });

    if (wallet.chain !== 'stellar') {
      throw new Error(
        'Expected Stellar wallet from Cavos.connect with chain: stellar',
      );
    }

    return {
      publicAddress: wallet.address,
      status: this.mapWalletStatus(wallet.status),
      providerDetails: {
        cavosUserId: input.userId,
        network: this.network,
        recoveryCodeSetAt: null,
      },
    };
  }

  async finalizeProvisioning(
    wallet: WalletRecord,
  ): Promise<{ revealOnce?: Record<string, string> } | void> {
    const { freshRecoveryCode } = await this.connectStellarWallet(wallet);
    // Reveal the plaintext recovery code exactly once at creation. It is stored
    // encrypted only; the backend has no re-fetchable plaintext form (unlike the
    // retired apps/server GET /api/cavos/recovery-code flow). Never log this.
    if (freshRecoveryCode) {
      return { revealOnce: { recoveryCode: freshRecoveryCode } };
    }
  }

  async getBalance(wallet: WalletRecord): Promise<WalletBalance> {
    const { wallet: connected } = await this.connectStellarWallet(wallet);
    const stroops = await connected.balance();
    return { stroops: stroops.toString() };
  }

  async execute(
    wallet: WalletRecord,
    params: { amountStroops: string; destination: string },
  ): Promise<{ hash: string }> {
    const { wallet: connected } = await this.connectStellarWallet(wallet);
    const hash = await connected.execute(
      BigInt(params.amountStroops),
      params.destination,
    );
    return { hash };
  }

  async sign(
    wallet: WalletRecord,
    unsignedXdr: string,
  ): Promise<{ signedXdr: string }> {
    const { wallet: connected } = await this.connectStellarWallet(wallet);
    const signedXdr = await connected.signXdr(unsignedXdr);
    return { signedXdr };
  }

  async addTrustline(
    wallet: WalletRecord,
    params: { code: string; issuer: string },
  ): Promise<{ hash: string }> {
    const { wallet: connected } = await this.connectStellarWallet(wallet);
    // Cavos relayer rejects sponsored ChangeTrust for this app tier; account pays its own reserve/fee.
    const hash = await connected.addTrustline(
      { code: params.code, issuer: params.issuer },
      { sponsored: false },
    );
    return { hash };
  }

  async recoverDevice(
    wallet: WalletRecord,
    recoveryCode: string,
  ): Promise<{ status: 'ready' }> {
    const connected = await Cavos.connect({
      appId: this.appId,
      appSalt: this.appSalt,
      chain: 'stellar',
      identity: { userId: wallet.userId },
      network: this.network,
    });

    if (connected.chain !== 'stellar') {
      throw new Error(
        'Expected Stellar wallet from Cavos.connect with chain: stellar',
      );
    }

    if (connected.status === 'needs-device-approval') {
      // Explicit new-device recovery: use the user-supplied code, not the stored one.
      await connected.approveThisDeviceWithRecovery(recoveryCode);
    }

    await this.walletSecretsService.saveRecoveryCode(wallet.id, recoveryCode);
    await this.walletsRepository.updateCustodialRecoverySetAt(
      wallet.id,
      new Date(),
    );

    return { status: 'ready' };
  }

  /**
   * Connects (or reconnects) the Cavos Stellar wallet for an existing wallets row.
   *
   * identity.userId is always Geko's internal user id (`wallet.userId`) — never
   * anything derived from Cavos auth. Cavos derives the wallet deterministically
   * from (appSalt, identity.userId), so each Geko user has at most one Cavos
   * custodial wallet.
   *
   * When a recovery code is generated for the first time, `freshRecoveryCode` is
   * returned so the caller can reveal it once — never store it for re-fetch and
   * never log it.
   */
  private async connectStellarWallet(
    wallet: WalletRecord,
  ): Promise<{ wallet: StellarWallet; freshRecoveryCode?: string }> {
    const connected = await Cavos.connect({
      appId: this.appId,
      appSalt: this.appSalt,
      chain: 'stellar',
      identity: { userId: wallet.userId },
      network: this.network,
    });

    if (connected.chain !== 'stellar') {
      throw new Error(
        'Expected Stellar wallet from Cavos.connect with chain: stellar',
      );
    }

    if (connected.status === 'needs-device-approval') {
      const code = await this.walletSecretsService.getRecoveryCode(wallet.id);

      if (code) {
        // SDK flips statusValue to 'ready' at runtime; the getter type is
        // not mutable, so re-check via isReady() rather than `.status`.
        await connected.approveThisDeviceWithRecovery(code);
      }

      if (!(await connected.isReady())) {
        throw new WalletNeedsDeviceApprovalException();
      }
    }

    const existingCode = await this.walletSecretsService.getRecoveryCode(
      wallet.id,
    );

    if (!existingCode) {
      const code = generateRecoveryCode();
      await connected.setupRecovery(code);
      await this.walletSecretsService.saveRecoveryCode(wallet.id, code);
      await this.walletsRepository.updateCustodialRecoverySetAt(
        wallet.id,
        new Date(),
      );
      return {
        wallet: connected as StellarWallet,
        freshRecoveryCode: code,
      };
    }

    return { wallet: connected as StellarWallet };
  }

  private mapWalletStatus(
    status: string,
  ): ProvisionedWallet['status'] {
    if (status === 'ready') {
      return 'ready';
    }

    if (status === 'needs-device-approval') {
      return 'needs_device_approval';
    }

    return 'pending';
  }
}
