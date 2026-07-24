import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';

const CUSTODY_LABELS: Record<string, string> = {
  cavos_custodial: 'Cavos custodial',
  non_custodial: 'non-custodial',
};

@Injectable()
export class NotificationsListener {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('auth.new_device_login')
  handleNewDeviceLogin(payload: {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    return this.notificationsService.sendToUser(payload.userId, {
      category: 'security',
      title: 'New sign-in',
      body: 'A new device signed in to your Geko account.',
      data: {
        type: 'auth.new_device_login',
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
      },
    });
  }

  @OnEvent('wallet.created')
  handleWalletCreated(payload: {
    userId: string;
    walletId: string;
    custodyType: string;
  }): Promise<void> {
    const custodyLabel =
      CUSTODY_LABELS[payload.custodyType] ?? payload.custodyType;

    return this.notificationsService.sendToUser(payload.userId, {
      category: 'security',
      title: 'Wallet created',
      body: `Your ${custodyLabel} wallet has been created.`,
      data: {
        type: 'wallet.created',
        walletId: payload.walletId,
        custodyType: payload.custodyType,
      },
    });
  }

  @OnEvent('wallet.needs_device_approval')
  handleWalletNeedsDeviceApproval(payload: {
    userId: string;
    walletId: string;
  }): Promise<void> {
    return this.notificationsService.sendToUser(payload.userId, {
      category: 'security',
      title: 'Wallet needs approval',
      body: 'Approve this device to finish setting up your wallet.',
      data: {
        type: 'wallet.needs_device_approval',
        walletId: payload.walletId,
      },
    });
  }

  @OnEvent('wallet.tx.executed')
  handleWalletTxExecuted(payload: {
    userId: string;
    walletId: string;
    amountStroops?: string;
    destination?: string;
  }): Promise<void> {
    const parts: string[] = [];

    if (payload.amountStroops) {
      parts.push(`${payload.amountStroops} stroops`);
    }

    if (payload.destination) {
      parts.push(`to ${payload.destination}`);
    }

    const body =
      parts.length > 0
        ? `Your transaction of ${parts.join(' ')} was sent.`
        : 'Your transaction was sent successfully.';

    return this.notificationsService.sendToUser(payload.userId, {
      category: 'transactions',
      title: 'Transaction sent',
      body,
      data: {
        type: 'wallet.tx.executed',
        walletId: payload.walletId,
        amountStroops: payload.amountStroops,
        destination: payload.destination,
      },
    });
  }
}
