import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { MemoryCacheService } from './storage/memory-cache';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Load pools from disk into memory cache
  const memoryCache = app.get(MemoryCacheService);
  memoryCache.loadFromDisk();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 8000;

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 dxra-indexer is running on http://0.0.0.0:${port}`);
}

bootstrap();

