import { IsIn } from 'class-validator';

const PAYMENT_METHODS = ['BREB', 'PIX'] as const;

export class ListBanksQueryDto {
  @IsIn(PAYMENT_METHODS)
  paymentMethod!: (typeof PAYMENT_METHODS)[number];
}
