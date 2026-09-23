import { IsIn } from 'class-validator';

export class SoroswapNetworkQueryDto {
  @IsIn(['testnet', 'mainnet'])
  network!: 'testnet' | 'mainnet';
}
