import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { ExecuteWalletDto } from './dto/execute-wallet.dto';
import { RecoverDeviceDto } from './dto/recover-device.dto';
import { SignWalletDto } from './dto/sign-wallet.dto';
import { TrustlineDto } from './dto/trustline.dto';
import { UnsupportedWalletOperationException } from './exceptions/unsupported-wallet-operation.exception';
import { WalletNotFoundException } from './exceptions/wallet-not-found.exception';
import { WalletOwnershipException } from './exceptions/wallet-ownership.exception';
import {
  isSigningCapable,
  type ProvisionWalletInput,
  type WalletBalance,
} from './providers/wallet-provider.interface';
import { WalletProviderRegistry } from './wallet-provider.registry';
import {
  type WalletRecord,
  WalletsRepository,
} from './wallets.repository';

@Injectable()
export class WalletsService {
  constructor(
    private readonly walletsRepository: WalletsRepository,
    private readonly walletProviderRegistry: WalletProviderRegistry,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createWallet(
    userId: string,
    dto: CreateWalletDto,
  ): Promise<{ wallet: WalletRecord; revealOnce?: Record<string, string> }> {
    const provider = this.walletProviderRegistry.get(dto.custodyType);

    const input: ProvisionWalletInput =
      dto.custodyType === 'non_custodial'
        ? {
            custodyType: 'non_custodial',
            userId,
            label: dto.label,
            publicKey: dto.publicKey!,
          }
        : {
            custodyType: 'cavos_custodial',
            userId,
            label: dto.label,
          };

    const provisioned = await provider.provisionWallet(input);

    const existing = await this.walletsRepository.findAllForUser(userId);
    const isPrimary = existing.length === 0;

    const wallet = await this.walletsRepository.create({
      userId,
      custodyType: dto.custodyType,
      publicAddress: provisioned.publicAddress,
      status: provisioned.status,
      isPrimary,
      label: dto.label,
    });

    if (dto.custodyType === 'cavos_custodial') {
      await this.walletsRepository.createCustodialDetails(wallet.id, {
        cavosUserId: String(provisioned.providerDetails.cavosUserId),
        network: provisioned.providerDetails.network as 'testnet' | 'mainnet',
        recoveryCodeSetAt:
          (provisioned.providerDetails.recoveryCodeSetAt as Date | null) ??
          null,
      });
    } else {
      await this.walletsRepository.createNonCustodialDetails(wallet.id, {
        backupConfirmedAt:
          (provisioned.providerDetails.backupConfirmedAt as Date | null) ??
          null,
      });
    }

    // revealOnce (e.g. recoveryCode) must never be persisted or logged — only
    // flows through this one create response; the backend cannot return it again.
    const finalizeResult = await provider.finalizeProvisioning?.(wallet);
    const revealOnce = finalizeResult?.revealOnce;

    this.eventEmitter.emit('wallet.created', {
      userId,
      walletId: wallet.id,
      custodyType: wallet.custodyType,
    });

    if (wallet.status === 'needs_device_approval') {
      this.eventEmitter.emit('wallet.needs_device_approval', {
        userId,
        walletId: wallet.id,
      });
    }

    return revealOnce ? { wallet, revealOnce } : { wallet };
  }

  async listWallets(userId: string): Promise<WalletRecord[]> {
    return this.walletsRepository.findAllForUser(userId);
  }

  async getWallet(userId: string, walletId: string): Promise<WalletRecord> {
    return this.requireOwnedWallet(userId, walletId);
  }

  async setPrimary(userId: string, walletId: string): Promise<WalletRecord> {
    await this.requireOwnedWallet(userId, walletId);
    await this.walletsRepository.setPrimary(userId, walletId);

    const wallet = await this.walletsRepository.findById(walletId);
    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    return wallet;
  }

  async getBalance(
    userId: string,
    walletId: string,
  ): Promise<WalletBalance> {
    const wallet = await this.requireOwnedWallet(userId, walletId);
    const provider = this.walletProviderRegistry.get(wallet.custodyType);
    return provider.getBalance(wallet);
  }

  async execute(
    userId: string,
    walletId: string,
    dto: ExecuteWalletDto,
  ): Promise<{ hash: string }> {
    const wallet = await this.requireOwnedWallet(userId, walletId);
    const provider = this.requireSigningCapable(wallet.custodyType, 'execute');
    const result = await provider.execute(wallet, {
      amountStroops: dto.amountStroops,
      destination: dto.destination,
    });

    this.eventEmitter.emit('wallet.tx.executed', {
      userId,
      walletId,
      amountStroops: dto.amountStroops,
      destination: dto.destination,
    });

    return result;
  }

  async sign(
    userId: string,
    walletId: string,
    dto: SignWalletDto,
  ): Promise<{ signedXdr: string }> {
    const wallet = await this.requireOwnedWallet(userId, walletId);
    const provider = this.requireSigningCapable(wallet.custodyType, 'sign');
    return provider.sign(wallet, dto.unsignedXdr);
  }

  async addTrustline(
    userId: string,
    walletId: string,
    dto: TrustlineDto,
  ): Promise<{ hash: string }> {
    const wallet = await this.requireOwnedWallet(userId, walletId);
    const provider = this.requireSigningCapable(
      wallet.custodyType,
      'addTrustline',
    );
    return provider.addTrustline(wallet, {
      code: dto.code,
      issuer: dto.issuer,
    });
  }

  async recoverDevice(
    userId: string,
    walletId: string,
    dto: RecoverDeviceDto,
  ): Promise<{ status: 'ready' }> {
    const wallet = await this.requireOwnedWallet(userId, walletId);
    const provider = this.requireSigningCapable(
      wallet.custodyType,
      'recoverDevice',
    );
    return provider.recoverDevice(wallet, dto.recoveryCode);
  }

  private async requireOwnedWallet(
    userId: string,
    walletId: string,
  ): Promise<WalletRecord> {
    const wallet = await this.walletsRepository.findById(walletId);

    if (!wallet) {
      throw new WalletNotFoundException(walletId);
    }

    if (wallet.userId !== userId) {
      throw new WalletOwnershipException(walletId);
    }

    return wallet;
  }

  private requireSigningCapable(
    custodyType: WalletRecord['custodyType'],
    operation: string,
  ) {
    const provider = this.walletProviderRegistry.get(custodyType);

    if (!isSigningCapable(provider)) {
      throw new UnsupportedWalletOperationException(operation);
    }

    return provider;
  }
}
