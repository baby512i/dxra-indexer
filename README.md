# dxra-indexer

A NestJS-based indexer that tracks Raydium pool creations in real-time via Helius webhooks. The system detects AMM v4, CPMM, and CLMM pool creations on both Solana mainnet and devnet, stores them in-memory and on-disk, and exposes query APIs.

## Features

- **Real-time Pool Detection**: Monitors Raydium pool creations (AMM v4, CPMM, CLMM) via Helius webhooks
- **Dual Network Support**: Tracks pools on both mainnet and devnet separately
- **Persistent Storage**: Stores pools in both in-memory cache and JSON files
- **Automatic Pruning**: Removes pools older than 60 minutes every 60 seconds
- **RESTful API**: Query pools by token mint address
- **Survives Restarts**: Loads pools from disk on startup, preserving last 60 minutes of data

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Helius API account with webhook access

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
HELIUS_WEBHOOK_ID=your-webhook-id-here
```

### Environment Variables

- `PORT`: Server port (default: 8000)
- `NODE_ENV`: Environment mode (default: development)
- `HELIUS_WEBHOOK_ID`: Webhook ID from Helius dashboard (e.g., `0d64f9db-85a1-40f1-91c7-cb43308906f2`) - recommended
- `HELIUS_WEBHOOK_SECRET`: Alternative: Secret for validating webhook requests (if you have one instead of webhook ID)

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

## Webhook Configuration

### Setting up Helius Webhook

1. Log in to your Helius dashboard
2. Create a new webhook with the following settings:
   - **Webhook URL**: `https://your-domain.com/webhook/raydium`
   - **Webhook Type**: Enhanced Transactions
   - **Transaction Types**: Include Raydium program IDs:
     - Mainnet AMMV4: `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`
     - Mainnet CPMM: `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`
     - Mainnet CLMM: `CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK`
   - **Webhook ID**: Found in your Helius dashboard, set this in your `.env` file as `HELIUS_WEBHOOK_ID`

### Example Webhook Payload

Helius Enhanced Webhook format:

```json
{
  "type": "ENHANCED",
  "data": [
    {
      "transaction": {
        "signatures": ["5j7s8..."],
        "message": {
          "accountKeys": [
            { "pubkey": "pool_address..." },
            { "pubkey": "mintA..." },
            { "pubkey": "mintB..." }
          ]
        }
      },
      "meta": {
        "logMessages": [
          "Program log: InitializeInstruction2",
          "..."
        ]
      },
      "blockTime": 1234567890
    }
  ],
  "secret": "your-webhook-secret"
}
```

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

The indexer detects three types of Raydium pools:

### AMM v4
- Detects `InitializeInstruction2` in log messages
- Program ID: `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8` (mainnet)

### CPMM
- Detects `init_pool` or `initialize` in log messages
- Program ID: `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C` (mainnet)

### CLMM
- Detects `create_pool` or `initialize_pair` in log messages
- Program ID: `CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK` (mainnet)

## Project Structure

```
dxra-indexer/
├── src/
│   ├── api/              # Public API endpoints
│   ├── common/           # Shared types and interfaces
│   ├── config/           # Configuration modules
│   ├── indexer/          # Webhook handling and pool detection
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

## Troubleshooting

### Webhook Not Receiving Data

1. Verify webhook URL is accessible from the internet
2. Check that `HELIUS_WEBHOOK_ID` matches your Helius webhook ID (found in dashboard)
3. Ensure Raydium program IDs are included in webhook filters
4. Check server logs for error messages

### Pools Not Being Detected

1. Verify transaction log messages contain expected patterns:
   - AMMV4: `InitializeInstruction2`
   - CPMM: `init_pool` or `initialize`
   - CLMM: `create_pool` or `initialize_pair`
2. Check that program IDs match network (mainnet vs devnet)
3. Review detector logs for parsing errors

### Data Not Persisting

1. Ensure `data/` directory exists and is writable
2. Check file permissions
3. Review file storage service logs

## License

ISC

