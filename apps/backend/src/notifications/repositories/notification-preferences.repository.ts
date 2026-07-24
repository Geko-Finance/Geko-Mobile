import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../database/database.module';
import { notificationPreferences } from '../../db/schema';

export type NotificationPreferences = {
  securityAlerts: boolean;
  transactions: boolean;
  priceAlerts: boolean;
  marketing: boolean;
  productUpdates: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  securityAlerts: true,
  transactions: true,
  priceAlerts: false,
  marketing: false,
  productUpdates: true,
};

type UpsertablePreferences = Partial<
  Omit<NotificationPreferences, 'securityAlerts'>
>;

@Injectable()
export class NotificationPreferencesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByUserId(userId: string): Promise<NotificationPreferences> {
    const [row] = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (!row) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    }

    return {
      securityAlerts: row.securityAlerts,
      transactions: row.transactions,
      priceAlerts: row.priceAlerts,
      marketing: row.marketing,
      productUpdates: row.productUpdates,
    };
  }

  async upsert(
    userId: string,
    data: UpsertablePreferences,
  ): Promise<NotificationPreferences> {
    const [row] = await this.db
      .insert(notificationPreferences)
      .values({
        userId,
        securityAlerts: true,
        transactions:
          data.transactions ?? DEFAULT_NOTIFICATION_PREFERENCES.transactions,
        priceAlerts:
          data.priceAlerts ?? DEFAULT_NOTIFICATION_PREFERENCES.priceAlerts,
        marketing: data.marketing ?? DEFAULT_NOTIFICATION_PREFERENCES.marketing,
        productUpdates:
          data.productUpdates ??
          DEFAULT_NOTIFICATION_PREFERENCES.productUpdates,
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          securityAlerts: true,
          ...(data.transactions !== undefined && {
            transactions: data.transactions,
          }),
          ...(data.priceAlerts !== undefined && {
            priceAlerts: data.priceAlerts,
          }),
          ...(data.marketing !== undefined && { marketing: data.marketing }),
          ...(data.productUpdates !== undefined && {
            productUpdates: data.productUpdates,
          }),
        },
      })
      .returning();

    return {
      securityAlerts: row.securityAlerts,
      transactions: row.transactions,
      priceAlerts: row.priceAlerts,
      marketing: row.marketing,
      productUpdates: row.productUpdates,
    };
  }
}
