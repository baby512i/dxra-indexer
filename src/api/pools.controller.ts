import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { MemoryCacheService } from '../storage/memory-cache';
import { Pool, Network } from '../common/types';

interface PoolsResponse {
  mint: string;
  network: Network;
  pools: Pool[];
  count: number;
}

@Controller('pools')
export class PoolsController {
  constructor(private readonly memoryCache: MemoryCacheService) {}

  @Get()
  async getPools(@Query('mint') mint: string): Promise<PoolsResponse> {
    if (!mint || mint.trim() === '') {
      throw new BadRequestException('Mint parameter is required');
    }

    const pools = this.memoryCache.getPoolsByMint('mainnet', mint.trim());
    return {
      mint: mint.trim(),
      network: 'mainnet',
      pools,
      count: pools.length,
    };
  }

  @Get('devnet')
  async getDevnetPools(@Query('mint') mint: string): Promise<PoolsResponse> {
    if (!mint || mint.trim() === '') {
      throw new BadRequestException('Mint parameter is required');
    }

    const pools = this.memoryCache.getPoolsByMint('devnet', mint.trim());
    return {
      mint: mint.trim(),
      network: 'devnet',
      pools,
      count: pools.length,
    };
  }
}

