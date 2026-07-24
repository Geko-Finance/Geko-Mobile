import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class ExpoPushProvider {
  private readonly logger = new Logger(ExpoPushProvider.name);
  private readonly expo = new Expo();

  async send(
    tokens: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    },
  ): Promise<void> {
    const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
      return;
    }

    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      title: notification.title,
      body: notification.body,
      data: notification.data,
    }));

    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);

        for (const ticket of tickets) {
          if (ticket.status === 'error') {
            this.logger.warn(
              `Push notification ticket error: ${ticket.message}`,
              ticket.details,
            );
          }
        }
      } catch (error) {
        this.logger.error('Failed to send push notification chunk', error);
      }
    }
  }
}
