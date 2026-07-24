import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../shared/exceptions/domain.exception';

export class WalletNeedsDeviceApprovalException extends DomainException {
  constructor(message = 'needs-device-approval') {
    super(message, HttpStatus.CONFLICT, 'Conflict');
  }
}
