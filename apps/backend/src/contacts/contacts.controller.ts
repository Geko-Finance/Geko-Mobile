import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../shared/types/authenticated-request';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateContactDto) {
    return this.contactsService.create(req.user.sub, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.contactsService.list(req.user.sub);
  }

  @Get(':id')
  getOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.contactsService.getOne(req.user.sub, id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.contactsService.remove(req.user.sub, id);
  }

  @Post(':id/favorite')
  toggleFavorite(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.contactsService.toggleFavorite(req.user.sub, id);
  }
}
