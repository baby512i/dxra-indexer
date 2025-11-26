import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemoryCacheService } from '../storage/memory-cache';
import { detectAMMV4 } from './pool-creation-detectors/ammv4';
import { detectCPMM } from './pool-creation-detectors/cpmm';
import { detectCLMM } from './pool-creation-detectors/clmm';
import { Pool } from '../common/types';

@Injectable()
export class WebhookService {
  constructor(
    private readonly configService: ConfigService,
    private readonly memoryCache: MemoryCacheService,
  ) {}

  async processWebhook(payload: any): Promise<void> {
    try {
      // Helius Enhanced Webhook format
      const transactions = payload?.type === 'ENHANCED' 
        ? payload?.data 
        : Array.isArray(payload) 
          ? payload 
          : [payload];

      for (const tx of transactions) {
        // Try each detector
        const detectors = [
          { name: 'AMMV4', detect: detectAMMV4 },
          { name: 'CPMM', detect: detectCPMM },
          { name: 'CLMM', detect: detectCLMM },
        ];

        for (const detector of detectors) {
          const pool = detector.detect(tx);
          if (pool) {
            // Check if pool already exists (avoid duplicates)
            const existingPools = this.memoryCache.getPoolsByMint(
              pool.network,
              pool.mintA,
            );
            const isDuplicate = existingPools.some(
              (p) => p.signature === pool.signature,
            );

            if (!isDuplicate) {
              this.memoryCache.addPool(pool.network, pool);
              console.log(
                `Detected new ${pool.poolType} pool on ${pool.network}: ${pool.poolAddress}`,
              );
            }
            break; // Only one detector should match
          }
        }
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }
  }

  validateWebhookSecret(payload: any): boolean {
    const expectedSecret = this.configService.get<string>('heliusWebhookSecret');
    if (!expectedSecret) {
      // If no secret is configured, allow all requests
      return true;
    }

    const providedSecret = payload?.secret || payload?.webhookSecret;
    return providedSecret === expectedSecret;
  }
}

