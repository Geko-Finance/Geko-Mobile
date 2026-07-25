import { IsIn, IsNumber, IsPositive } from 'class-validator';

const CRYPTO_CURRENCIES = ['USDC'] as const;
const NETWORKS = ['STELLAR', 'SOLANA', 'CELO'] as const;
const PAYMENT_METHODS = ['BREB', 'PIX'] as const;
const TARGET_CURRENCIES = ['COP', 'BRL'] as const;

export class CreateQuoteDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsIn(CRYPTO_CURRENCIES)
  cryptoCurrency!: (typeof CRYPTO_CURRENCIES)[number];

  @IsIn(NETWORKS)
  network!: (typeof NETWORKS)[number];

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: (typeof PAYMENT_METHODS)[number];

  @IsIn(TARGET_CURRENCIES)
  targetCurrency!: (typeof TARGET_CURRENCIES)[number];
}
