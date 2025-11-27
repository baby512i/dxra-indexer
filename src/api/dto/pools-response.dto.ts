import { ApiProperty } from '@nestjs/swagger';
import { Pool, Network } from '../../common/types';

export class PoolDto {
  @ApiProperty({
    description: 'Pool address',
    example: '7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX',
  })
  poolAddress: string;

  @ApiProperty({
    description: 'First token mint address',
    example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  })
  mintA: string;

  @ApiProperty({
    description: 'Second token mint address',
    example: 'So11111111111111111111111111111111111112',
  })
  mintB: string;

  @ApiProperty({
    description: 'Transaction signature',
    example: '5j7s8K9L0mN1oP2qR3sT4uV5wX6yZ7aB8cD9eF0gH1iJ2kL3mN4oP5qR6sT7uV8wX9yZ',
  })
  signature: string;

  @ApiProperty({
    description: 'Pool creation timestamp (Unix timestamp in milliseconds)',
    example: 1699123456789,
  })
  timestamp: number;

  @ApiProperty({
    description: 'Network',
    enum: ['mainnet', 'devnet'],
    example: 'mainnet',
  })
  network: Network;

  @ApiProperty({
    description: 'Program ID',
    example: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  })
  programId: string;

  @ApiProperty({
    description: 'Pool type',
    enum: ['AMMV4', 'CPMM', 'CLMM', 'LAUNCHLAB'],
    example: 'CLMM',
  })
  poolType: 'AMMV4' | 'CPMM' | 'CLMM' | 'LAUNCHLAB';
}

export class PoolsResponseDto {
  @ApiProperty({
    description: 'Token mint address used for query',
    example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  })
  mint: string;

  @ApiProperty({
    description: 'Network',
    enum: ['mainnet', 'devnet'],
    example: 'mainnet',
  })
  network: Network;

  @ApiProperty({
    description: 'List of pools',
    type: [PoolDto],
  })
  pools: PoolDto[];

  @ApiProperty({
    description: 'Number of pools found',
    example: 5,
  })
  count: number;
}

