import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../shared/types/authenticated-request';
import { CrossBorderService } from './cross-border.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CreateReverseQuoteDto } from './dto/create-reverse-quote.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { ListBanksQueryDto } from './dto/list-banks-query.dto';

@Controller('cross-border')
@UseGuards(JwtAuthGuard)
export class CrossBorderController {
  constructor(private readonly crossBorderService: CrossBorderService) {}

  @Post('quotes')
  createQuote(@Body() dto: CreateQuoteDto) {
    return this.crossBorderService.getQuote(dto);
  }

  @Post('quotes/reverse')
  createReverseQuote(@Body() dto: CreateReverseQuoteDto) {
    return this.crossBorderService.getReverseQuote(dto);
  }

  @Post('transactions')
  createTransaction(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.crossBorderService.createTransaction(req.user.sub, dto);
  }

  @Get('transactions')
  listTransactions(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.crossBorderService.listTransactions(req.user.sub, query);
  }

  @Get('transactions/:id')
  getTransaction(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.crossBorderService.getTransaction(req.user.sub, id);
  }

  @Get('banks')
  listBanks(@Query() query: ListBanksQueryDto) {
    return this.crossBorderService.listBanks(query.paymentMethod);
  }

  @Get('liquidity')
  getLiquidity(@Query() query: ListBanksQueryDto) {
    return this.crossBorderService.getLiquidity(query.paymentMethod);
  }
}
