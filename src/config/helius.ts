export default () => {
  const apiKey = process.env.HELIUS_API_KEY ?? '';
  
  return {
    port: parseInt(process.env.PORT ?? '8000', 10),
    env: process.env.NODE_ENV ?? 'development',
    heliusApiKey: apiKey,
  };
};

