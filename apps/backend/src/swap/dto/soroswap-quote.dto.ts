import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const CONTRACT_ID_PATTERN = /^C[A-Z2-7]{55}$/;

export class SoroswapQuoteDto {
  @Matches(CONTRACT_ID_PATTERN)
  assetIn!: string;

  @Matches(CONTRACT_ID_PATTERN)
  assetOut!: string;

  @Matches(/^\d+$/)
  amount!: string;

  @IsIn(['EXACT_IN'])
  tradeType!: 'EXACT_IN';

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['soroswap', 'phoenix', 'aqua'], { each: true })
  protocols!: Array<'soroswap' | 'phoenix' | 'aqua'>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5_000)
  slippageBps?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  maxHops?: number;

  @IsOptional()
  @IsString()
  referralId?: string;
}
