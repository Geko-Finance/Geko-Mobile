import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../database/database.module';
import { users } from '../db/schema';

export type UserRecord = typeof users.$inferSelect;

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1);

    return user ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ?? null;
  }

  async create(data: {
    email: string;
    emailVerifiedAt?: Date;
    displayName?: string;
  }): Promise<UserRecord> {
    const [user] = await this.db
      .insert(users)
      .values({
        email: data.email,
        emailVerifiedAt: data.emailVerifiedAt,
        displayName: data.displayName,
      })
      .returning();

    return user;
  }

  async update(
    id: string,
    data: { displayName?: string; avatarUrl?: string },
  ): Promise<UserRecord> {
    const updates: Partial<Pick<UserRecord, 'displayName' | 'avatarUrl'>> = {};

    if (data.displayName !== undefined) {
      updates.displayName = data.displayName;
    }

    if (data.avatarUrl !== undefined) {
      updates.avatarUrl = data.avatarUrl;
    }

    const [user] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    return user;
  }
}
