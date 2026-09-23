import { IsString, MinLength } from 'class-validator';

export class SoroswapSendDto {
  @IsString()
  @MinLength(1)
  xdr!: string;
}
