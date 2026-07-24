import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsRepository } from './contacts.repository';
import { ContactsService } from './contacts.service';

@Module({
  controllers: [ContactsController],
  providers: [ContactsRepository, ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
