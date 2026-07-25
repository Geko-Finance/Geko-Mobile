import { DomainNotFoundException } from '../../shared/exceptions/not-found.exception';

export class CrossBorderTransactionNotFoundException extends DomainNotFoundException {
  constructor(id?: string) {
    super(id ? `Cross-border transaction ${id} not found` : 'Cross-border transaction not found');
  }
}
