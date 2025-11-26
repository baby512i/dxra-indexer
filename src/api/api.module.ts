import { Module } from '@nestjs/common';
import { PoolsController } from './pools.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [PoolsController],
})
export class ApiModule {}

