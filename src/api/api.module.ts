import { Module } from '@nestjs/common';
import { PoolsController } from './pools.controller';
import { HealthController } from './health.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [PoolsController, HealthController],
})
export class ApiModule {}

