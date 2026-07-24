import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

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
