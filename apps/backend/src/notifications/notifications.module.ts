import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationsListener } from './notifications.listener';
import { NotificationsService } from './notifications.service';
import { ExpoPushProvider } from './providers/expo-push.provider';
import { NotificationPreferencesRepository } from './repositories/notification-preferences.repository';
import { UserDevicesRepository } from './repositories/user-devices.repository';

@Module({
  controllers: [DevicesController, NotificationPreferencesController],
  providers: [
    UserDevicesRepository,
    NotificationPreferencesRepository,
    ExpoPushProvider,
    NotificationsService,
    NotificationsListener,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
