import { Pool, Network } from '../../common/types';
import { RAYDIUM_MAINNET_PROGRAMS, RAYDIUM_DEVNET_PROGRAMS } from '../../config/programs';

export function detectAMMV4(tx: any): Pool | null {
  try {
    if (!tx?.meta?.logMessages || !Array.isArray(tx.meta.logMessages)) {
      return null;
    }

    const logMessages = tx.meta.logMessages as string[];
    const hasInitializeInstruction = logMessages.some((log) =>
      log.includes('InitializeInstruction2'),
    );

    if (!hasInitializeInstruction) {
      return null;
    }

    // Determine network by checking program IDs
    let network: Network = 'mainnet';
    let programId = RAYDIUM_MAINNET_PROGRAMS.AMMV4;

    const accountKeys = tx.transaction?.message?.accountKeys || [];
    const isDevnet = accountKeys.some(
      (key: any) => key === RAYDIUM_DEVNET_PROGRAMS.AMMV4,
    );

    if (isDevnet) {
      network = 'devnet';
      programId = RAYDIUM_DEVNET_PROGRAMS.AMMV4;
    }

    // Extract pool address from transaction
    // The pool address is typically the first writable account in the instruction
    const poolAddress = accountKeys[0]?.pubkey || tx.transaction?.signatures?.[0] || '';

    // Extract mints from log messages or account keys
    // This is a simplified extraction - in production, you'd parse the instruction data
    let mintA = '';
    let mintB = '';

    // Try to extract mints from log messages
    for (const log of logMessages) {
      // Look for mint addresses in logs (44 character base58 strings)
      const mintMatch = log.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g);
      if (mintMatch && mintMatch.length >= 2) {
        mintA = mintMatch[0];
        mintB = mintMatch[1];
        break;
      }
    }

    // Fallback: use account keys if mints not found in logs
    if (!mintA || !mintB) {
      const writableAccounts = accountKeys.filter((key: any) => key.writable !== false);
      if (writableAccounts.length >= 3) {
        mintA = writableAccounts[1]?.pubkey || '';
        mintB = writableAccounts[2]?.pubkey || '';
      }
    }

    if (!poolAddress || !mintA || !mintB) {
      return null;
    }

    const signature = tx.transaction?.signatures?.[0] || tx.signature || '';
    const timestamp = tx.blockTime ? tx.blockTime * 1000 : Date.now();

    return {
      poolAddress,
      mintA,
      mintB,
      signature,
      timestamp,
      network,
      programId,
      poolType: 'AMMV4',
    };
  } catch (error) {
    console.error('Error detecting AMMV4 pool:', error);
    return null;
  }
}

