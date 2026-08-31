import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // rawBody: o webhook do Melhor Envio assina o corpo cru (HMAC X-ME-Signature),
  // então precisamos dele além do JSON já parseado.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // FRONTEND_URL aceita lista separada por vírgula (mais de um domínio publicado)
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  await app.listen(process.env.PORT || 3001);
  console.log(`🧵 Loja de Feltros API running on port ${process.env.PORT || 3001}`);
}
bootstrap();
