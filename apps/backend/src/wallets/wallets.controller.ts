import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../shared/types/authenticated-request';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { ExecuteWalletDto } from './dto/execute-wallet.dto';
import { RecoverDeviceDto } from './dto/recover-device.dto';
import { SignWalletDto } from './dto/sign-wallet.dto';
import { TrustlineDto } from './dto/trustline.dto';
import { WalletsService } from './wallets.service';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  // revealOnce.recoveryCode, when present, is shown to the client exactly this
  // one time; the backend has no way to return it again afterward — the client
  // must prompt the user to save it before moving on.
  @Post()
  createWallet(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateWalletDto,
  ) {
    return this.walletsService.createWallet(req.user.sub, dto);
  }

  @Get()
  listWallets(@Req() req: AuthenticatedRequest) {
    return this.walletsService.listWallets(req.user.sub);
  }

  @Get(':id')
  getWallet(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.walletsService.getWallet(req.user.sub, id);
  }

  @Post(':id/set-primary')
  setPrimary(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.walletsService.setPrimary(req.user.sub, id);
  }

  @Get(':id/balance')
  getBalance(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.walletsService.getBalance(req.user.sub, id);
  }

  @Post(':id/execute')
  execute(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ExecuteWalletDto,
  ) {
    return this.walletsService.execute(req.user.sub, id, dto);
  }

  @Post(':id/sign')
  sign(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: SignWalletDto,
  ) {
    return this.walletsService.sign(req.user.sub, id, dto);
  }

  @Post(':id/trustline')
  addTrustline(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: TrustlineDto,
  ) {
    return this.walletsService.addTrustline(req.user.sub, id, dto);
  }

  @Post(':id/recover-device')
  recoverDevice(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: RecoverDeviceDto,
  ) {
    return this.walletsService.recoverDevice(req.user.sub, id, dto);
  }
}
