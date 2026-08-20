import 'fake-indexeddb/auto';
import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Rate limiting keys on req.ip. Behind a TLS-terminating proxy that is the proxy's own
  // address, so every client shares one bucket unless Express is told how many hops to
  // trust. Left off by default: enabling it when there is no proxy in front would let a
  // client spoof X-Forwarded-For and sidestep the limit entirely.
  const trustProxy = configService.get<string>('TRUST_PROXY');

  if (trustProxy) {
    const hops = Number(trustProxy);
    app.set('trust proxy', Number.isFinite(hops) ? hops : trustProxy);
  }

  app.use(helmet());

  const mobileAppOrigin = configService.get<string>('MOBILE_APP_ORIGIN');
  if (!mobileAppOrigin) {
    throw new Error('MOBILE_APP_ORIGIN environment variable is required');
  }

  app.enableCors({
    origin: mobileAppOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);
}

bootstrap();
