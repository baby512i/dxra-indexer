import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IndexerModule } from './indexer/indexer.module';
import { StorageModule } from './storage/storage.module';
import { ApiModule } from './api/api.module';
import heliusConfig from './config/helius';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [heliusConfig],
    }),
    StorageModule,
    IndexerModule,
    ApiModule,
  ],
})
export class AppModule {}

