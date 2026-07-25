import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const NETWORKS = ['STELLAR', 'SOLANA', 'CELO'] as const;
const PAYMENT_METHODS = ['BREB', 'PIX'] as const;
const TARGET_CURRENCIES = ['COP', 'BRL'] as const;

/**
 * Quotes aren't persisted server-side (stateless, expire in ~1h - see
 * cross-border-transactions schema comment), so `network`/`paymentMethod`/`targetCurrency`
 * are resent here even though the client already supplied them seconds earlier calling
 * `POST /cross-border/quotes` - this is what lets a single `cross_border_transactions` row
 * capture everything without a separate quotes table.
 */
export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  quoteId!: string;

  @IsString()
  @IsNotEmpty()
  accountNumber!: string;

  @IsIn(NETWORKS)
  network!: (typeof NETWORKS)[number];

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: (typeof PAYMENT_METHODS)[number];

  @IsIn(TARGET_CURRENCIES)
  targetCurrency!: (typeof TARGET_CURRENCIES)[number];

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @IsOptional()
  @IsString()
  qrCode?: string;
}
