import { Controller, Get, Query, Param } from '@nestjs/common';
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
    if (!mint) {
      return {
        mint: '',
        network: 'mainnet',
        pools: [],
        count: 0,
      };
    }

    const pools = this.memoryCache.getPoolsByMint('mainnet', mint);
    return {
      mint,
      network: 'mainnet',
      pools,
      count: pools.length,
    };
  }

  @Get('devnet')
  async getDevnetPools(@Query('mint') mint: string): Promise<PoolsResponse> {
    if (!mint) {
      return {
        mint: '',
        network: 'devnet',
        pools: [],
        count: 0,
      };
    }

    const pools = this.memoryCache.getPoolsByMint('devnet', mint);
    return {
      mint,
      network: 'devnet',
      pools,
      count: pools.length,
    };
  }
}

