import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { MemoryCacheService } from './memory-cache';
import { FileStorageService } from './file-storage';
import { Pool, Network } from '../common/types';

@Injectable()
export class PruneService {
  private readonly PRUNE_AGE_MS = 60 * 60 * 1000; // 60 minutes

  constructor(
    private readonly memoryCache: MemoryCacheService,
    private readonly fileStorage: FileStorageService,
  ) {}

  @Interval(60000) // Every 60 seconds
  async pruneOldPools(): Promise<void> {
    const now = Date.now();
    const networks: Network[] = ['mainnet', 'devnet'];

    for (const network of networks) {
      const allPools = this.memoryCache.getAllPools(network);
      const freshPools: Pool[] = [];
      let removedCount = 0;

      allPools.forEach((pool) => {
        const age = now - pool.timestamp;
        if (age <= this.PRUNE_AGE_MS) {
          freshPools.push(pool);
        } else {
          this.memoryCache.removePool(network, pool);
          removedCount++;
        }
      });

      // Rewrite JSON file with only fresh pools
      if (removedCount > 0 || freshPools.length !== allPools.length) {
        this.fileStorage.save(network, freshPools);
        console.log(`Pruned ${removedCount} old pools from ${network}. ${freshPools.length} pools remaining.`);
      }
    }
  }
}

