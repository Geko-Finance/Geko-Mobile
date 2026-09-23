import type {
  SignTransactionOptions,
  SignTransactionResult,
  WalletSigner,
} from '@/src/domain/wallet';

import type { CavosClient } from './cavos-client';
import { getCavosClient } from './cavos-client';

/** Cavos sign-only adapter for arbitrary Stellar/Soroban XDR such as swap transactions. */
export class CavosRawSigner implements WalletSigner {
  readonly custody = 'custodial' as const;

  constructor(
    private readonly walletId: string,
    private readonly publicKey: string,
    private readonly client: CavosClient = getCavosClient(),
  ) {}

  async getAddress(): Promise<string> {
    return this.publicKey;
  }

  async getPublicKey(): Promise<string> {
    return this.publicKey;
  }

  async signTransaction(
    transactionXdr: string,
    _options: SignTransactionOptions,
  ): Promise<SignTransactionResult> {
    const { signedXdr } = await this.client.signXdr(
      this.walletId,
      transactionXdr,
    );

    return { xdr: signedXdr };
  }
}
