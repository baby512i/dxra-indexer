import { Module } from '@nestjs/common';
import { PoolsController } from './pools.controller';
import { HealthController } from './health.controller';
import { StorageModule } from '../storage/storage.module';
import { IndexerModule } from '../indexer/indexer.module';

@Module({
  imports: [StorageModule, IndexerModule],
  controllers: [PoolsController, HealthController],
})
export class ApiModule {}

