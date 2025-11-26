import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FileStorageService } from './file-storage';
import { MemoryCacheService } from './memory-cache';
import { PruneService } from './prune.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [FileStorageService, MemoryCacheService, PruneService],
  exports: [MemoryCacheService, FileStorageService],
})
export class StorageModule {}

