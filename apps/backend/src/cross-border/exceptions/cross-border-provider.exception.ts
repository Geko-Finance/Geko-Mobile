import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../shared/exceptions/domain.exception';

/** Thrown when Abroad Finance's API itself returns a non-2xx response. */
export class CrossBorderProviderException extends DomainException {
  constructor(
    readonly upstreamStatus: number,
    readonly upstreamBody: unknown,
  ) {
    super(
      `Abroad Finance request failed (upstream status ${upstreamStatus})`,
      HttpStatus.BAD_GATEWAY,
      'Bad Gateway',
    );
  }
}
