# STRAT Blockchain API Documentation

## Base URL
```
https://api.stratblockchain.com
```

## Authentication
Most endpoints require authentication via JWT token:
```
Authorization: Bearer <your_jwt_token>
```

---

## Blockchain Endpoints

### Get Blockchain Info
```
GET /api/blockchain/info
```
Returns current blockchain statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "blocks": 12345,
    "difficulty": 5,
    "hashrate": 1234567,
    "pendingTransactions": 10
  }
}
```

### Get Block by Index
```
GET /api/blockchain/block/:index
```

### Get Latest Blocks
```
GET /api/blockchain/blocks?page=1&limit=10
```

---

## Transaction Endpoints

### Send Transaction
```
POST /api/transactions/send
```

**Body:**
```json
{
  "from": "0x123...",
  "to": "0x456...",
  "amount": 10.5,
  "signature": "0xabc..."
}
```

### Get Transaction
```
GET /api/transactions/:hash
```

### Get Transaction History
```
GET /api/transactions/history/:address?page=1&limit=20
```

---

## NFT Endpoints

### Mint NFT
```
POST /api/nft/mint
```

**Body:**
```json
{
  "name": "My NFT",
  "description": "NFT description",
  "image": "ipfs://...",
  "royaltyPercent": 5
}
```

### List NFT for Sale
```
POST /api/nft/:tokenId/list
```

### Buy NFT
```
POST /api/nft/:tokenId/buy
```

### Get Marketplace
```
GET /api/nft/marketplace?page=1&limit=20&sort=price_asc
```

---

## Governance Endpoints

### Create Proposal
```
POST /api/governance/proposals
```

**Body:**
```json
{
  "title": "Proposal Title",
  "description": "Detailed description",
  "votingPeriod": 604800000,
  "executionData": {}
}
```

### Vote on Proposal
```
POST /api/governance/proposals/:id/vote
```

**Body:**
```json
{
  "support": true
}
```

### Get Active Proposals
```
GET /api/governance/proposals?status=active
```

---

## Trading Endpoints

### Create Order
```
POST /api/trading/orders
```

**Body:**
```json
{
  "pair": "STRAT/USD",
  "side": "buy",
  "type": "limit",
  "amount": 100,
  "price": 1.50
}
```

### Get Order Book
```
GET /api/trading/orderbook?pair=STRAT/USD
```

### Get Portfolio
```
GET /api/trading/portfolio/:address
```

---

## Social Endpoints

### Create Post
```
POST /api/social/posts
```

### Get Feed
```
GET /api/social/feed?page=1&limit=20
```

### Like Post
```
POST /api/social/posts/:id/like
```

---

## Staking Endpoints

### Stake STRAT
```
POST /api/staking/stake
```

### Get Staking Info
```
GET /api/staking/info/:address
```

---

## WebSocket Events

Connect to: `wss://api.stratblockchain.com`

### Subscribe to Events
```javascript
socket.emit('subscribe', {
  events: ['block:new', 'transaction:confirmed']
});
```

### Available Events
- `block:new` - New block mined
- `transaction:confirmed` - Transaction confirmed
- `proposal:created` - New governance proposal
- `nft:sold` - NFT sale completed
- `order:filled` - Trading order filled
- `price:alert` - Price alert triggered

---

## Error Codes

| Code | Description |
|------|-------------|
| 1001 | Invalid Transaction |
| 1002 | Insufficient Funds |
| 1003 | Invalid Signature |
| 2001 | Block Validation Failed |
| 4001 | Proposal Not Found |
| 5001 | Order Not Found |
| 6001 | NFT Not Found |
| 8001 | Rate Limit Exceeded |
| 8002 | Unauthorized |

---

## Rate Limits

- 60 requests per minute
- 1000 requests per hour
- 10000 requests per day

---

## Pagination

All list endpoints support pagination:
```
?page=1&limit=20
```

**Response includes:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## SDK Examples

### JavaScript/Node.js
```javascript
const STRAT = require('strat-sdk');

const client = new STRAT.Client({
  apiKey: 'your_api_key',
  network: 'mainnet'
});

// Send transaction
const tx = await client.transactions.send({
  to: '0x456...',
  amount: 10.5
});

// Get balance
const balance = await client.wallets.getBalance('0x123...');
```

### Python
```python
from strat_sdk import Client

client = Client(api_key='your_api_key', network='mainnet')

# Send transaction
tx = client.transactions.send(to='0x456...', amount=10.5)

# Get balance
balance = client.wallets.get_balance('0x123...')
```

---

For more information, visit: https://docs.stratblockchain.com
