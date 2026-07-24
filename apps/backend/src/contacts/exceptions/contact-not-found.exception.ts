import { DomainNotFoundException } from '../../shared/exceptions/not-found.exception';

export class ContactNotFoundException extends DomainNotFoundException {
  constructor(contactId?: string) {
    super(contactId ? `Contact ${contactId} not found` : 'Contact not found');
  }
}
