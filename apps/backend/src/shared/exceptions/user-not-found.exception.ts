import { DomainNotFoundException } from './not-found.exception';

export class UserNotFoundException extends DomainNotFoundException {
  constructor(userId?: string) {
    super(userId ? `User ${userId} not found` : 'User not found');
  }
}
