import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const WEBHOOK_SECRET_HEADER = 'x-abroad-webhook-secret';

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Verifies Abroad Finance's webhook calls via the `X-Abroad-Webhook-Secret` header - per
 * Abroad's own docs this is a plain shared-secret string comparison, not an HMAC signature
 * over the body. Fails closed: if `ABROAD_WEBHOOK_SECRET` isn't configured, every request is
 * rejected (there's no valid secret to match against yet), rather than failing open.
 */
@Injectable()
export class AbroadWebhookSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const configuredSecret = this.configService.get<string>('ABROAD_WEBHOOK_SECRET');
    const providedSecret = request.header(WEBHOOK_SECRET_HEADER);

    if (
      typeof configuredSecret !== 'string' ||
      configuredSecret.trim().length === 0 ||
      typeof providedSecret !== 'string' ||
      providedSecret.length === 0
    ) {
      return false;
    }

    return timingSafeEqualStrings(configuredSecret, providedSecret);
  }
}
