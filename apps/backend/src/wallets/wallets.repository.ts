import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../database/database.module';
import {
  custodialWalletDetails,
  nonCustodialWalletDetails,
  wallets,
} from '../db/schema';

export type WalletRecord = typeof wallets.$inferSelect;
export type CustodialWalletDetailsRecord =
  typeof custodialWalletDetails.$inferSelect;
export type NonCustodialWalletDetailsRecord =
  typeof nonCustodialWalletDetails.$inferSelect;

@Injectable()
export class WalletsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(data: {
    userId: string;
    custodyType: WalletRecord['custodyType'];
    publicAddress: string;
    status: WalletRecord['status'];
    isPrimary: boolean;
    label?: string;
  }): Promise<WalletRecord> {
    const [wallet] = await this.db
      .insert(wallets)
      .values({
        userId: data.userId,
        custodyType: data.custodyType,
        publicAddress: data.publicAddress,
        status: data.status,
        isPrimary: data.isPrimary,
        label: data.label,
      })
      .returning();

    return wallet;
  }

  async createCustodialDetails(
    walletId: string,
    data: {
      cavosUserId: string;
      network: CustodialWalletDetailsRecord['network'];
      recoveryCodeSetAt?: Date | null;
    },
  ): Promise<CustodialWalletDetailsRecord> {
    const [details] = await this.db
      .insert(custodialWalletDetails)
      .values({
        walletId,
        cavosUserId: data.cavosUserId,
        network: data.network,
        recoveryCodeSetAt: data.recoveryCodeSetAt ?? null,
      })
      .returning();

    return details;
  }

  async createNonCustodialDetails(
    walletId: string,
    data: {
      backupConfirmedAt?: Date | null;
    },
  ): Promise<NonCustodialWalletDetailsRecord> {
    const [details] = await this.db
      .insert(nonCustodialWalletDetails)
      .values({
        walletId,
        backupConfirmedAt: data.backupConfirmedAt ?? null,
      })
      .returning();

    return details;
  }

  async findById(id: string): Promise<WalletRecord | null> {
    const [wallet] = await this.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, id))
      .limit(1);

    return wallet ?? null;
  }

  async findAllForUser(userId: string): Promise<WalletRecord[]> {
    return this.db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId));
  }

  async setPrimary(userId: string, walletId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({ isPrimary: false })
        .where(
          and(eq(wallets.userId, userId), eq(wallets.isPrimary, true)),
        );

      await tx
        .update(wallets)
        .set({ isPrimary: true })
        .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId)));
    });
  }

  async updateCustodialRecoverySetAt(
    walletId: string,
    date: Date,
  ): Promise<void> {
    await this.db
      .update(custodialWalletDetails)
      .set({ recoveryCodeSetAt: date })
      .where(eq(custodialWalletDetails.walletId, walletId));
  }
}
