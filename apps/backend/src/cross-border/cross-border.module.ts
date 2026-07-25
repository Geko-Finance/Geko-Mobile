import { Module } from '@nestjs/common';
import { AbroadFinanceProvider } from './providers/abroad-finance.provider';
import { AbroadWebhookSecretGuard } from './guards/abroad-webhook-secret.guard';
import { CrossBorderController } from './cross-border.controller';
import { CrossBorderRepository } from './cross-border.repository';
import { CrossBorderService } from './cross-border.service';
import { CrossBorderWebhookController } from './cross-border-webhook.controller';

@Module({
  controllers: [CrossBorderController, CrossBorderWebhookController],
  providers: [
    AbroadFinanceProvider,
    AbroadWebhookSecretGuard,
    CrossBorderRepository,
    CrossBorderService,
  ],
  exports: [CrossBorderRepository, CrossBorderService],
})
export class CrossBorderModule {}
