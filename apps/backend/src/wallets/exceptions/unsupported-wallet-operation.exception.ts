import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../shared/exceptions/domain.exception';

export class UnsupportedWalletOperationException extends DomainException {
  constructor(operation?: string) {
    super(
      operation
        ? `Wallet operation '${operation}' is not supported for this custody type`
        : 'Wallet operation is not supported for this custody type',
      HttpStatus.CONFLICT,
      'Conflict',
    );
  }
}
