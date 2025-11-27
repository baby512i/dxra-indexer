# dxra-indexer

A NestJS-based indexer that tracks Raydium pool creations in real-time via Helius WebSocket API. The system detects AMM v4, CPMM, CLMM, and LaunchLab pool creations on both Solana mainnet and devnet, stores them in-memory and on-disk, and exposes query APIs.

## Features

- **Real-time Pool Detection**: Monitors Raydium pool creations (AMM v4, CPMM, CLMM, LaunchLab) via Helius WebSocket connections
- **Dual Network Support**: Tracks pools on both mainnet and devnet separately
- **Persistent Storage**: Stores pools in both in-memory cache and JSON files
- **Automatic Pruning**: Removes pools older than 60 minutes every 60 seconds
- **RESTful API**: Query pools by token mint address
- **Swagger Documentation**: Interactive API documentation with Swagger UI
- **Survives Restarts**: Loads pools from disk on startup, preserving last 60 minutes of data
- **Automatic Reconnection**: Handles WebSocket disconnections with exponential backoff
- **Heartbeat Monitoring**: WebSocket heartbeat mechanism to detect and recover from silent connection failures

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Helius API account with API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dxra-indexer
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

Create a `.env` file in the root directory:

```env
PORT=8000
NODE_ENV=development

# Option 1: Use separate API keys for each network (recommended)
HELIUS_API_KEY_MAINNET=your-mainnet-api-key-here
HELIUS_API_KEY_DEVNET=your-devnet-api-key-here

# Option 2: Use a single API key for both networks (backward compatible)
# HELIUS_API_KEY=your-helius-api-key-here
```

### Environment Variables

