import type { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { AbroadWebhookSecretGuard } from './abroad-webhook-secret.guard';

const makeContext = (headerValue: string | undefined): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) =>
          name === 'x-abroad-webhook-secret' ? headerValue : undefined,
      }),
    }),
  }) as unknown as ExecutionContext;

const makeConfigService = (secret: string | undefined): ConfigService =>
  ({
    get: jest.fn((key: string) => (key === 'ABROAD_WEBHOOK_SECRET' ? secret : undefined)),
  }) as unknown as ConfigService;

describe('AbroadWebhookSecretGuard', () => {
  it('rejects when no secret is configured at all (fail closed)', () => {
    const guard = new AbroadWebhookSecretGuard(makeConfigService(undefined));
    expect(guard.canActivate(makeContext('anything'))).toBe(false);
  });

  it('rejects when the header is missing', () => {
    const guard = new AbroadWebhookSecretGuard(makeConfigService('correct-secret'));
    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });

  it('rejects when the header does not match', () => {
    const guard = new AbroadWebhookSecretGuard(makeConfigService('correct-secret'));
    expect(guard.canActivate(makeContext('wrong-secret'))).toBe(false);
  });

  it('rejects when the header is a different length than the configured secret', () => {
    const guard = new AbroadWebhookSecretGuard(makeConfigService('correct-secret'));
    expect(guard.canActivate(makeContext('short'))).toBe(false);
  });

  it('allows when the header matches exactly', () => {
    const guard = new AbroadWebhookSecretGuard(makeConfigService('correct-secret'));
    expect(guard.canActivate(makeContext('correct-secret'))).toBe(true);
  });
});
