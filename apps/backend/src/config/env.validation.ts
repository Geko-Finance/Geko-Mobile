import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

enum CavosNetwork {
  testnet = 'testnet',
  mainnet = 'mainnet',
}

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

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

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
