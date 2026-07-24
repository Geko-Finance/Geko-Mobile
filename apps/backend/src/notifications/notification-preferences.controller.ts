import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../shared/types/authenticated-request';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { NotificationPreferencesRepository } from './repositories/notification-preferences.repository';

@Controller('notification-preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(
    private readonly notificationPreferencesRepository: NotificationPreferencesRepository,
  ) {}

  @Get()
  getPreferences(@Req() req: AuthenticatedRequest) {
    return this.notificationPreferencesRepository.findByUserId(req.user.sub);
  }

  @Patch()
  updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationPreferencesRepository.upsert(req.user.sub, dto);
  }
}
