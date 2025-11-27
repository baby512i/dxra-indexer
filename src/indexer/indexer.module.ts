import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebSocketService } from './websocket.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [ConfigModule, StorageModule],
  providers: [WebSocketService],
  exports: [WebSocketService],
})
export class IndexerModule {}

