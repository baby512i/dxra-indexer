import { ApiProperty } from '@nestjs/swagger';

export class HealthStatsDto {
  @ApiProperty({
    description: 'Number of mainnet pools',
    example: 150,
  })
  mainnetPools: number;

  @ApiProperty({
    description: 'Number of devnet pools',
    example: 25,
  })
  devnetPools: number;
}

export class HealthEndpointsDto {
  @ApiProperty({
    description: 'Mainnet pools endpoint',
    example: '/pools?mint=<token_mint_address>',
  })
  mainnet: string;

  @ApiProperty({
    description: 'Devnet pools endpoint',
    example: '/pools/devnet?mint=<token_mint_address>',
  })
  devnet: string;
}

export class HealthResponseDto {
  @ApiProperty({
    description: 'Service status',
    example: 'ok',
  })
  status: string;

  @ApiProperty({
    description: 'Status message',
    example: 'dxra-indexer API is running',
  })
  message: string;

  @ApiProperty({
    description: 'API version',
    example: '1.0.0',
  })
  version: string;

  @ApiProperty({
    description: 'Available endpoints',
    type: HealthEndpointsDto,
  })
  endpoints: HealthEndpointsDto;

  @ApiProperty({
    description: 'Pool statistics',
    type: HealthStatsDto,
  })
  stats: HealthStatsDto;

  @ApiProperty({
    description: 'Current timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;
}

export class WebSocketConnectionStatusDto {
  @ApiProperty({
    description: 'Connection status',
    enum: ['connected', 'disconnected', 'connecting', 'closing'],
    example: 'connected',
  })
  status: string;

  @ApiProperty({
    description: 'Subscription ID',
    example: 12345,
    nullable: true,
  })
  subscriptionId: number | null;

  @ApiProperty({
    description: 'Number of reconnections in the last 24 hours',
    example: 2,
  })
  reconnectCount24h: number;
}

export class HealthCheckResponseDto {
  @ApiProperty({
    description: 'Service status',
    example: 'ok',
  })
  status: string;

  @ApiProperty({
    description: 'WebSocket connection statuses',
    type: 'object',
    additionalProperties: {
      type: 'object',
      $ref: '#/components/schemas/WebSocketConnectionStatusDto',
    },
    example: {
      'mainnet-CLMM': {
        status: 'connected',
        subscriptionId: 12345,
        reconnectCount24h: 0,
      },
    },
  })
  websocketConnections: Record<string, WebSocketConnectionStatusDto>;

  @ApiProperty({
    description: 'Current timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;
}

