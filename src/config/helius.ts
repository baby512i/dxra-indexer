export default () => {
  // Support separate keys for mainnet and devnet, with backward compatibility
  const apiKeyMainnet = process.env.HELIUS_API_KEY_MAINNET ?? process.env.HELIUS_API_KEY ?? '';
  const apiKeyDevnet = process.env.HELIUS_API_KEY_DEVNET ?? process.env.HELIUS_API_KEY ?? '';
  
  return {
    port: parseInt(process.env.PORT ?? '8000', 10),
    env: process.env.NODE_ENV ?? 'development',
    heliusApiKeyMainnet: apiKeyMainnet,
    heliusApiKeyDevnet: apiKeyDevnet,
    // Keep for backward compatibility
    heliusApiKey: process.env.HELIUS_API_KEY ?? '',
  };
};

