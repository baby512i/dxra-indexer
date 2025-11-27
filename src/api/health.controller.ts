import { Controller, Get, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { MemoryCacheService } from '../storage/memory-cache';
import { WebSocketService } from '../indexer/websocket.service';
import {
  HealthResponseDto,
  HealthCheckResponseDto,
} from './dto/health-response.dto';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly memoryCache: MemoryCacheService,
    private readonly webSocketService: WebSocketService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get API health status',
    description:
      'Returns the overall health status of the API, including pool statistics and available endpoints.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API is healthy and running',
    type: HealthResponseDto,
  })
  getHealth(): HealthResponseDto {
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
  @ApiOperation({
    summary: 'Get detailed health check',
    description:
      'Returns detailed health information including WebSocket connection statuses for all monitored pool types.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health check information',
    type: HealthCheckResponseDto,
  })
  getHealthCheck(): HealthCheckResponseDto {
    const websocketConnections = this.webSocketService.getConnectionStatus();

    return {
      status: 'ok',
      websocketConnections,
      timestamp: new Date().toISOString(),
    };
  }
}

