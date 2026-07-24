import { Inject, Injectable } from '@nestjs/common';
import { eq, not } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../database/database.module';
import { contacts } from '../db/schema';
import { ContactAlreadyExistsException } from './exceptions/contact-already-exists.exception';

export type ContactRecord = typeof contacts.$inferSelect;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === '23505'
  );
}

@Injectable()
export class ContactsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(data: {
    userId: string;
    label: string;
    address: string;
    network: ContactRecord['network'];
    memo?: string | null;
    favorite?: boolean;
  }): Promise<ContactRecord> {
    try {
      const [contact] = await this.db
        .insert(contacts)
        .values({
          userId: data.userId,
          label: data.label,
          address: data.address,
          network: data.network,
          memo: data.memo ?? null,
          favorite: data.favorite ?? false,
        })
        .returning();

      return contact;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ContactAlreadyExistsException();
      }

      throw error;
    }
  }

  async findAllForUser(userId: string): Promise<ContactRecord[]> {
    return this.db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, userId));
  }

  async findById(id: string): Promise<ContactRecord | null> {
    const [contact] = await this.db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    return contact ?? null;
  }

  async update(
    id: string,
    data: Partial<{
      label: string;
      address: string;
      network: ContactRecord['network'];
      memo: string | null;
    }>,
  ): Promise<ContactRecord | null> {
    try {
      const [contact] = await this.db
        .update(contacts)
        .set(data)
        .where(eq(contacts.id, id))
        .returning();

      return contact ?? null;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ContactAlreadyExistsException();
      }

      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(contacts).where(eq(contacts.id, id));
  }

  async toggleFavorite(id: string): Promise<ContactRecord | null> {
    const [contact] = await this.db
      .update(contacts)
      .set({ favorite: not(contacts.favorite) })
      .where(eq(contacts.id, id))
      .returning();

    return contact ?? null;
  }
}
