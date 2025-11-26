import { Controller, Post, Body, Headers, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('raydium')
  @HttpCode(HttpStatus.OK)
  async handleRaydiumWebhook(
    @Body() payload: any,
    @Headers() headers: any,
  ): Promise<{ success: boolean }> {
    // Validate webhook ID or secret
    if (!this.webhookService.validateWebhook(payload, headers)) {
      throw new UnauthorizedException('Invalid webhook authentication');
    }

    // Process the webhook asynchronously
    await this.webhookService.processWebhook(payload);

    return { success: true };
  }
}

