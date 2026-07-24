import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  chainEnum,
  custodyTypeEnum,
  networkEnum,
  walletStatusEnum,
} from './enums';
import { users } from './users';

export const wallets = pgTable(
  'wallets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    chain: chainEnum('chain').notNull().default('stellar'),
    custodyType: custodyTypeEnum('custody_type').notNull(),
    publicAddress: text('public_address').notNull(),
    status: walletStatusEnum('status').notNull().default('pending'),
    isPrimary: boolean('is_primary').notNull().default(false),
    label: text('label'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('wallets_chain_public_address_unique').on(
      table.chain,
      table.publicAddress,
    ),
    index('wallets_user_id_idx').on(table.userId),
    index('wallets_user_id_is_primary_idx').on(table.userId, table.isPrimary),
  ],
);

export const custodialWalletDetails = pgTable('custodial_wallet_details', {
  walletId: uuid('wallet_id')
    .primaryKey()
    .references(() => wallets.id, { onDelete: 'cascade' }),
  cavosUserId: text('cavos_user_id').notNull(),
  network: networkEnum('network').notNull(),
  recoveryCodeSetAt: timestamp('recovery_code_set_at', {
    withTimezone: true,
  }),
});

export const nonCustodialWalletDetails = pgTable(
  'non_custodial_wallet_details',
  {
    walletId: uuid('wallet_id')
      .primaryKey()
      .references(() => wallets.id, { onDelete: 'cascade' }),
    backupConfirmedAt: timestamp('backup_confirmed_at', {
      withTimezone: true,
    }),
  },
);
