import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { LoggingMiddleware } from './middleware/logging.middleware';

@Global()
@Module({
  imports: [
    JwtModule.register({}),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
  ],
  providers: [
    JwtAuthGuard,
    RefreshTokenGuard,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  // ThrottlerModule is re-exported so feature modules can register their own
  // ThrottlerGuard subclasses (see auth/guards/otp-throttler.guard.ts).
  exports: [JwtModule, JwtAuthGuard, RefreshTokenGuard, ThrottlerModule],
})
export class SharedModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
