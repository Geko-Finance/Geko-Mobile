import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { networkEnum } from './enums';
import { users } from './users';

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    address: text('address').notNull(),
    network: networkEnum('network').notNull(),
    memo: text('memo'),
    favorite: boolean('favorite').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('contacts_user_id_network_address_unique').on(
      table.userId,
      table.network,
      table.address,
    ),
    index('contacts_user_id_idx').on(table.userId),
  ],
);
