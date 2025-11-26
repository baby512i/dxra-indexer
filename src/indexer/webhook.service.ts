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
      console.log('🔄 Processing webhook payload...');
      console.log('🔍 Analyzing payload structure...');
      
      let transactions: any[] = [];
      
      // Handle different Helius Enhanced webhook formats
      if (payload?.type === 'ENHANCED' || payload?.type === 'enhanced') {
        console.log('   ✓ Detected ENHANCED webhook type');
        
        // Enhanced format can have data in different places
        if (Array.isArray(payload?.data)) {
          transactions = payload.data;
          console.log('   ✓ Found transactions in payload.data array');
        } else if (Array.isArray(payload?.nativeTransactions)) {
          transactions = payload.nativeTransactions;
          console.log('   ✓ Found transactions in payload.nativeTransactions array');
        } else if (Array.isArray(payload?.accountData)) {
          transactions = payload.accountData;
          console.log('   ✓ Found transactions in payload.accountData array');
        } else if (payload?.data && typeof payload.data === 'object') {
          // Single transaction object in data
          transactions = [payload.data];
          console.log('   ✓ Found single transaction in payload.data object');
        }
      } else if (Array.isArray(payload)) {
        // Direct array format
        transactions = payload;
        console.log('   ✓ Using direct array format');
      } else if (Array.isArray(payload?.transactions)) {
        transactions = payload.transactions;
        console.log('   ✓ Found transactions in payload.transactions array');
      } else if (Array.isArray(payload?.results)) {
        transactions = payload.results;
        console.log('   ✓ Found transactions in payload.results array');
      } else if (payload) {
        // Single transaction object
        transactions = [payload];
        console.log('   ✓ Using single payload object as transaction');
      }

      console.log(`📊 Found ${transactions.length} transaction(s) to process`);
      
      if (transactions.length === 0) {
        console.log('⚠️  WARNING: No transactions found in webhook payload!');
        console.log('   This might mean:');
        console.log('   1. The webhook is configured but no matching transactions occurred yet');
        console.log('   2. The payload format is different than expected');
        console.log('   3. The transaction type filter might be too restrictive');
        return;
      }

      let poolsDetected = 0;
      let poolsAdded = 0;

      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        console.log(`\n🔍 Processing transaction ${i + 1}/${transactions.length}`);
        console.log(`   Transaction keys:`, Object.keys(tx || {}));
        console.log(`   Has "transaction" field:`, !!tx?.transaction);
        console.log(`   Has "meta" field:`, !!tx?.meta);
        console.log(`   Has "meta.logMessages":`, !!tx?.meta?.logMessages);
        console.log(`   Has "nativeTransfers":`, !!tx?.nativeTransfers);
        console.log(`   Has "tokenTransfers":`, !!tx?.tokenTransfers);
        
        // Check for log messages
        if (tx?.meta?.logMessages && Array.isArray(tx.meta.logMessages)) {
          console.log(`   Log messages count:`, tx.meta.logMessages.length);
          console.log(`   First 5 log messages:`, tx.meta.logMessages.slice(0, 5));
        }
        
        // Check for program IDs
        if (tx?.transaction?.message?.accountKeys) {
          const accountKeys = tx.transaction.message.accountKeys;
          console.log(`   Account keys count:`, Array.isArray(accountKeys) ? accountKeys.length : 'N/A');
        }
        
        // Try each detector
        const detectors = [
          { name: 'AMMV4', detect: detectAMMV4 },
          { name: 'CPMM', detect: detectCPMM },
          { name: 'CLMM', detect: detectCLMM },
        ];

        let detected = false;
        for (const detector of detectors) {
          try {
            const pool = detector.detect(tx);
            if (pool) {
              poolsDetected++;
              detected = true;
              
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
                poolsAdded++;
                console.log(
                  `✅ Detected new ${pool.poolType} pool on ${pool.network}: ${pool.poolAddress}`,
                );
                console.log(`   MintA: ${pool.mintA}, MintB: ${pool.mintB}`);
              } else {
                console.log(`⏭️  Pool ${pool.poolAddress} already exists, skipping`);
              }
              break; // Only one detector should match
            }
          } catch (error) {
            console.error(`   ❌ Error in ${detector.name} detector:`, error);
          }
        }
        
        if (!detected) {
          console.log(`   ⚠️  No pool creation detected in this transaction`);
          // Log transaction signature if available
          if (tx?.transaction?.signatures && tx.transaction.signatures.length > 0) {
            console.log(`   Transaction signature: ${tx.transaction.signatures[0]}`);
          }
        }
      }

      if (poolsDetected === 0) {
        console.log('ℹ️  No pool creation detected in this webhook payload');
      } else {
        console.log(`📈 Summary: ${poolsDetected} pool(s) detected, ${poolsAdded} new pool(s) added`);
      }
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  validateWebhook(payload: any, headers?: any): boolean {
    // Check for webhook ID (primary method)
    const expectedWebhookId = this.configService.get<string>('heliusWebhookId');
    if (expectedWebhookId) {
      // Check in headers (Helius typically sends webhook ID in headers)
      const webhookIdFromHeader = headers?.['x-webhook-id'] || headers?.['webhook-id'];
      // Check in payload
      const webhookIdFromPayload = payload?.webhookId || payload?.id;
      
      if (webhookIdFromHeader === expectedWebhookId || webhookIdFromPayload === expectedWebhookId) {
        return true;
      }
      
      // If webhook ID is configured but doesn't match, reject
      if (webhookIdFromHeader || webhookIdFromPayload) {
        return false;
      }
    }

    // Fallback to secret validation (if webhook ID not configured)
    const expectedSecret = this.configService.get<string>('heliusWebhookSecret');
    if (expectedSecret) {
      const providedSecret = payload?.secret || payload?.webhookSecret;
      return providedSecret === expectedSecret;
    }

    // If neither webhook ID nor secret is configured, allow all requests (development mode)
    return true;
  }
}

