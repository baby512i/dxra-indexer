import { Controller, Post, Get, Body, Headers, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { ConfigService } from '@nestjs/config';

@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Get('raydium')
  getWebhookStatus() {
    const webhookId = this.configService.get<string>('heliusWebhookId');
    const webhookSecret = this.configService.get<string>('heliusWebhookSecret');
    
    return {
      endpoint: '/webhook/raydium',
      method: 'POST',
      status: 'active',
      authentication: {
        webhookIdConfigured: !!webhookId,
        webhookSecretConfigured: !!webhookSecret,
        mode: webhookId ? 'webhook-id' : webhookSecret ? 'secret' : 'development (no auth)',
      },
      message: 'This endpoint accepts POST requests from Helius. Use POST method to send webhook data.',
      note: 'For testing, use curl or Postman to send a POST request with webhook payload.',
    };
  }

  @Post('raydium')
  @HttpCode(HttpStatus.OK)
  async handleRaydiumWebhook(
    @Body() payload: any,
    @Headers() headers: any,
  ): Promise<{ success: boolean; message?: string }> {
    console.log('📥 Webhook received at:', new Date().toISOString());
    console.log('📋 Headers:', JSON.stringify(headers, null, 2));
    
    // Detailed payload inspection
    console.log('📦 Payload Structure:');
    console.log('   - Type:', payload?.type || 'none');
    console.log('   - Keys:', Object.keys(payload || {}));
    console.log('   - Is Array:', Array.isArray(payload));
    console.log('   - Has "data":', !!payload?.data, typeof payload?.data);
    console.log('   - Has "accountData":', !!payload?.accountData);
    console.log('   - Has "transactions":', !!payload?.transactions);
    console.log('   - Has "nativeTransactions":', !!payload?.nativeTransactions);
    console.log('   - Has "results":', !!payload?.results);
    
    // Log full payload structure (truncated to avoid spam)
    const payloadPreview = JSON.stringify(payload, null, 2);
    console.log('📦 Full Payload (first 3000 chars):');
    console.log(payloadPreview.substring(0, 3000));
    if (payloadPreview.length > 3000) {
      console.log(`   ... (${payloadPreview.length - 3000} more characters)`);
    }
    
    // Validate webhook ID or secret
    if (!this.webhookService.validateWebhook(payload, headers)) {
      console.error('❌ Webhook validation failed');
      throw new UnauthorizedException('Invalid webhook authentication');
    }

    console.log('✅ Webhook validated successfully');

    // Process the webhook asynchronously
    try {
      await this.webhookService.processWebhook(payload);
      console.log('✅ Webhook processed successfully');
      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      // Still return success to Helius to avoid retries on processing errors
      return { success: true, message: 'Webhook received but processing failed. Check server logs.' };
    }
  }
}

