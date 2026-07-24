import { Inject, Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { Database, DRIZZLE } from '../database/database.module';

@Injectable()
export class DrizzleHealthIndicator extends HealthIndicator {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.db.execute(sql`SELECT 1`);

      return this.getStatus(key, true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown database error';

      throw new HealthCheckError(
        'Postgres check failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
