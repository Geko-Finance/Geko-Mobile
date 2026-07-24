import { Injectable } from '@nestjs/common';
import { ExpoPushProvider } from './providers/expo-push.provider';
import {
  NotificationPreferences,
  NotificationPreferencesRepository,
} from './repositories/notification-preferences.repository';
import { UserDevicesRepository } from './repositories/user-devices.repository';

export type NotificationCategory =
  | 'security'
  | 'transactions'
  | 'priceAlerts'
  | 'marketing'
  | 'productUpdates';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationPreferencesRepository: NotificationPreferencesRepository,
    private readonly userDevicesRepository: UserDevicesRepository,
    private readonly expoPushProvider: ExpoPushProvider,
  ) {}

  async sendToUser(
    userId: string,
    notification: {
      category: NotificationCategory;
      title: string;
      body: string;
      data?: Record<string, unknown>;
    },
  ): Promise<void> {
    const preferences =
      await this.notificationPreferencesRepository.findByUserId(userId);

    if (
      notification.category !== 'security' &&
      !this.isCategoryEnabled(preferences, notification.category)
    ) {
      return;
    }

    const tokens =
      await this.userDevicesRepository.findActiveTokensForUser(userId);

    if (tokens.length === 0) {
      return;
    }

    await this.expoPushProvider.send(tokens, {
      title: notification.title,
      body: notification.body,
      data: notification.data,
    });
  }

  private isCategoryEnabled(
    preferences: NotificationPreferences,
    category: Exclude<NotificationCategory, 'security'>,
  ): boolean {
    switch (category) {
      case 'transactions':
        return preferences.transactions;
      case 'priceAlerts':
        return preferences.priceAlerts;
      case 'marketing':
        return preferences.marketing;
      case 'productUpdates':
        return preferences.productUpdates;
    }
  }
}
