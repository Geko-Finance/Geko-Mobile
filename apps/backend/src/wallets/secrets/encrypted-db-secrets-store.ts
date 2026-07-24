import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../database/database.module';
import { walletSecrets } from '../../db/schema';
import type { SecretsStore } from './secrets-store.interface';

/**
 * AES-256-GCM encrypted secrets store backed by `wallet_secrets`.
 *
 * Directly replaces `apps/server/src/recovery-store.ts`, which stored Cavos
 * recovery codes as plaintext in a local JSON file — a real vulnerability.
 * Bound behind the `SECRETS_STORE` token so a KMS-backed implementation can be
 * swapped in later without touching call sites.
 */
@Injectable()
export class EncryptedDbSecretsStore implements SecretsStore {
  private readonly key: Buffer;

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    configService: ConfigService,
  ) {
    const encoded = configService.get<string>('WALLET_SECRETS_ENCRYPTION_KEY');

    if (!encoded || encoded.trim().length === 0) {
      throw new Error(
        'Fatal: WALLET_SECRETS_ENCRYPTION_KEY is required. Set it in apps/backend/.env',
      );
    }

    const key = Buffer.from(encoded, 'base64');

    if (key.length !== 32) {
      throw new Error(
        'Fatal: WALLET_SECRETS_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256). Generate with: openssl rand -base64 32',
      );
    }

    this.key = key;
  }

  async put(
    walletId: string,
    purpose: string,
    plaintext: string,
  ): Promise<void> {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const ciphertext = encrypted.toString('base64');
    const ivEncoded = iv.toString('base64');
    const authTagEncoded = authTag.toString('base64');

    await this.db
      .insert(walletSecrets)
      .values({
        walletId,
        purpose,
        ciphertext,
        iv: ivEncoded,
        authTag: authTagEncoded,
      })
      .onConflictDoUpdate({
        target: [walletSecrets.walletId, walletSecrets.purpose],
        set: {
          ciphertext,
          iv: ivEncoded,
          authTag: authTagEncoded,
          updatedAt: new Date(),
        },
      });
  }

  async get(walletId: string, purpose: string): Promise<string | null> {
    const [row] = await this.db
      .select()
      .from(walletSecrets)
      .where(
        and(
          eq(walletSecrets.walletId, walletId),
          eq(walletSecrets.purpose, purpose),
        ),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(row.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(row.authTag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(row.ciphertext, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  async delete(walletId: string, purpose: string): Promise<void> {
    await this.db
      .delete(walletSecrets)
      .where(
        and(
          eq(walletSecrets.walletId, walletId),
          eq(walletSecrets.purpose, purpose),
        ),
      );
  }
}
