import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

const PLACEHOLDER_PREFIX = 'change-me-';
const MINIMUM_JWT_SECRET_LENGTH = 32;
const WALLET_KEY_BYTES = 32;
const ABROAD_VARIABLES = [
  'ABROAD_API_KEY',
  'ABROAD_WEBHOOK_SECRET',
  'ABROAD_STELLAR_DEPOSIT_ADDRESS',
] as const;

type AbroadVariable = (typeof ABROAD_VARIABLES)[number];

enum CavosNetwork {
  testnet = 'testnet',
  mainnet = 'mainnet',
}

export class EnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  MOBILE_APP_ORIGIN!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  PORT?: number;

  @IsString()
  CAVOS_APP_ID!: string;

  @IsString()
  CAVOS_APP_SALT!: string;

  @IsEnum(CavosNetwork)
  CAVOS_NETWORK!: CavosNetwork;

  /** Base64-encoded 32-byte AES-256 key (e.g. `openssl rand -base64 32`). */
  @IsString()
  WALLET_SECRETS_ENCRYPTION_KEY!: string;

  /**
   * Cross-border (Abroad Finance) integration - all three optional, unlike every var above.
   * AbroadFinanceProvider degrades gracefully (503s cross-border endpoints, never crashes
   * boot) when any of these are absent - see cross-border/providers/abroad-finance.provider.ts.
   */
  @IsOptional()
  @IsString()
  ABROAD_API_KEY?: string;

  @IsOptional()
  @IsString()
  ABROAD_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  ABROAD_STELLAR_DEPOSIT_ADDRESS?: string;
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidWalletEncryptionKey(value: string): boolean {
  if (value !== value.trim() || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return false;
  }

  const unpadded = value.replace(/=+$/, '');
  if (unpadded.length % 4 === 1) {
    return false;
  }

  const padded = unpadded.padEnd(Math.ceil(unpadded.length / 4) * 4, '=');
  const decoded = Buffer.from(padded, 'base64');

  return (
    decoded.length === WALLET_KEY_BYTES &&
    decoded.toString('base64').replace(/=+$/, '') === unpadded
  );
}

function disableIncompleteAbroadConfig(config: EnvironmentVariables): void {
  const configuredVariables = ABROAD_VARIABLES.filter((name) =>
    isNonBlankString(config[name]),
  );

  if (
    configuredVariables.length === 0 ||
    configuredVariables.length === ABROAD_VARIABLES.length
  ) {
    return;
  }

  for (const name of ABROAD_VARIABLES) {
    delete config[name as AbroadVariable];
  }
}

function productionValidationFailures(
  config: EnvironmentVariables,
): string[] {
  const failures: string[] = [];

  for (const name of ['DATABASE_URL', 'MOBILE_APP_ORIGIN'] as const) {
    if (!isNonBlankString(config[name])) {
      failures.push(`${name} is required`);
    }
  }

  for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    const secret = config[name];
    if (!isNonBlankString(secret)) {
      failures.push(`${name} is required`);
    } else if (secret.startsWith(PLACEHOLDER_PREFIX)) {
      failures.push(`${name} must not use a placeholder`);
    } else if (secret.length < MINIMUM_JWT_SECRET_LENGTH) {
      failures.push(
        `${name} must contain at least ${MINIMUM_JWT_SECRET_LENGTH} characters`,
      );
    }
  }

  const walletKey = config.WALLET_SECRETS_ENCRYPTION_KEY;
  if (!isNonBlankString(walletKey)) {
    failures.push('WALLET_SECRETS_ENCRYPTION_KEY is required');
  } else if (walletKey.startsWith(PLACEHOLDER_PREFIX)) {
    failures.push('WALLET_SECRETS_ENCRYPTION_KEY must not use a placeholder');
  } else if (!isValidWalletEncryptionKey(walletKey)) {
    failures.push(
      'WALLET_SECRETS_ENCRYPTION_KEY must be valid base64 that decodes to exactly 32 bytes',
    );
  }

  if (config.CAVOS_NETWORK === CavosNetwork.mainnet) {
    for (const [name, value] of Object.entries(config)) {
      const isNetworkConfig =
        name !== 'CAVOS_NETWORK' &&
        /(?:^|_)(?:NETWORK|URL|ORIGIN|ENDPOINT|HOST)$/.test(name);

      if (
        isNetworkConfig &&
        typeof value === 'string' &&
        value.toLowerCase().includes('testnet')
      ) {
        failures.push(`${name} must not point at testnet when CAVOS_NETWORK is mainnet`);
      }
    }
  }

  return failures;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const invalidVariables = errors
      .map(({ property }) => property)
      .sort()
      .join(', ');
    throw new Error(`Invalid environment configuration: ${invalidVariables}`);
  }

  disableIncompleteAbroadConfig(validatedConfig);

  if (validatedConfig.NODE_ENV === 'production') {
    const failures = productionValidationFailures(validatedConfig);
    if (failures.length > 0) {
      throw new Error(`Invalid production configuration: ${failures.join('; ')}`);
    }
  }

  return validatedConfig;
}
