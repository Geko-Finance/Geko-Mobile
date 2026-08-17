import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpThrottlerGuard } from './guards/otp-throttler.guard';
import { CavosVerificationProvider } from './providers/cavos-verification.provider';
import { AuthIdentitiesRepository } from './repositories/auth-identities.repository';
import { SessionsRepository } from './repositories/sessions.repository';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthIdentitiesRepository,
    SessionsRepository,
    CavosVerificationProvider,
    OtpThrottlerGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
