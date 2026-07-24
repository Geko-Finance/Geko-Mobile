import { IsString } from 'class-validator';

export class ExecuteWalletDto {
  @IsString()
  amountStroops!: string;

  @IsString()
  destination!: string;
}
