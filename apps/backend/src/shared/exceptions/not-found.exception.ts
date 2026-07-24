import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export class DomainNotFoundException extends DomainException {
  constructor(message = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND, 'Not Found');
  }
}
