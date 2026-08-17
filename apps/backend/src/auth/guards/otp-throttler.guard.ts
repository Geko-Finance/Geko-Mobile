import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Throttles the OTP routes per email address instead of per IP.
 *
 * The global `ThrottlerGuard` keys on the client IP, which an attacker brute-forcing a
 * numeric OTP can rotate freely. Keying on the submitted email caps attempts against a
 * single account no matter where they come from. Both guards run on these routes, so the
 * account limit and the IP limit apply together.
 *
 * Requests with no email in the body fall back to the IP tracker, so a malformed request
 * cannot slip past by omitting the field.
 */
@Injectable()
export class OtpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const body = req.body as { email?: unknown } | undefined;
    const email = body?.email;

    if (typeof email === 'string' && email.trim().length > 0) {
      return `otp:${email.trim().toLowerCase()}`;
    }

    // No usable email: fall back to the IP so a malformed body cannot skip the limit.
    return typeof req.ip === 'string' ? req.ip : 'otp:unknown-client';
  }
}
