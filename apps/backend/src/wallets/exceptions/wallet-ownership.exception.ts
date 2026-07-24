import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../shared/exceptions/domain.exception';

export class WalletOwnershipException extends DomainException {
  constructor(walletId?: string) {
    super(
      walletId
        ? `You do not own wallet ${walletId}`
        : 'You do not own this wallet',
      HttpStatus.FORBIDDEN,
      'Forbidden',
    );
  }
}
