import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../shared/exceptions/domain.exception';

export class ContactAlreadyExistsException extends DomainException {
  constructor() {
    super(
      'A contact with this address already exists on this network',
      HttpStatus.CONFLICT,
      'Conflict',
    );
  }
}
