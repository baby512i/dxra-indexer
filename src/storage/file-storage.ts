import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Pool, Network } from '../common/types';

@Injectable()
export class FileStorageService {
  private readonly dataDir = path.join(process.cwd(), 'data');

  private getFilePath(network: Network): string {
    const filename = network === 'mainnet' ? 'pools-mainnet.json' : 'pools-devnet.json';
    return path.join(this.dataDir, filename);
  }

  load(network: Network): Pool[] {
    const filePath = this.getFilePath(network);
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error loading pools for ${network}:`, error);
      return [];
    }
  }

  save(network: Network, pools: Pool[]): void {
    const filePath = this.getFilePath(network);
    try {
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(pools, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Error saving pools for ${network}:`, error);
    }
  }

  append(network: Network, pool: Pool): void {
    const pools = this.load(network);
    pools.push(pool);
    this.save(network, pools);
  }
}

