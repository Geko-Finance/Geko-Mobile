import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../shared/exceptions/domain.exception';

export class ContactOwnershipException extends DomainException {
  constructor(contactId?: string) {
    super(
      contactId
        ? `You do not own contact ${contactId}`
        : 'You do not own this contact',
      HttpStatus.FORBIDDEN,
      'Forbidden',
    );
  }
}
