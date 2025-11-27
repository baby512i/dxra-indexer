import { Controller, Get } from '@nestjs/common';
import { MemoryCacheService } from '../storage/memory-cache';
import { WebSocketService } from '../indexer/websocket.service';

@Controller()
export class HealthController {
  constructor(
    private readonly memoryCache: MemoryCacheService,
    private readonly webSocketService: WebSocketService,
  ) {}

  @Get()
  getHealth() {
    const mainnetPools = this.memoryCache.getAllPools('mainnet');
    const devnetPools = this.memoryCache.getAllPools('devnet');
    const websocketConnections = this.webSocketService.getConnectionStatus();

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
      websocketConnections,
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

