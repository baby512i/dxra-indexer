import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from '@solana/web3.js';
import WebSocket from 'ws';
import { MemoryCacheService } from '../storage/memory-cache';
import { Pool, Network } from '../common/types';
import { RAYDIUM_MAINNET_PROGRAMS, RAYDIUM_DEVNET_PROGRAMS } from '../config/programs';

interface ConnectionEvent {
  timestamp: Date;
  type: 'disconnected' | 'reconnected';
}

interface WebSocketConnection {
  ws: WebSocket | null;
  subscriptionId: number | null;
  reconnectAttempts: number;
  reconnectTimeout: NodeJS.Timeout | null;
  connectionEvents: ConnectionEvent[];
}

@Injectable()
export class WebSocketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebSocketService.name);
  private connections = new Map<string, WebSocketConnection>();
  private rpcConnections = new Map<Network, Connection>();
  private readonly maxReconnectAttempts = 10;
  private readonly baseReconnectDelay = 3000;

  constructor(
    private readonly configService: ConfigService,
    private readonly memoryCache: MemoryCacheService,
  ) {}

  onModuleInit() {
    const apiKeyMainnet = this.configService.get<string>('heliusApiKeyMainnet');
    const apiKeyDevnet = this.configService.get<string>('heliusApiKeyDevnet');

    if (!apiKeyMainnet && !apiKeyDevnet) {
      this.logger.error('Neither HELIUS_API_KEY_MAINNET nor HELIUS_API_KEY_DEVNET is configured. WebSocket connections will not be established.');
      return;
    }

    if (!apiKeyMainnet) {
      this.logger.warn('HELIUS_API_KEY_MAINNET is not configured. Mainnet connections will not be established.');
    }

    if (!apiKeyDevnet) {
      this.logger.warn('HELIUS_API_KEY_DEVNET is not configured. Devnet connections will not be established.');
    }

    this.initializeRpcConnections();
    this.initializeWebSocketConnections();
  }

  onModuleDestroy() {
    this.logger.log('Shutting down WebSocket connections...');
    this.connections.forEach((conn, key) => {
      if (conn.ws) {
        conn.ws.close();
      }
      if (conn.reconnectTimeout) {
        clearTimeout(conn.reconnectTimeout);
      }
    });
    this.connections.clear();
  }

  private initializeRpcConnections() {
    const apiKeyMainnet = this.configService.get<string>('heliusApiKeyMainnet');
    const apiKeyDevnet = this.configService.get<string>('heliusApiKeyDevnet');
    
    if (apiKeyMainnet) {
      const mainnetRpc = `https://mainnet.helius-rpc.com/?api-key=${apiKeyMainnet}`;
      this.rpcConnections.set('mainnet', new Connection(mainnetRpc, 'confirmed'));
      this.logger.log('Mainnet RPC connection initialized');
    }

    if (apiKeyDevnet) {
      const devnetRpc = `https://devnet.helius-rpc.com/?api-key=${apiKeyDevnet}`;
      this.rpcConnections.set('devnet', new Connection(devnetRpc, 'confirmed'));
      this.logger.log('Devnet RPC connection initialized');
    }
  }

  private initializeWebSocketConnections() {
    const apiKeyMainnet = this.configService.get<string>('heliusApiKeyMainnet');
    const apiKeyDevnet = this.configService.get<string>('heliusApiKeyDevnet');
    
    // Mainnet connections
    if (apiKeyMainnet) {
      const mainnetWss = `wss://mainnet.helius-rpc.com/?api-key=${apiKeyMainnet}`;
      this.createConnection('mainnet', 'CLMM', RAYDIUM_MAINNET_PROGRAMS.CLMM, mainnetWss);
      this.createConnection('mainnet', 'CPMM', RAYDIUM_MAINNET_PROGRAMS.CPMM, mainnetWss);
      this.createConnection('mainnet', 'AMMV4', RAYDIUM_MAINNET_PROGRAMS.AMMV4, mainnetWss);
      this.createConnection('mainnet', 'LAUNCHLAB', RAYDIUM_MAINNET_PROGRAMS.LAUNCHLAB, mainnetWss);
    }

    // Devnet connections
    if (apiKeyDevnet) {
      const devnetWss = `wss://devnet.helius-rpc.com/?api-key=${apiKeyDevnet}`;
      this.createConnection('devnet', 'CLMM', RAYDIUM_DEVNET_PROGRAMS.CLMM, devnetWss);
      this.createConnection('devnet', 'CPMM', RAYDIUM_DEVNET_PROGRAMS.CPMM, devnetWss);
      this.createConnection('devnet', 'AMMV4', RAYDIUM_DEVNET_PROGRAMS.AMMV4, devnetWss);
      this.createConnection('devnet', 'LAUNCHLAB', RAYDIUM_DEVNET_PROGRAMS.LAUNCHLAB, devnetWss);
    }
  }

  private createConnection(
    network: Network,
    poolType: string,
    programId: string,
    wssEndpoint: string,
  ): void {
    const key = `${network}-${poolType}`;
    
    const connection: WebSocketConnection = {
      ws: null,
      subscriptionId: null,
      reconnectAttempts: 0,
      reconnectTimeout: null,
      connectionEvents: [],
    };

    this.connections.set(key, connection);
    this.connectWebSocket(network, poolType, programId, wssEndpoint, key);
  }

  private connectWebSocket(
    network: Network,
    poolType: string,
    programId: string,
    wssEndpoint: string,
    key: string,
  ): void {
    const conn = this.connections.get(key);
    if (!conn) return;

    try {
      const ws = new WebSocket(wssEndpoint);
      conn.ws = ws;

      ws.on('open', () => {
        this.logger.log(`✓ Connected to Helius WebSocket for ${poolType} on ${network}`);
        conn.reconnectAttempts = 0;
        
        // Track reconnection event
        conn.connectionEvents.push({
          timestamp: new Date(),
          type: 'reconnected',
        });
        
        // Clean up events older than 24 hours
        this.cleanupOldEvents(conn);

        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'logsSubscribe',
            params: [
              {
                mentions: [programId],
              },
              { commitment: 'finalized' },
            ],
          }),
        );
      });

      ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data, network, poolType, programId, key);
      });

      ws.on('error', (error) => {
        this.logger.error(`WebSocket error for ${poolType} on ${network}:`, error.message);
      });

      ws.on('close', () => {
        this.logger.warn(`WebSocket closed for ${poolType} on ${network}. Reconnecting...`);
        conn.ws = null;
        conn.subscriptionId = null;
        
        // Track disconnection event
        conn.connectionEvents.push({
          timestamp: new Date(),
          type: 'disconnected',
        });
        
        // Clean up events older than 24 hours
        this.cleanupOldEvents(conn);
        
        this.scheduleReconnect(network, poolType, programId, wssEndpoint, key);
      });
    } catch (error) {
      this.logger.error(`Error creating WebSocket for ${poolType} on ${network}:`, error);
      this.scheduleReconnect(network, poolType, programId, wssEndpoint, key);
    }
  }

  private handleMessage(
    data: WebSocket.Data,
    network: Network,
    poolType: string,
    programId: string,
    key: string,
  ): void {
    try {
      const message = JSON.parse(data.toString());
      const conn = this.connections.get(key);
      if (!conn) return;

      // Handle subscription confirmation
      if (message.result !== undefined && typeof message.result === 'number') {
        conn.subscriptionId = message.result;
        this.logger.log(
          `✓ Subscribed to ${poolType} logs on ${network} (subscription ID: ${conn.subscriptionId})`,
        );
        return;
      }

      // Handle subscription errors
      if (message.error) {
        this.logger.error(`Subscription error for ${poolType} on ${network}:`, message.error);
        return;
      }

      // Handle log notifications
      if (message.method !== 'logsNotification') return;

      const notif = message.params?.result;
      if (!notif) return;

      const { value, context } = notif;
      const { signature, err, logs } = value;

      // Skip failed transactions
      if (err !== null) return;

      // Verify the program ID appears in logs
      const logsText = logs.join('\n');
      if (!logsText.includes(programId)) return;

      // Detect pool creation
      const detectedPoolType = this.detectPoolType(logs, programId, network);
      if (!detectedPoolType) return;

      this.logger.log(`\n${'='.repeat(60)}`);
      this.logger.log(`🔥 NEW RAYDIUM POOL CREATED - ${detectedPoolType.toUpperCase()}`);
      this.logger.log('-'.repeat(60));
      this.logger.log(`Pool Type: ${detectedPoolType}`);
      this.logger.log(`Network: ${network}`);
      this.logger.log(`Program ID: ${programId}`);
      this.logger.log(`Signature: ${signature}`);
      this.logger.log(`Slot: ${context.slot}`);
      this.logger.log(`Timestamp: ${new Date().toISOString()}`);
      this.logger.log('-'.repeat(60));
      this.logger.log('='.repeat(60) + '\n');

      // Extract and save pool data
      this.extractAndSavePoolData(signature, detectedPoolType, programId, network);
    } catch (error) {
      this.logger.error(`Error handling WebSocket message:`, error);
    }
  }

  private detectPoolType(logs: string[], programId: string, network: Network): string | null {
    if (!logs || logs.length === 0) return null;

    const text = logs.join('\n').toLowerCase();
    const programs = network === 'mainnet' ? RAYDIUM_MAINNET_PROGRAMS : RAYDIUM_DEVNET_PROGRAMS;

    // Check CLMM
    if (programId === programs.CLMM) {
      const patterns = ['instruction: createpool', 'instruction: create_pool', 'instruction: create pool'];
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          return 'CLMM';
        }
      }
    }

    // Check CPMM - Pool creation requires both Initialize AND InitializeMint2
    if (programId === programs.CPMM) {
      const hasInitialize = text.includes('instruction: initialize');
      const hasInitializeMint2 = text.includes('instruction: initializemint2');
      const hasLiquidityLog =
        text.includes('liquidity:') &&
        text.includes('vault_0_amount') &&
        text.includes('vault_1_amount');

      if (hasInitialize && (hasInitializeMint2 || hasLiquidityLog)) {
        return 'CPMM';
      }
    }

    // Check LaunchLab
    if (programId === programs.LAUNCHLAB) {
      const patterns = ['instruction: initializev2', 'instruction: initialize_v2'];
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          return 'LAUNCHLAB';
        }
      }
    }

    // Check AMM v4
    if (programId === programs.AMMV4) {
      const patterns = ['initialize2: initializeinstruction2', 'program log: initialize2:'];
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          return 'AMMV4';
        }
      }
    }

    return null;
  }

  private async extractAndSavePoolData(
    signature: string,
    poolType: string,
    programId: string,
    network: Network,
  ): Promise<void> {
    try {
      this.logger.log(`🔍 Extracting pool data from ${poolType} transaction...`);
      this.logger.log(`   Transaction signature: ${signature}`);

      const connection = this.rpcConnections.get(network);
      if (!connection) {
        this.logger.error(`No RPC connection for ${network}`);
        return;
      }

      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx || tx.meta?.err) {
        this.logger.error(`❌ Transaction not found or failed: ${signature}`);
        return;
      }

      const poolData = this.extractPoolDataFromTransaction(tx, poolType, programId, network, signature);
      
      if (!poolData) {
        this.logger.warn(`⚠️  Could not extract pool data from transaction: ${signature}`);
        return;
      }

      // Check if pool already exists (avoid duplicates)
      const existingPools = this.memoryCache.getPoolsByMint(network, poolData.mintA);
      const isDuplicate = existingPools.some((p) => p.signature === poolData.signature);

      if (!isDuplicate) {
        this.memoryCache.addPool(network, poolData);
        this.logger.log(`✅ Detected new ${poolData.poolType} pool on ${network}: ${poolData.poolAddress}`);
        this.logger.log(`   MintA: ${poolData.mintA}, MintB: ${poolData.mintB}`);
      } else {
        this.logger.log(`⏭️  Pool ${poolData.poolAddress} already exists, skipping`);
      }
    } catch (error) {
      this.logger.error(`❌ Error extracting pool data: ${error.message}`);
    }
  }

  private extractPoolDataFromTransaction(
    tx: any,
    poolType: string,
    programId: string,
    network: Network,
    signature: string,
  ): Pool | null {
    try {
      const message = tx.transaction.message;

      // Get account keys
      let accountKeys: any[] = [];
      if (Array.isArray(message.accountKeys)) {
        accountKeys = message.accountKeys;
      } else if (message.staticAccountKeys && Array.isArray(message.staticAccountKeys)) {
        accountKeys = [...message.staticAccountKeys];
      } else {
        this.logger.error(`❌ Could not find account keys for transaction: ${signature}`);
        return null;
      }

      // Get instructions
      let instructions: any[] = [];
      if (message.instructions && Array.isArray(message.instructions)) {
        instructions = message.instructions;
      } else if (message.compiledInstructions && Array.isArray(message.compiledInstructions)) {
        instructions = message.compiledInstructions;
      }

      let mintA: string | null = null;
      let mintB: string | null = null;
      let poolId: string | null = null;

      // Find the pool creation instruction
      let poolInstruction: any = null;
      for (const ix of instructions) {
        const programIdIndex = ix.programIdIndex;
        if (programIdIndex !== undefined && accountKeys[programIdIndex]) {
          const ixProgramId = accountKeys[programIdIndex].toString();
          if (ixProgramId === programId) {
            poolInstruction = ix;
            break;
          }
        }
      }

      if (!poolInstruction) {
        this.logger.error(`❌ Pool creation instruction not found for transaction: ${signature}`);
        return null;
      }

      // Get account indices
      let accountIndices: number[] | null = null;
      if (poolInstruction.accounts && Array.isArray(poolInstruction.accounts)) {
        accountIndices = poolInstruction.accounts;
      } else if (
        poolInstruction.accountKeyIndexes &&
        Array.isArray(poolInstruction.accountKeyIndexes)
      ) {
        accountIndices = poolInstruction.accountKeyIndexes;
      }

      if (!accountIndices || accountIndices.length < 3) {
        this.logger.error(`❌ Invalid instruction structure for transaction: ${signature}`);
        return null;
      }

      // Extract based on pool type
      if (poolType === 'CLMM') {
        // CLMM CreatePool: accounts[2] = pool state, accounts[3] = mintA, accounts[4] = mintB
        if (accountIndices.length >= 5) {
          const poolIdIndex = accountIndices[2];
          const mintAIndex = accountIndices[3];
          const mintBIndex = accountIndices[4];

          // Extract pool ID
          if (poolIdIndex !== undefined && poolIdIndex < accountKeys.length && accountKeys[poolIdIndex]) {
            const poolIdKey = accountKeys[poolIdIndex];
            poolId = typeof poolIdKey === 'string' ? poolIdKey : poolIdKey.toString();
          }

          // Extract mintA
          if (mintAIndex !== undefined && mintAIndex < accountKeys.length && accountKeys[mintAIndex]) {
            const mintAKey = accountKeys[mintAIndex];
            mintA = typeof mintAKey === 'string' ? mintAKey : mintAKey.toString();
          }

          // Extract mintB
          if (mintBIndex !== undefined && mintBIndex < accountKeys.length && accountKeys[mintBIndex]) {
            const mintBKey = accountKeys[mintBIndex];
            mintB = typeof mintBKey === 'string' ? mintBKey : mintBKey.toString();
          }

          // Fallback: Extract from token balances
          if (!mintA || !mintB) {
            const allMints = new Set<string>();

            if (tx.meta?.postTokenBalances) {
              for (const balance of tx.meta.postTokenBalances) {
                if (balance.mint) {
                  allMints.add(balance.mint);
                }
              }
            }

            if (tx.meta?.preTokenBalances) {
              for (const balance of tx.meta.preTokenBalances) {
                if (balance.mint) {
                  allMints.add(balance.mint);
                }
              }
            }

            const mintArray = Array.from(allMints);
            if (mintArray.length >= 2) {
              if (!mintA) mintA = mintArray[0];
              if (!mintB) mintB = mintArray[1];
            } else if (mintArray.length === 1) {
              if (!mintA) mintA = mintArray[0];
              else if (!mintB) mintB = mintArray[0];
            }
          }
        }
      } else if (poolType === 'CPMM') {
        // CPMM Initialize: accounts[0] = pool state (pool ID)
        poolId = accountKeys[accountIndices[0]]?.toString() || null;

        // Find LP mint from InitializeMint2 instruction
        let lpMint: string | null = null;
        for (const ix of instructions) {
          const programIdIndex = ix.programIdIndex;
          if (programIdIndex !== undefined && accountKeys[programIdIndex]) {
            const ixProgramId = accountKeys[programIdIndex].toString();
            if (ixProgramId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
              const ixAccountIndices = ix.accounts || ix.accountKeyIndexes || [];
              if (ixAccountIndices.length >= 1) {
                lpMint = accountKeys[ixAccountIndices[0]]?.toString() || null;
              }
            }
          }
        }

        // Find mints from post-token balances, excluding LP mint
        if (tx.meta?.postTokenBalances) {
          const tokenMints = new Set<string>();
          for (const balance of tx.meta.postTokenBalances) {
            if (balance.mint && balance.mint !== lpMint) {
              tokenMints.add(balance.mint);
            }
          }
          const mintArray = Array.from(tokenMints);
          if (mintArray.length >= 2) {
            mintA = mintArray[0];
            mintB = mintArray[1];
          } else if (mintArray.length === 1) {
            mintA = mintArray[0];
          }
        }
      } else if (poolType === 'LAUNCHLAB') {
        // LaunchLab InitializeV2: accounts[0] = pool state (pool ID)
        poolId = accountKeys[accountIndices[0]]?.toString() || null;

        // Find LP mint from InitializeMint2 instruction
        let lpMint: string | null = null;
        for (const ix of instructions) {
          const programIdIndex = ix.programIdIndex;
          if (programIdIndex !== undefined && accountKeys[programIdIndex]) {
            const ixProgramId = accountKeys[programIdIndex].toString();
            if (ixProgramId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
              const ixAccountIndices = ix.accounts || ix.accountKeyIndexes || [];
              if (ixAccountIndices.length >= 1) {
                lpMint = accountKeys[ixAccountIndices[0]]?.toString() || null;
              }
            }
          }
        }

        // Find mints from post balances, excluding LP mint
        if (tx.meta?.postTokenBalances) {
          const tokenMints = new Set<string>();
          for (const balance of tx.meta.postTokenBalances) {
            if (balance.mint && balance.mint !== lpMint) {
              tokenMints.add(balance.mint);
            }
          }
          const mintArray = Array.from(tokenMints);
          if (mintArray.length >= 2) {
            mintA = mintArray[0];
            mintB = mintArray[1];
          }
        }
      } else if (poolType === 'AMMV4') {
        // AMM v4 initialize2: pool state is typically accounts[0]
        if (accountIndices.length >= 1) {
          poolId = accountKeys[accountIndices[0]]?.toString() || null;
        }

        // Find LP mint from InitializeMint
        let lpMint: string | null = null;
        for (const ix of instructions) {
          const programIdIndex = ix.programIdIndex;
          if (programIdIndex !== undefined && accountKeys[programIdIndex]) {
            const ixProgramId = accountKeys[programIdIndex].toString();
            if (ixProgramId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
              const ixAccountIndices = ix.accounts || ix.accountKeyIndexes || [];
              if (ixAccountIndices.length >= 1) {
                lpMint = accountKeys[ixAccountIndices[0]]?.toString() || null;
              }
            }
          }
        }

        // Find mints from post balances, excluding LP mint
        if (tx.meta?.postTokenBalances) {
          const tokenMints = new Set<string>();
          for (const balance of tx.meta.postTokenBalances) {
            if (balance.mint && balance.mint !== lpMint) {
              tokenMints.add(balance.mint);
            }
          }
          const mintArray = Array.from(tokenMints);
          if (mintArray.length >= 2) {
            mintA = mintArray[0];
            mintB = mintArray[1];
          }
        }
      }

      if (!mintA || !mintB || !poolId) {
        this.logger.warn(`⚠️  Could not extract all pool data for transaction: ${signature}. Partial data:`, {
          mintA,
          mintB,
          poolId,
        });
        return null;
      }

      return {
        poolAddress: poolId,
        mintA,
        mintB,
        signature,
        timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
        network,
        programId,
        poolType: poolType as 'AMMV4' | 'CPMM' | 'CLMM' | 'LAUNCHLAB',
      };
    } catch (error) {
      this.logger.error(`❌ Error extracting pool data from transaction ${signature}: ${error.message}`);
      return null;
    }
  }

  private cleanupOldEvents(conn: WebSocketConnection): void {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    conn.connectionEvents = conn.connectionEvents.filter(
      (event) => event.timestamp >= twentyFourHoursAgo,
    );
  }

  private getDisconnectionReconnectionCount(conn: WebSocketConnection): number {
    this.cleanupOldEvents(conn);
    
    // Count pairs of disconnection followed by reconnection
    let count = 0;
    let lastDisconnected = false;
    
    for (const event of conn.connectionEvents) {
      if (event.type === 'disconnected') {
        lastDisconnected = true;
      } else if (event.type === 'reconnected' && lastDisconnected) {
        count++;
        lastDisconnected = false;
      }
    }
    
    return count;
  }

  getConnectionStatus(): Record<string, { status: string; subscriptionId: number | null; reconnectCount24h: number }> {
    const status: Record<string, { status: string; subscriptionId: number | null; reconnectCount24h: number }> = {};

    this.connections.forEach((conn, key) => {
      let connectionStatus = 'disconnected';
      
      if (conn.ws) {
        if (conn.ws.readyState === WebSocket.OPEN) {
          connectionStatus = 'connected';
        } else if (conn.ws.readyState === WebSocket.CONNECTING) {
          connectionStatus = 'connecting';
        } else if (conn.ws.readyState === WebSocket.CLOSING) {
          connectionStatus = 'closing';
        } else {
          connectionStatus = 'disconnected';
        }
      }

      status[key] = {
        status: connectionStatus,
        subscriptionId: conn.subscriptionId,
        reconnectCount24h: this.getDisconnectionReconnectionCount(conn),
      };
    });

    return status;
  }

  private scheduleReconnect(
    network: Network,
    poolType: string,
    programId: string,
    wssEndpoint: string,
    key: string,
  ): void {
    const conn = this.connections.get(key);
    if (!conn) return;

    if (conn.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(
        `Max reconnect attempts reached for ${poolType} on ${network}. Stopping reconnection.`,
      );
      return;
    }

    conn.reconnectAttempts++;
    const delay = this.baseReconnectDelay * Math.pow(2, conn.reconnectAttempts - 1);

    this.logger.log(
      `Scheduling reconnect for ${poolType} on ${network} in ${delay}ms (attempt ${conn.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    conn.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket(network, poolType, programId, wssEndpoint, key);
    }, delay);
  }
}

