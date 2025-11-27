# DXRA Indexer API - Usage Guide

## Project Overview

**dxra-indexer** is a real-time Solana blockchain indexer that monitors and tracks Raydium pool creations. It:

- **Monitors** Raydium pools (AMM v4, CPMM, CLMM, LaunchLab) on Solana mainnet and devnet
- **Tracks** new pool creations via Helius WebSocket connections
- **Stores** pool data in memory and on disk (last 60 minutes)
- **Exposes** REST API endpoints to query pools by token mint address

## Base URL

- **Default**: `http://localhost:8000`
- **Production**: Replace with your server URL
- **Swagger UI**: `http://localhost:8000/api` (interactive documentation)

---

## API Endpoints

### 1. Health Check

**Endpoint**: `GET /`

**Description**: Check if the API is running and get basic statistics.

**Example Request**:
```bash
curl http://localhost:8000/
```

**Response Structure**:
```json
{
  "status": "ok",
  "message": "dxra-indexer API is running",
  "version": "1.0.0",
  "endpoints": {
    "mainnet": "/pools?mint=<token_mint_address>",
    "devnet": "/pools/devnet?mint=<token_mint_address>"
  },
  "stats": {
    "mainnetPools": 150,
    "devnetPools": 25
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. Get Mainnet Pools

**Endpoint**: `GET /pools?mint=<token_mint_address>`

**Description**: Get all pools containing a specific token on mainnet.

**Parameters**:
- `mint` (required): Token mint address (Solana public key)

**Example Request**:
```bash
curl "http://localhost:8000/pools?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
```

**Response Structure**:
```json
{
  "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "network": "mainnet",
  "pools": [
    {
      "poolAddress": "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2",
      "mintA": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "mintB": "So11111111111111111111111111111111111111112",
      "signature": "5j7s8K9L0mN1oP2qR3sT4uV5wX6yZ7aB8cD9eF0gH1iJ2kL3mN4oP5qR6sT7uV8wX9yZ",
      "timestamp": 1699123456789,
      "network": "mainnet",
      "programId": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
      "poolType": "AMMV4"
    }
  ],
  "count": 1
}
```

**Response Fields**:
- `mint`: The token mint address you queried
- `network`: Network name (`"mainnet"` or `"devnet"`)
- `pools`: Array of pool objects
  - `poolAddress`: Pool account address
  - `mintA`: First token mint address
  - `mintB`: Second token mint address
  - `signature`: Transaction signature that created the pool
  - `timestamp`: Unix timestamp in milliseconds
  - `network`: Network name
  - `programId`: Raydium program ID
  - `poolType`: Pool type (`"AMMV4"`, `"CPMM"`, `"CLMM"`, or `"LAUNCHLAB"`)
- `count`: Number of pools found

---

### 3. Get Devnet Pools

**Endpoint**: `GET /pools/devnet?mint=<token_mint_address>`

**Description**: Get all pools containing a specific token on devnet.

**Parameters**:
- `mint` (required): Token mint address (Solana public key)

**Example Request**:
```bash
curl "http://localhost:8000/pools/devnet?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
```

**Response Structure**: Same as mainnet endpoint, with `"network": "devnet"`

---

### 4. Detailed Health Check

**Endpoint**: `GET /health`

**Description**: Get detailed health information including WebSocket connection statuses.

**Example Request**:
```bash
curl http://localhost:8000/health
```

**Response Structure**:
```json
{
  "status": "ok",
  "websocketConnections": {
    "mainnet-CLMM": {
      "status": "connected",
      "subscriptionId": 12345,
      "reconnectCount24h": 0
    },
    "mainnet-CPMM": {
      "status": "connected",
      "subscriptionId": 12346,
      "reconnectCount24h": 0
    },
    "mainnet-AMMV4": {
      "status": "connected",
      "subscriptionId": 12347,
      "reconnectCount24h": 0
    },
    "mainnet-LAUNCHLAB": {
      "status": "connected",
      "subscriptionId": 12348,
      "reconnectCount24h": 0
    },
    "devnet-CLMM": {
      "status": "disconnected",
      "subscriptionId": null,
      "reconnectCount24h": 2
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Connection Status Values**:
- `connected`: WebSocket is active and receiving data
- `connecting`: WebSocket is connecting
- `disconnected`: WebSocket is not connected (will auto-reconnect)
- `closing`: WebSocket is closing

---

## Using the API in Your Programs

### JavaScript/TypeScript (Fetch API)

```javascript
// Get pools for a token on mainnet
async function getPools(mintAddress) {
  const response = await fetch(
    `http://localhost:8000/pools?mint=${mintAddress}`
  );
  const data = await response.json();
  return data;
}

// Example usage
const pools = await getPools('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
console.log(`Found ${pools.count} pools`);
pools.pools.forEach(pool => {
  console.log(`Pool: ${pool.poolAddress}, Type: ${pool.poolType}`);
});
```

### Python (requests)

```python
import requests

def get_pools(mint_address, network='mainnet'):
    base_url = 'http://localhost:8000'
    if network == 'devnet':
        url = f'{base_url}/pools/devnet?mint={mint_address}'
    else:
        url = f'{base_url}/pools?mint={mint_address}'
    
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

# Example usage
pools = get_pools('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
print(f"Found {pools['count']} pools")
for pool in pools['pools']:
    print(f"Pool: {pool['poolAddress']}, Type: {pool['poolType']}")
```

### Node.js (axios)

```javascript
const axios = require('axios');

async function getPools(mintAddress, network = 'mainnet') {
  const baseUrl = 'http://localhost:8000';
  const endpoint = network === 'devnet' 
    ? `${baseUrl}/pools/devnet?mint=${mintAddress}`
    : `${baseUrl}/pools?mint=${mintAddress}`;
  
  const response = await axios.get(endpoint);
  return response.data;
}

// Example usage
getPools('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
  .then(pools => {
    console.log(`Found ${pools.count} pools`);
    pools.pools.forEach(pool => {
      console.log(`Pool: ${pool.poolAddress}, Type: ${pool.poolType}`);
    });
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

### cURL

```bash
# Mainnet pools
curl "http://localhost:8000/pools?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

# Devnet pools
curl "http://localhost:8000/pools/devnet?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

# Health check
curl http://localhost:8000/
```

---

## Error Responses

### 400 Bad Request

**When**: Missing or invalid `mint` parameter

**Response**:
```json
{
  "statusCode": 400,
  "message": "Mint parameter is required",
  "error": "Bad Request"
}
```

### 500 Internal Server Error

**When**: Server error occurs

**Response**:
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

## Response Data Types

### Pool Object

```typescript
interface Pool {
  poolAddress: string;      // Solana public key
  mintA: string;           // First token mint address
  mintB: string;           // Second token mint address
  signature: string;       // Transaction signature
  timestamp: number;       // Unix timestamp (milliseconds)
  network: "mainnet" | "devnet";
  programId: string;       // Raydium program ID
  poolType: "AMMV4" | "CPMM" | "CLMM" | "LAUNCHLAB";
}
```

### Pools Response

```typescript
interface PoolsResponse {
  mint: string;
  network: "mainnet" | "devnet";
  pools: Pool[];
  count: number;
}
```

---

## Important Notes

1. **Data Retention**: Pools are only kept for the last 60 minutes. Older pools are automatically pruned.

2. **Real-time Updates**: The indexer monitors pools in real-time. New pools appear in the API within seconds of creation.

3. **Network Separation**: Mainnet and devnet pools are stored separately. Use the appropriate endpoint for each network.

4. **No Authentication**: The API currently has no authentication. If deploying publicly, consider adding rate limiting and authentication.

5. **Swagger Documentation**: Visit `http://localhost:8000/api` for interactive API documentation and testing.

