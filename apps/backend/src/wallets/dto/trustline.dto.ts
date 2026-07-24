import { IsString } from 'class-validator';

export class TrustlineDto {
  @IsString()
  code!: string;

  @IsString()
  issuer!: string;
}
