import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [ConfigModule, StorageModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class IndexerModule {}

