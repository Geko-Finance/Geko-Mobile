import { Inject, Injectable } from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../database/database.module';
import { crossBorderTransactions } from '../db/schema';

export type CrossBorderTransactionRecord =
  typeof crossBorderTransactions.$inferSelect;

@Injectable()
export class CrossBorderRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(data: {
    userId: string;
    walletId?: string | null;
    abroadTransactionId: string;
    quoteId: string;
    transactionReference: string;
    network: CrossBorderTransactionRecord['network'];
    paymentMethod: CrossBorderTransactionRecord['paymentMethod'];
    targetCurrency: CrossBorderTransactionRecord['targetCurrency'];
    accountNumber: string;
    bankCode?: string | null;
    taxId?: string | null;
    kycLink?: string | null;
  }): Promise<CrossBorderTransactionRecord> {
    const [row] = await this.db
      .insert(crossBorderTransactions)
      .values({
        userId: data.userId,
        walletId: data.walletId ?? null,
        abroadTransactionId: data.abroadTransactionId,
        quoteId: data.quoteId,
        transactionReference: data.transactionReference,
        network: data.network,
        paymentMethod: data.paymentMethod,
        targetCurrency: data.targetCurrency,
        accountNumber: data.accountNumber,
        bankCode: data.bankCode ?? null,
        taxId: data.taxId ?? null,
        kycLink: data.kycLink ?? null,
      })
      .returning();

    return row;
  }

  async findById(id: string): Promise<CrossBorderTransactionRecord | null> {
    const [row] = await this.db
      .select()
      .from(crossBorderTransactions)
      .where(eq(crossBorderTransactions.id, id))
      .limit(1);

    return row ?? null;
  }

  async findByAbroadTransactionId(
    abroadTransactionId: string,
  ): Promise<CrossBorderTransactionRecord | null> {
    const [row] = await this.db
      .select()
      .from(crossBorderTransactions)
      .where(eq(crossBorderTransactions.abroadTransactionId, abroadTransactionId))
      .limit(1);

    return row ?? null;
  }

  async listForUser(
    userId: string,
    params: { page: number; pageSize: number },
  ): Promise<{ transactions: CrossBorderTransactionRecord[]; total: number }> {
    const offset = (params.page - 1) * params.pageSize;

    const [transactions, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(crossBorderTransactions)
        .where(eq(crossBorderTransactions.userId, userId))
        .orderBy(desc(crossBorderTransactions.createdAt))
        .limit(params.pageSize)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(crossBorderTransactions)
        .where(eq(crossBorderTransactions.userId, userId)),
    ]);

    return { transactions, total };
  }

  async updateFromLiveRefresh(
    id: string,
    data: {
      status: CrossBorderTransactionRecord['status'];
      onChainTxHash?: string | null;
      kycLink?: string | null;
    },
  ): Promise<void> {
    await this.db
      .update(crossBorderTransactions)
      .set({
        status: data.status,
        onChainTxHash: data.onChainTxHash,
        kycLink: data.kycLink,
        updatedAt: new Date(),
      })
      .where(eq(crossBorderTransactions.id, id));
  }

  /**
   * Idempotent update keyed on Abroad's own transaction id, for the webhook receiver -
   * `transaction.created` may fire more than once per Abroad's own docs. Deliberately never
   * touches `userId`/`quoteId`/`transactionReference`/`accountNumber` - those are set once by
   * `create()` (our own `POST /transaction` call) and must not be clobbered by a later webhook
   * delivery. Returns both the row as it stood before this update and as it stands after, so
   * the caller can detect a genuine status transition and avoid emitting duplicate
   * notifications. Throws if no local row exists yet - see the throw below for why.
   */
  async upsertFromWebhook(data: {
    abroadTransactionId: string;
    status: CrossBorderTransactionRecord['status'];
    onChainTxHash?: string | null;
    refundOnChainId?: string | null;
    lastWebhookPayload: unknown;
  }): Promise<{
    previous: CrossBorderTransactionRecord;
    current: CrossBorderTransactionRecord;
  }> {
    return this.db.transaction(async (tx) => {
      const [previous] = await tx
        .select()
        .from(crossBorderTransactions)
        .where(eq(crossBorderTransactions.abroadTransactionId, data.abroadTransactionId))
        .limit(1);

      if (previous === undefined) {
        // The webhook arrived before our own create() finished writing its row (a real but
        // rare race - see the module's design notes). There's nothing meaningful to insert
        // here without the fields only create() knows (userId, quoteId, transactionReference,
        // accountNumber, network/paymentMethod/targetCurrency) - the caller must handle this
        // by treating `previous === null` on a fresh id as "not yet known, skip" rather than
        // fabricating a row.
        throw new Error(
          `No local cross_border_transactions row for Abroad transaction ${data.abroadTransactionId} yet`,
        );
      }

      const [current] = await tx
        .update(crossBorderTransactions)
        .set({
          status: data.status,
          onChainTxHash: data.onChainTxHash ?? previous.onChainTxHash,
          refundOnChainId: data.refundOnChainId ?? previous.refundOnChainId,
          lastWebhookPayload: data.lastWebhookPayload,
          updatedAt: new Date(),
        })
        .where(eq(crossBorderTransactions.abroadTransactionId, data.abroadTransactionId))
        .returning();

      return { previous, current };
    });
  }
}
