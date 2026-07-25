import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../shared/exceptions/domain.exception';

export class CrossBorderOwnershipException extends DomainException {
  constructor(id?: string) {
    super(
      id
        ? `You do not own cross-border transaction ${id}`
        : 'You do not own this cross-border transaction',
      HttpStatus.FORBIDDEN,
      'Forbidden',
    );
  }
}
