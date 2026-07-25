import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CrossBorderService } from './cross-border.service';
import { AbroadWebhookPayloadDto } from './dto/abroad-webhook-payload.dto';
import { AbroadWebhookSecretGuard } from './guards/abroad-webhook-secret.guard';

/**
 * Deliberately a SEPARATE controller from CrossBorderController, not a route on it: Nest
 * concatenates class-level and method-level guards rather than overriding, so if this route
 * lived on CrossBorderController (which has `@UseGuards(JwtAuthGuard)` at class level),
 * Abroad's unauthenticated server-to-server webhook call would be rejected by JwtAuthGuard
 * before AbroadWebhookSecretGuard ever ran. No class-level guard here - only the method-level
 * secret guard, which fails closed on its own if ABROAD_WEBHOOK_SECRET isn't configured.
 */
@Controller('cross-border/webhooks')
export class CrossBorderWebhookController {
  constructor(private readonly crossBorderService: CrossBorderService) {}

  @Post('abroad')
  @UseGuards(AbroadWebhookSecretGuard)
  handleAbroadWebhook(@Body() payload: AbroadWebhookPayloadDto) {
    return this.crossBorderService.handleWebhookEvent(payload);
  }
}
