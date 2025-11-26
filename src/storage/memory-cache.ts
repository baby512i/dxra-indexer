import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool, Network } from '../common/types';
import { FileStorageService } from './file-storage';

@Injectable()
export class MemoryCacheService implements OnModuleInit {
  private mainnetPools = new Map<string, Pool[]>();
  private devnetPools = new Map<string, Pool[]>();

  constructor(private readonly fileStorage: FileStorageService) {}

  onModuleInit() {
    this.loadFromDisk();
  }

  loadFromDisk(): void {
    const mainnetPools = this.fileStorage.load('mainnet');
    const devnetPools = this.fileStorage.load('devnet');

    this.mainnetPools.clear();
    this.devnetPools.clear();

    mainnetPools.forEach((pool) => {
      this.addPoolToMemory('mainnet', pool);
    });

    devnetPools.forEach((pool) => {
      this.addPoolToMemory('devnet', pool);
    });

    console.log(`Loaded ${mainnetPools.length} mainnet pools and ${devnetPools.length} devnet pools from disk`);
  }

  private addPoolToMemory(network: Network, pool: Pool): void {
    const poolsMap = network === 'mainnet' ? this.mainnetPools : this.devnetPools;

    // Add pool indexed by mintA
    if (!poolsMap.has(pool.mintA)) {
      poolsMap.set(pool.mintA, []);
    }
    poolsMap.get(pool.mintA)!.push(pool);

    // Add pool indexed by mintB
    if (!poolsMap.has(pool.mintB)) {
      poolsMap.set(pool.mintB, []);
    }
    poolsMap.get(pool.mintB)!.push(pool);
  }

  addPool(network: Network, pool: Pool): void {
    this.addPoolToMemory(network, pool);
    this.fileStorage.append(network, pool);
  }

  getPoolsByMint(network: Network, mint: string): Pool[] {
    const poolsMap = network === 'mainnet' ? this.mainnetPools : this.devnetPools;
    return poolsMap.get(mint) || [];
  }

  getAllPools(network: Network): Pool[] {
    const poolsMap = network === 'mainnet' ? this.mainnetPools : this.devnetPools;
    const allPools: Pool[] = [];
    const seenSignatures = new Set<string>();

    poolsMap.forEach((pools) => {
      pools.forEach((pool) => {
        if (!seenSignatures.has(pool.signature)) {
          seenSignatures.add(pool.signature);
          allPools.push(pool);
        }
      });
    });

    return allPools;
  }

  removePool(network: Network, pool: Pool): void {
    const poolsMap = network === 'mainnet' ? this.mainnetPools : this.devnetPools;

    // Remove from mintA index
    const poolsA = poolsMap.get(pool.mintA);
    if (poolsA) {
      const indexA = poolsA.findIndex((p) => p.signature === pool.signature);
      if (indexA !== -1) {
        poolsA.splice(indexA, 1);
        if (poolsA.length === 0) {
          poolsMap.delete(pool.mintA);
        }
      }
    }

    // Remove from mintB index
    const poolsB = poolsMap.get(pool.mintB);
    if (poolsB) {
      const indexB = poolsB.findIndex((p) => p.signature === pool.signature);
      if (indexB !== -1) {
        poolsB.splice(indexB, 1);
        if (poolsB.length === 0) {
          poolsMap.delete(pool.mintB);
        }
      }
    }
  }

  clear(network: Network): void {
    if (network === 'mainnet') {
      this.mainnetPools.clear();
    } else {
      this.devnetPools.clear();
    }
  }
}

