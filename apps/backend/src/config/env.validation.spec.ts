import { validate } from './env.validation';

const validWalletKey = Buffer.alloc(32, 7).toString('base64');

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:password@db.example.com:5432/geko',
    JWT_ACCESS_SECRET: 'access-secret-that-is-at-least-32-characters',
    JWT_REFRESH_SECRET: 'refresh-secret-that-is-at-least-32-characters',
    MOBILE_APP_ORIGIN: 'https://app.geko.example',
    CAVOS_APP_ID: 'production-app-id',
    CAVOS_APP_SALT: 'production-app-salt',
    CAVOS_NETWORK: 'mainnet',
    WALLET_SECRETS_ENCRYPTION_KEY: validWalletKey,
    ...overrides,
  };
}

describe('environment validation', () => {
  it('accepts a complete production configuration', () => {
    expect(validate(validConfig())).toMatchObject(validConfig());
  });

  it.each(['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'])(
    'rejects a placeholder %s without exposing its value',
    (name) => {
      const placeholder = `change-me-${name.toLowerCase()}`;

      expect(() => validate(validConfig({ [name]: placeholder }))).toThrow(name);

      try {
        validate(validConfig({ [name]: placeholder }));
      } catch (error) {
        expect((error as Error).message).not.toContain(placeholder);
      }
    },
  );

  it('rejects JWT secrets shorter than 32 characters', () => {
    expect(() =>
      validate(validConfig({ JWT_ACCESS_SECRET: 'short-secret' })),
    ).toThrow('JWT_ACCESS_SECRET');
  });

  it('rejects the wallet key placeholder without exposing it', () => {
    const placeholder = 'change-me-generate-with-openssl-rand-base64-32';

    expect(() =>
      validate(validConfig({ WALLET_SECRETS_ENCRYPTION_KEY: placeholder })),
    ).toThrow('WALLET_SECRETS_ENCRYPTION_KEY');

    try {
      validate(validConfig({ WALLET_SECRETS_ENCRYPTION_KEY: placeholder }));
    } catch (error) {
      expect((error as Error).message).not.toContain(placeholder);
    }
  });

  it.each([Buffer.alloc(31).toString('base64'), Buffer.alloc(33).toString('base64')])(
    'rejects a wallet key that does not decode to exactly 32 bytes',
    (walletKey) => {
      expect(() =>
        validate(validConfig({ WALLET_SECRETS_ENCRYPTION_KEY: walletKey })),
      ).toThrow('WALLET_SECRETS_ENCRYPTION_KEY');
    },
  );

  it('rejects malformed base64 even if the decoder could recover bytes', () => {
    expect(() =>
      validate(
        validConfig({
          WALLET_SECRETS_ENCRYPTION_KEY: `${validWalletKey.slice(0, -1)}!`,
        }),
      ),
    ).toThrow('WALLET_SECRETS_ENCRYPTION_KEY');
  });

  it.each(['DATABASE_URL', 'MOBILE_APP_ORIGIN'])(
    'rejects a missing production %s',
    (name) => {
      expect(() => validate(validConfig({ [name]: '' }))).toThrow(name);
    },
  );

  it('rejects testnet endpoint configuration when Cavos uses mainnet', () => {
    expect(() =>
      validate(
        validConfig({ STELLAR_NETWORK: 'testnet' }),
      ),
    ).toThrow('STELLAR_NETWORK');
  });

  it('keeps development placeholder behavior unchanged', () => {
    expect(
      validate(
        validConfig({
          NODE_ENV: 'development',
          JWT_ACCESS_SECRET: 'change-me-access-secret',
          JWT_REFRESH_SECRET: 'change-me-refresh-secret',
          WALLET_SECRETS_ENCRYPTION_KEY:
            'change-me-generate-with-openssl-rand-base64-32',
        }),
      ),
    ).toBeDefined();
  });

  it('preserves Abroad configuration when all three variables are set', () => {
    const result = validate(
      validConfig({
        ABROAD_API_KEY: 'api-key',
        ABROAD_WEBHOOK_SECRET: 'webhook-secret',
        ABROAD_STELLAR_DEPOSIT_ADDRESS: 'GBEXAMPLE',
      }),
    );

    expect(result.ABROAD_API_KEY).toBe('api-key');
    expect(result.ABROAD_WEBHOOK_SECRET).toBe('webhook-secret');
    expect(result.ABROAD_STELLAR_DEPOSIT_ADDRESS).toBe('GBEXAMPLE');
  });

  it('clears every Abroad variable when the group is incomplete', () => {
    const result = validate(
      validConfig({
        ABROAD_API_KEY: 'api-key',
        ABROAD_WEBHOOK_SECRET: '',
      }),
    );

    expect(result.ABROAD_API_KEY).toBeUndefined();
    expect(result.ABROAD_WEBHOOK_SECRET).toBeUndefined();
    expect(result.ABROAD_STELLAR_DEPOSIT_ADDRESS).toBeUndefined();
  });
});
