export type Network = 'mainnet' | 'devnet';

export type PoolType = 'AMMV4' | 'CPMM' | 'CLMM';

export interface Pool {
  poolAddress: string;
  mintA: string;
  mintB: string;
  signature: string;
  timestamp: number;
  network: Network;
  programId: string;
  poolType: PoolType;
}

