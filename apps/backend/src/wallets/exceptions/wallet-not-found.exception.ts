import { DomainNotFoundException } from '../../shared/exceptions/not-found.exception';

export class WalletNotFoundException extends DomainNotFoundException {
  constructor(walletId?: string) {
    super(walletId ? `Wallet ${walletId} not found` : 'Wallet not found');
  }
}
