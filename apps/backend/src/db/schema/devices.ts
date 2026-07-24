import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { devicePlatformEnum } from './enums';
import { users } from './users';

export const userDevices = pgTable(
  'user_devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    pushToken: text('push_token'),
    platform: devicePlatformEnum('platform').notNull(),
    deviceId: text('device_id').notNull(),
    appVersion: text('app_version'),
    biometricLockEnabled: boolean('biometric_lock_enabled')
      .notNull()
      .default(true),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('user_devices_user_id_device_id_unique').on(
      table.userId,
      table.deviceId,
    ),
    index('user_devices_user_id_idx').on(table.userId),
  ],
);
