import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RefreshTokenGuard } from '../shared/guards/refresh-token.guard';
import { AuthenticatedRequest } from '../shared/types/authenticated-request';
import { OAuthProvider } from './auth.types';
import { AuthService } from './auth.service';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    return this.authService.verifyOtp(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('oauth/:provider/url')
  getOAuthUrl(
    @Param('provider') provider: string,
    @Query('redirectUri') redirectUri: string,
  ) {
    const oauthProvider = this.parseOAuthProvider(provider);

    if (!redirectUri) {
      throw new BadRequestException('redirectUri is required');
    }

    return this.authService.getOAuthUrl(oauthProvider, redirectUri);
  }

  @Post('oauth/:provider/callback')
  handleOAuthCallback(
    @Param('provider') provider: string,
    @Body() dto: OAuthCallbackDto,
    @Req() req: Request,
  ) {
    const oauthProvider = this.parseOAuthProvider(provider);
    return this.authService.handleOAuthCallback(oauthProvider, dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: AuthenticatedRequest, @Body() dto: RefreshDto) {
    return this.authService.logout(req.user.sub, dto.refreshToken);
  }

  private parseOAuthProvider(provider: string): OAuthProvider {
    if (provider !== 'google' && provider !== 'apple') {
      throw new BadRequestException('Invalid OAuth provider');
    }

    return provider;
  }
}
