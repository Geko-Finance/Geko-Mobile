import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, url } = req;
    const startedAt = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;

      this.logger.log(
        `${method} ${url} ${res.statusCode} - ${durationMs}ms`,
      );
    });

    next();
  }
}
