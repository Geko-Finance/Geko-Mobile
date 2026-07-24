import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsIn(['testnet', 'mainnet'])
  network!: 'testnet' | 'mainnet';

  @IsOptional()
  @IsString()
  memo?: string;

  @IsOptional()
  @IsBoolean()
  favorite?: boolean;
}
