import { Body, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { SoroswapBuildDto } from './dto/soroswap-build.dto';
import { SoroswapNetworkQueryDto } from './dto/soroswap-network-query.dto';
import { SoroswapQuoteDto } from './dto/soroswap-quote.dto';
import { SoroswapSendDto } from './dto/soroswap-send.dto';
import { SoroswapProvider } from './soroswap.provider';

@Controller('swap/soroswap')
@UseGuards(JwtAuthGuard)
export class SwapController {
  constructor(private readonly soroswap: SoroswapProvider) {}

  @Post('quote')
  quote(
    @Body() dto: SoroswapQuoteDto,
    @Query() query: SoroswapNetworkQueryDto,
  ) {
    return this.soroswap.quote({ ...dto }, query.network);
  }

  @Post('build')
  build(
    @Body() dto: SoroswapBuildDto,
    @Query() query: SoroswapNetworkQueryDto,
  ) {
    return this.soroswap.build({ ...dto }, query.network);
  }

  @Post('send')
  send(
    @Body() dto: SoroswapSendDto,
    @Query() query: SoroswapNetworkQueryDto,
  ) {
    return this.soroswap.send({ ...dto }, query.network);
  }
}
