import {
  Controller,
  Get,
  Query,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { MemoryCacheService } from '../storage/memory-cache';
import { PoolsResponseDto } from './dto/pools-response.dto';

@ApiTags('pools')
@Controller('pools')
export class PoolsController {
  constructor(private readonly memoryCache: MemoryCacheService) {}

  @Get()
  @ApiOperation({
    summary: 'Get pools by mint address (Mainnet)',
    description:
      'Retrieves all Raydium pools that contain the specified token mint address on mainnet.',
  })
  @ApiQuery({
    name: 'mint',
    description: 'Token mint address to search for',
    example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved pools',
    type: PoolsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Mint parameter is missing or invalid',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Mint parameter is required' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async getPools(@Query('mint') mint: string): Promise<PoolsResponseDto> {
    if (!mint || mint.trim() === '') {
      throw new BadRequestException('Mint parameter is required');
    }

    const pools = this.memoryCache.getPoolsByMint('mainnet', mint.trim());
    return {
      mint: mint.trim(),
      network: 'mainnet',
      pools,
      count: pools.length,
    };
  }

  @Get('devnet')
  @ApiOperation({
    summary: 'Get pools by mint address (Devnet)',
    description:
      'Retrieves all Raydium pools that contain the specified token mint address on devnet.',
  })
  @ApiQuery({
    name: 'mint',
    description: 'Token mint address to search for',
    example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved pools',
    type: PoolsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Mint parameter is missing or invalid',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Mint parameter is required' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async getDevnetPools(@Query('mint') mint: string): Promise<PoolsResponseDto> {
    if (!mint || mint.trim() === '') {
      throw new BadRequestException('Mint parameter is required');
    }

    const pools = this.memoryCache.getPoolsByMint('devnet', mint.trim());
    return {
      mint: mint.trim(),
      network: 'devnet',
      pools,
      count: pools.length,
    };
  }
}

