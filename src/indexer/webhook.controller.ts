import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('raydium')
  @HttpCode(HttpStatus.OK)
  async handleRaydiumWebhook(@Body() payload: any): Promise<{ success: boolean }> {
    // Validate webhook secret from request body
    if (!this.webhookService.validateWebhookSecret(payload)) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    // Process the webhook asynchronously
    await this.webhookService.processWebhook(payload);

    return { success: true };
  }
}

