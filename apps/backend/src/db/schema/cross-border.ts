import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  crossBorderNetworkEnum,
  crossBorderPaymentMethodEnum,
  crossBorderStatusEnum,
  crossBorderTargetCurrencyEnum,
} from './enums';
import { users } from './users';
import { wallets } from './wallets';

/**
 * One row per Abroad Finance cross-border transaction. Quotes themselves are never persisted
 * (stateless, expire in ~1h) - a row only exists once `POST /transaction` has been called and
 * we have Abroad's own `id`/`transaction_reference` back. `lastWebhookPayload` keeps the raw
 * most-recent webhook body for audit/debugging, mirroring audit_logs' `metadata` jsonb column.
 */
export const crossBorderTransactions = pgTable(
  'cross_border_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    walletId: uuid('wallet_id').references(() => wallets.id, {
      onDelete: 'set null',
    }),
    abroadTransactionId: text('abroad_transaction_id').notNull(),
    quoteId: text('quote_id').notNull(),
    transactionReference: text('transaction_reference').notNull(),
    status: crossBorderStatusEnum('status').notNull().default('AWAITING_PAYMENT'),
    network: crossBorderNetworkEnum('network').notNull().default('STELLAR'),
    paymentMethod: crossBorderPaymentMethodEnum('payment_method').notNull(),
    targetCurrency: crossBorderTargetCurrencyEnum('target_currency').notNull(),
    accountNumber: text('account_number').notNull(),
    bankCode: text('bank_code'),
    taxId: text('tax_id'),
    kycLink: text('kyc_link'),
    onChainTxHash: text('on_chain_tx_hash'),
    refundOnChainId: text('refund_on_chain_id'),
    lastWebhookPayload: jsonb('last_webhook_payload'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('cross_border_transactions_abroad_transaction_id_unique').on(
      table.abroadTransactionId,
    ),
    index('cross_border_transactions_user_id_idx').on(table.userId),
    index('cross_border_transactions_status_idx').on(table.status),
  ],
);
