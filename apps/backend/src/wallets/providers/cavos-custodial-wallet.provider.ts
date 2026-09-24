import 'fake-indexeddb/auto';
import '../../auth/providers/cavos-node-polyfill';

import {
  CavosStellar,
  generateRecoveryCode,
  LocalDeviceUnwrapKey,
  type WalletRegistry,
} from '@cavos/kit';
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

// Cavos's API names Stellar networks `stellar-testnet` / `stellar-mainnet`; the bare
// `testnet` / `mainnet` values (still what CAVOS_NETWORK holds) are rejected.
const STELLAR_NETWORK = {
  testnet: 'stellar-testnet',
  mainnet: 'stellar-mainnet',
} as const;

/**
 * Wallet registry backed by Geko's own `wallets` row instead of Cavos's hosted one.
 *
 * `@cavos/kit` >= 0.1 resolves the address through `HttpWalletRegistry`, which needs a
 * Cavos end-user login token. The backend never holds one (identity.userId is Geko's
 * internal user id, not a Cavos subject), and Geko's database is already the source of
 * truth for which address belongs to which user — so the registry is just that address.
 */
class GekoWalletRegistry implements WalletRegistry {
  constructor(private readonly address: string | null) {}

  async lookup(): Promise<{ address: string } | null> {
    return this.address ? { address: this.address } : null;
  }

  async register(params: {
    address: string;
  }): Promise<{ address: string; conflict: boolean }> {
    if (this.address) {
      return {
        address: this.address,
        conflict: this.address !== params.address,
      };
    }
    return { address: params.address, conflict: false };
  }
}

/**
 * `CavosStellar` is lazy-deploy since @cavos/kit 0.1: connect never creates the account,
 * the first `execute()` payment does. Geko needs the account (and its recovery signer)
 * on-chain right after provisioning — the control key lives only in this process's
 * in-memory IndexedDB, so an account left undeployed would be unrecoverable after a
 * restart. The SDK exposes no public create-only call, so reach its internal one; the
 * dependency is pinned to an exact version because of this.
 */
type StellarAccountCreator = { _createAccount?: () => Promise<unknown> };

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
    // (not via connectStellarWallet). Recovery-code setup and the on-chain account
    // creation happen in finalizeProvisioning once a wallet.id exists.
    const wallet = await this.connect(input.userId, null);

    return {
      publicAddress: wallet.address,
      // `undeployed` is transient here: finalizeProvisioning creates the account in
      // the same request.
      status:
        wallet.status === 'undeployed'
          ? 'ready'
          : this.mapWalletStatus(wallet.status),
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
    const connected = await this.connect(wallet.userId, wallet.publicAddress);

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
  ): Promise<{ wallet: CavosStellar; freshRecoveryCode?: string }> {
    const connected = await this.connect(wallet.userId, wallet.publicAddress);

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
      // On an undeployed account this only queues the recovery signer; deploy()
      // below writes it on-chain together with the account.
      await connected.setupRecovery(code);
      await this.deploy(connected);
      await this.walletSecretsService.saveRecoveryCode(wallet.id, code);
      await this.walletsRepository.updateCustodialRecoverySetAt(
        wallet.id,
        new Date(),
      );
      return {
        wallet: connected,
        freshRecoveryCode: code,
      };
    }

    await this.deploy(connected);
    return { wallet: connected };
  }

  /**
   * identity.userId is always Geko's internal user id — see connectStellarWallet.
   * `knownAddress` is the wallets row's address, or null before the row exists.
   */
  private async connect(
    userId: string,
    knownAddress: string | null,
  ): Promise<CavosStellar> {
    return CavosStellar.connect({
      appId: this.appId,
      appSalt: this.appSalt,
      identity: { userId },
      network: STELLAR_NETWORK[this.network],
      registry: new GekoWalletRegistry(knownAddress),
      // Only read on Cavos's enclave/passkey (MasterDEK) path, which this backend
      // does not use; the classic control-key path ignores it.
      deviceKey: LocalDeviceUnwrapKey.generate(),
    });
  }

  private async deploy(connected: CavosStellar): Promise<void> {
    if (connected.status !== 'undeployed') {
      return;
    }

    const creator = connected as unknown as StellarAccountCreator;
    if (typeof creator._createAccount !== 'function') {
      throw new Error(
        'Installed @cavos/kit no longer exposes CavosStellar._createAccount; ' +
          're-check the eager-deploy path in CavosCustodialWalletProvider.',
      );
    }

    await creator._createAccount.call(connected);
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
