import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull, ne } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../database/database.module';
import { userDevices } from '../../db/schema';

export type UserDeviceRecord = typeof userDevices.$inferSelect;

@Injectable()
export class UserDevicesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async upsert(
    userId: string,
    data: {
      pushToken?: string;
      platform: 'ios' | 'android';
      deviceId: string;
      appVersion?: string;
    },
  ): Promise<UserDeviceRecord> {
    const now = new Date();

    const [device] = await this.db
      .insert(userDevices)
      .values({
        userId,
        pushToken: data.pushToken,
        platform: data.platform,
        deviceId: data.deviceId,
        appVersion: data.appVersion,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: [userDevices.userId, userDevices.deviceId],
        set: {
          platform: data.platform,
          lastSeenAt: now,
          ...(data.pushToken !== undefined && { pushToken: data.pushToken }),
          ...(data.appVersion !== undefined && { appVersion: data.appVersion }),
        },
      })
      .returning();

    return device;
  }

  async findActiveTokensForUser(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ pushToken: userDevices.pushToken })
      .from(userDevices)
      .where(
        and(
          eq(userDevices.userId, userId),
          isNotNull(userDevices.pushToken),
          ne(userDevices.pushToken, ''),
        ),
      );

    return rows
      .map((row) => row.pushToken)
      .filter((token): token is string => Boolean(token));
  }
}
