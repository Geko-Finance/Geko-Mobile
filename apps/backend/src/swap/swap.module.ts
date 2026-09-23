import { Module } from '@nestjs/common';
import { SoroswapProvider } from './soroswap.provider';
import { SwapController } from './swap.controller';

@Module({
  controllers: [SwapController],
  providers: [SoroswapProvider],
})
export class SwapModule {}
