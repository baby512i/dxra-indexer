export default () => ({
  port: parseInt(process.env.PORT ?? '8000', 10),
  env: process.env.NODE_ENV ?? 'development',
  heliusWebhookSecret: process.env.HELIUS_WEBHOOK_SECRET ?? '',
  heliusWebhookId: process.env.HELIUS_WEBHOOK_ID ?? '',
});

