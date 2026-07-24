import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import {
  type ContactRecord,
  ContactsRepository,
} from './contacts.repository';
import { ContactAlreadyExistsException } from './exceptions/contact-already-exists.exception';
import { ContactNotFoundException } from './exceptions/contact-not-found.exception';
import { ContactOwnershipException } from './exceptions/contact-ownership.exception';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === '23505'
  );
}

@Injectable()
export class ContactsService {
  constructor(private readonly contactsRepository: ContactsRepository) {}

  async create(userId: string, dto: CreateContactDto): Promise<ContactRecord> {
    return this.wrapUniqueViolation(() =>
      this.contactsRepository.create({
        userId,
        label: dto.label,
        address: dto.address,
        network: dto.network,
        memo: dto.memo,
        favorite: dto.favorite,
      }),
    );
  }

  async list(userId: string): Promise<ContactRecord[]> {
    return this.contactsRepository.findAllForUser(userId);
  }

  async getOne(userId: string, contactId: string): Promise<ContactRecord> {
    return this.requireOwnedContact(userId, contactId);
  }

  async update(
    userId: string,
    contactId: string,
    dto: UpdateContactDto,
  ): Promise<ContactRecord> {
    await this.requireOwnedContact(userId, contactId);

    const contact = await this.wrapUniqueViolation(() =>
      this.contactsRepository.update(contactId, {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.memo !== undefined ? { memo: dto.memo } : {}),
      }),
    );

    if (!contact) {
      throw new ContactNotFoundException(contactId);
    }

    return contact;
  }

  async remove(userId: string, contactId: string): Promise<void> {
    await this.requireOwnedContact(userId, contactId);
    await this.contactsRepository.delete(contactId);
  }

  async toggleFavorite(
    userId: string,
    contactId: string,
  ): Promise<ContactRecord> {
    await this.requireOwnedContact(userId, contactId);

    const contact = await this.contactsRepository.toggleFavorite(contactId);

    if (!contact) {
      throw new ContactNotFoundException(contactId);
    }

    return contact;
  }

  private async requireOwnedContact(
    userId: string,
    contactId: string,
  ): Promise<ContactRecord> {
    const contact = await this.contactsRepository.findById(contactId);

    if (!contact) {
      throw new ContactNotFoundException(contactId);
    }

    if (contact.userId !== userId) {
      throw new ContactOwnershipException(contactId);
    }

    return contact;
  }

  private async wrapUniqueViolation<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (
        error instanceof ContactAlreadyExistsException ||
        isUniqueViolation(error)
      ) {
        throw new ContactAlreadyExistsException();
      }

      throw error;
    }
  }
}