- `PORT`: Server port (default: 8000)
- `NODE_ENV`: Environment mode (default: development)
- `HELIUS_API_KEY_MAINNET`: Your Helius API key for mainnet (recommended) - Get it from [Helius Dashboard](https://dashboard.helius.dev)
- `HELIUS_API_KEY_DEVNET`: Your Helius API key for devnet (recommended) - Get it from [Helius Dashboard](https://dashboard.helius.dev)
- `HELIUS_API_KEY`: Single API key for both networks (backward compatible) - Used if network-specific keys are not set

**Note:** 
- If both `HELIUS_API_KEY_MAINNET` and `HELIUS_API_KEY_DEVNET` are set, they will be used for their respective networks
- If only `HELIUS_API_KEY` is set, it will be used for both networks
- If only one network-specific key is set, only that network's connections will be established

## Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

The server will start on `http://0.0.0.0:8000` (or your configured PORT).

## WebSocket Configuration

### Setting up Helius API Keys

1. Log in to your [Helius Dashboard](https://dashboard.helius.dev)
2. Navigate to the API section
3. Copy your API keys:
   - For mainnet: Copy and set as `HELIUS_API_KEY_MAINNET`
   - For devnet: Copy and set as `HELIUS_API_KEY_DEVNET`
4. Add them to your `.env` file

**Recommended:** Use separate API keys for mainnet and devnet to better manage rate limits and usage.

**Backward Compatible:** You can still use a single `HELIUS_API_KEY` for both networks if preferred.

The service automatically:
- Connects to Helius WebSocket endpoints for both mainnet and devnet
- Subscribes to logs from all Raydium programs:
  - **Mainnet AMMV4**: `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`
  - **Mainnet CPMM**: `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`
  - **Mainnet CLMM**: `CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK`
  - **Mainnet LaunchLab**: `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj`
  - **Devnet programs**: Automatically configured

### How It Works

1. **WebSocket Connections**: The service establishes WebSocket connections to Helius for each Raydium program on both networks
2. **Log Subscription**: Uses `logsSubscribe` method to monitor transaction logs in real-time
3. **Pool Detection**: When pool creation logs are detected, the service:
   - Fetches the full transaction details via RPC
   - Extracts pool address, mintA, mintB from the transaction
   - Saves the pool data to memory cache and persistent storage
4. **Automatic Reconnection**: If a WebSocket connection drops, it automatically reconnects with exponential backoff

## API Documentation

### Swagger UI

Interactive API documentation is available via Swagger UI when the server is running:

```
http://localhost:8000/api
```

The Swagger UI provides:
- Complete API endpoint documentation
- Request/response schemas
- Interactive API testing
- Example requests and responses

## API Endpoints

### Query Mainnet Pools

Get all pools for a specific token mint on mainnet:

```bash
GET /pools?mint=<token_mint_address>
```

**Example:**
```bash
curl http://localhost:8000/pools?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

**Response:**
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
      "timestamp": 1234567890000,
      "network": "mainnet",
      "programId": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
      "poolType": "AMMV4"
    }
  ],
  "count": 1
}
```

### Query Devnet Pools

Get all pools for a specific token mint on devnet:

```bash
GET /pools/devnet?mint=<token_mint_address>
```

**Example:**
```bash
curl http://localhost:8000/pools/devnet?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

**Response:** Same format as mainnet, with `"network": "devnet"`

### Health Check

Get service health status including WebSocket connection status:

```bash
GET /
```

**Example:**
```bash
curl http://localhost:8000/
```

**Response:**
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
    "mainnetPools": 42,
    "devnetPools": 5
  },
  "websocketConnections": {
    "mainnet-CLMM": {
      "status": "connected",
      "subscriptionId": 123,
      "reconnectAttempts": 0
    },
    "mainnet-CPMM": {
      "status": "connected",
      "subscriptionId": 124,
      "reconnectAttempts": 0
    },
    "mainnet-AMMV4": {
      "status": "connected",
      "subscriptionId": 125,
      "reconnectAttempts": 0
    },
    "mainnet-LAUNCHLAB": {
      "status": "connected",
      "subscriptionId": 126,
      "reconnectAttempts": 0
    },
    "devnet-CLMM": {
      "status": "disconnected",
      "subscriptionId": null,
      "reconnectAttempts": 2
    }
  },
  "timestamp": "2024-11-26T21:12:00.000Z"
}
```

**Connection Status Values:**
- `connected`: WebSocket is open and subscribed
- `connecting`: WebSocket is in the process of connecting
- `closing`: WebSocket is closing
- `disconnected`: WebSocket is not connected (will auto-reconnect)

## Data Storage

### In-Memory Cache

Pools are stored in memory for fast queries, indexed by token mint addresses. The cache is rebuilt from disk on application startup.

### Persistent Storage

Pools are also saved to JSON files:
- `data/pools-mainnet.json` - Mainnet pools
- `data/pools-devnet.json` - Devnet pools

### Pruning

The system automatically prunes pools older than 60 minutes:
- Runs every 60 seconds
- Removes old pools from memory cache
- Rewrites JSON files with only fresh pools
- Ensures data persistence across restarts (last 60 minutes)

## Pool Detection

The indexer detects three types of Raydium pools by monitoring WebSocket log streams:

### AMM v4
- Detects `InitializeInstruction2` or `initialize2:` in log messages
- Program ID: `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8` (mainnet)
- Extracts pool data from transaction account keys and token balances

### CPMM
- Detects `initialize` instruction combined with `InitializeMint2` or liquidity logs
- Program ID: `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C` (mainnet)
- Extracts pool ID from account keys and mints from token balances

### CLMM
- Detects `createpool`, `create_pool`, or `create pool` in log messages
- Program ID: `CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK` (mainnet)
- Extracts pool ID, mintA, and mintB from account indices with fallback to token balances

### LaunchLab
- Detects `initializev2` or `initialize_v2` in log messages
- Program ID: `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj` (mainnet)
- Extracts pool ID from account keys, finds LP mint from InitializeMint2, extracts mints from token balances

## Project Structure

```
dxra-indexer/
├── src/
│   ├── api/              # Public API endpoints
│   ├── common/           # Shared types and interfaces
│   ├── config/           # Configuration modules
│   ├── indexer/          # WebSocket service and pool detection
│   │   └── pool-creation-detectors/
│   ├── storage/          # Storage layer (memory, file, pruning)
│   ├── app.module.ts     # Root module
│   └── main.ts           # Application entry point
├── data/                 # Persistent JSON storage
│   ├── pools-mainnet.json
│   └── pools-devnet.json
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Building

```bash
npm run build
```

### Running in Development

```bash
npm run start:dev
```

## Verifying WebSocket Connections

### Checking Connection Status

When the service starts, you should see logs indicating successful WebSocket connections:

```
✓ Connected to Helius WebSocket for CLMM on mainnet
✓ Subscribed to CLMM logs on mainnet (subscription ID: 123)
✓ Connected to Helius WebSocket for CPMM on mainnet
✓ Subscribed to CPMM logs on mainnet (subscription ID: 124)
...
```

### Verifying Pool Detection is Working

1. **Check Server Logs**: When a pool is created, you should see detailed logs:
   ```
   ============================================================
   🔥 NEW RAYDIUM POOL CREATED - CLMM
   ------------------------------------------------------------
   Pool Type: CLMM
   Network: mainnet
   Program ID: CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK
   Signature: 5j7s8K9L0mN1oP2qR3sT4uV5wX6yZ7aB8cD9eF0gH1iJ2kL3mN4oP5qR6sT7uV8wX9yZ
   Slot: 123456789
   Timestamp: 2024-11-26T21:12:00.000Z
   ------------------------------------------------------------
   ============================================================
   🔍 Extracting pool data from CLMM transaction...
   ✅ Detected new CLMM pool on mainnet: 58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2
      MintA: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v, MintB: So11111111111111111111111111111111111111112
   ```

2. **Monitor Pool Count**: Check if pools are being added:
   ```bash
   GET http://localhost:8000/
   ```
   Look at the `stats.mainnetPools` or `stats.devnetPools` count

3. **Query for Specific Mint**: Try querying pools for a token that should have pools:
   ```bash
   GET http://localhost:8000/pools?mint=<token_address>
   ```

### Common Issues

- **No WebSocket connections**: Verify `HELIUS_API_KEY` is set correctly in your `.env` file
- **Connection drops**: The service automatically reconnects. Check logs for reconnection attempts
- **No pools detected**: Ensure Raydium programs are active and creating pools on the monitored networks

## Troubleshooting

### WebSocket Not Connecting

1. Verify `HELIUS_API_KEY` is set correctly in your `.env` file
2. Check that your Helius API key is valid and has WebSocket access
3. Ensure your network allows WebSocket connections (wss://)
4. Check server logs for connection errors

### WebSocket Disconnections

1. The service automatically reconnects with exponential backoff
2. Check logs for reconnection attempts and delays
3. If reconnections fail repeatedly, verify your API key hasn't expired
4. Ensure you're not hitting rate limits on your Helius account

### Pools Not Being Detected

1. Verify transaction log messages contain expected patterns:
   - AMMV4: `InitializeInstruction2`
   - CPMM: `init_pool` or `initialize`
   - CLMM: `create_pool` or `initialize_pair`
   - LaunchLab: `initializev2` or `initialize_v2`
2. Check that program IDs match network (mainnet vs devnet)
3. Review detector logs for parsing errors

### Data Not Persisting

1. Ensure `data/` directory exists and is writable
2. Check file permissions
3. Review file storage service logs

## License

ISC

