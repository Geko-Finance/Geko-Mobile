import { IsString } from 'class-validator';

export class SignWalletDto {
  @IsString()
  unsignedXdr!: string;
}
