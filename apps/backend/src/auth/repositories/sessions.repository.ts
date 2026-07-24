import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../database/database.module';
import { sessions } from '../../db/schema';

export type SessionRecord = typeof sessions.$inferSelect;

@Injectable()
export class SessionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(data: {
    userId: string;
    refreshTokenHash: string;
    deviceInfo?: unknown;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<SessionRecord> {
    const [session] = await this.db.insert(sessions).values(data).returning();

    return session;
  }

  async findByRefreshTokenHash(
    hash: string,
  ): Promise<SessionRecord | null> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, hash))
      .limit(1);

    return session ?? null;
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, sessionId));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }
}
