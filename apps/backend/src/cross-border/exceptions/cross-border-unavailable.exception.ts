import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../shared/exceptions/domain.exception';

/** Thrown when ABROAD_API_KEY isn't configured - see AbroadFinanceProvider's enabled flag. */
export class CrossBorderUnavailableException extends DomainException {
  constructor() {
    super(
      'Cross-border payments are not available right now',
      HttpStatus.SERVICE_UNAVAILABLE,
      'Service Unavailable',
    );
  }
}
