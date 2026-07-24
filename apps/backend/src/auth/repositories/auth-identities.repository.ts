import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../database/database.module';
import { authIdentities } from '../../db/schema';

export type AuthProvider = (typeof authIdentities.$inferSelect)['provider'];

export type AuthIdentityRecord = typeof authIdentities.$inferSelect;

@Injectable()
export class AuthIdentitiesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByProviderSubject(
    provider: AuthProvider,
    providerSubject: string,
  ): Promise<AuthIdentityRecord | null> {
    const [identity] = await this.db
      .select()
      .from(authIdentities)
      .where(
        and(
          eq(authIdentities.provider, provider),
          eq(authIdentities.providerSubject, providerSubject),
        ),
      )
      .limit(1);

    return identity ?? null;
  }

  async create(data: {
    userId: string;
    provider: AuthProvider;
    providerSubject: string;
  }): Promise<AuthIdentityRecord> {
    const [identity] = await this.db
      .insert(authIdentities)
      .values(data)
      .returning();

    return identity;
  }
}
