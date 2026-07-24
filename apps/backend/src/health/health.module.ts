import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DrizzleHealthIndicator } from './drizzle.health';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [DrizzleHealthIndicator],
})
export class HealthModule {}
