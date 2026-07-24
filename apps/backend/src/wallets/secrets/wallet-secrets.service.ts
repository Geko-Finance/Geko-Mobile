import { Inject, Injectable } from '@nestjs/common';
import {
  SECRETS_STORE,
  type SecretsStore,
} from './secrets-store.interface';

const CAVOS_RECOVERY_CODE_PURPOSE = 'cavos_recovery_code';

@Injectable()
export class WalletSecretsService {
  constructor(
    @Inject(SECRETS_STORE) private readonly secretsStore: SecretsStore,
  ) {}

  async saveRecoveryCode(walletId: string, code: string): Promise<void> {
    await this.secretsStore.put(walletId, CAVOS_RECOVERY_CODE_PURPOSE, code);
  }

  async getRecoveryCode(walletId: string): Promise<string | null> {
    return this.secretsStore.get(walletId, CAVOS_RECOVERY_CODE_PURPOSE);
  }
}
