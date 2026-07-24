import { boolean, pgTable, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  securityAlerts: boolean('security_alerts').notNull().default(true),
  transactions: boolean('transactions').notNull().default(true),
  priceAlerts: boolean('price_alerts').notNull().default(false),
  marketing: boolean('marketing').notNull().default(false),
  productUpdates: boolean('product_updates').notNull().default(true),
});
