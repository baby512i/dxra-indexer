import { Controller, Get } from '@nestjs/common';
import { MemoryCacheService } from '../storage/memory-cache';

@Controller()
export class HealthController {
  constructor(private readonly memoryCache: MemoryCacheService) {}

  @Get()
  getHealth() {
    const mainnetPools = this.memoryCache.getAllPools('mainnet');
    const devnetPools = this.memoryCache.getAllPools('devnet');

    return {
      status: 'ok',
      message: 'dxra-indexer API is running',
      version: '1.0.0',
      endpoints: {
        mainnet: '/pools?mint=<token_mint_address>',
        devnet: '/pools/devnet?mint=<token_mint_address>',
      },
      stats: {
        mainnetPools: mainnetPools.length,
        devnetPools: devnetPools.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  getHealthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

