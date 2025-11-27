import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { MemoryCacheService } from './storage/memory-cache';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true, // Trust proxy headers from Nginx
    }),
  );

  // Load pools from disk into memory cache
  const memoryCache = app.get(MemoryCacheService);
  memoryCache.loadFromDisk();

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('DXRA Indexer API')
    .setDescription(
      'API for querying Raydium pool data indexed from Solana blockchain. ' +
      'This service monitors and indexes new pool creations from various Raydium pool types (CLMM, CPMM, AMMV4, LAUNCHLAB).',
    )
    .setVersion('1.0.0')
    .addTag('pools', 'Pool query endpoints')
    .addTag('health', 'Health check and status endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'DXRA Indexer API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 8000;

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 dxra-indexer is running on http://0.0.0.0:${port}`);
  console.log(`📚 Swagger documentation available at http://0.0.0.0:${port}/api`);
}

bootstrap();

