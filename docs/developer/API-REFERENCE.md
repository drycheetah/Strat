# STRAT Blockchain API Reference

Complete API documentation for STRAT blockchain developers.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Some endpoints require authentication via JWT token:

```
Authorization: Bearer <token>
```

---

## Blockchain Endpoints

### Get Blockchain Info

Get current blockchain information.

**Endpoint:** `GET /blockchain/info`

**Response:**
```json
{
  "height": 1234,
  "difficulty": 4,
  "totalSupply": 1000000,
  "latestBlock": {
    "hash": "0x...",
    "timestamp": 1234567890
  }
}
```

### Get Block by Hash

**Endpoint:** `GET /blockchain/block/:hash`

**Parameters:**
- `hash` - Block hash

**Response:**
```json
{
  "index": 123,
  "hash": "0x...",
  "previousHash": "0x...",
  "timestamp": 1234567890,
  "nonce": 12345,
  "difficulty": 4,
  "transactions": [],
  "merkleRoot": "0x..."
}
```

### Get Block by Index

**Endpoint:** `GET /blockchain/block-by-index/:index`

**Parameters:**
- `index` - Block index/height

---

## Transaction Endpoints

### Send Transaction

Send a new transaction.

**Endpoint:** `POST /transactions/send`

**Authentication:** Required

**Body:**
```json
{
  "fromAddress": "0x...",
  "toAddress": "0x...",
  "amount": 100,
  "privateKey": "..."
}
```

**Response:**
```json
{
  "transactionId": "0x...",
  "status": "pending"
}
```

### Get Transaction

**Endpoint:** `GET /transactions/:txId`

**Parameters:**
- `txId` - Transaction ID

**Response:**
```json
{
  "id": "0x...",
  "from": "0x...",
  "to": "0x...",
  "amount": 100,
  "timestamp": 1234567890,
  "blockIndex": 123,
  "status": "confirmed"
}
```

### Get Transaction History

**Endpoint:** `GET /transactions/history/:address`

**Parameters:**
- `address` - Wallet address

**Query Parameters:**
- `limit` - Number of transactions (default: 50)
- `offset` - Offset for pagination (default: 0)

---

## Wallet Endpoints

### Create Wallet

**Endpoint:** `POST /auth/register`

**Body:**
```json
{
  "username": "user123",
  "password": "securepass"
}
```

**Response:**
```json
{
  "address": "0x...",
  "publicKey": "...",
  "privateKey": "...",
  "token": "jwt_token"
}
```

### Get Balance

**Endpoint:** `GET /wallets/balance/:address`

**Response:**
```json
{
  "balance": 1000
}
```

### Get UTXOs

**Endpoint:** `GET /wallets/utxos/:address`

**Response:**
```json
{
  "utxos": [
    {
      "txId": "0x...",
      "index": 0,
      "amount": 100
    }
  ]
}
```

---

## Smart Contract Endpoints

### Deploy Contract

**Endpoint:** `POST /contracts/deploy`

**Authentication:** Required

**Body:**
```json
{
  "code": "contract code here",
  "owner": "0x...",
  "privateKey": "..."
}
```

**Response:**
```json
{
  "contractAddress": "0x...",
  "transactionId": "0x...",
  "gasUsed": 50000
}
```

### Call Contract

**Endpoint:** `POST /contracts/call`

**Body:**
```json
{
  "contractAddress": "0x...",
  "method": "transfer",
  "params": ["0x...", 100],
  "caller": "0x...",
  "privateKey": "..."
}
```

**Response:**
```json
{
  "result": {...},
  "gasUsed": 21000
}
```

### Get Contract

**Endpoint:** `GET /contracts/:address`

**Response:**
```json
{
  "address": "0x...",
  "owner": "0x...",
  "code": "...",
  "timestamp": 1234567890
}
```

---

## Mining Endpoints

### Get Mining Info

**Endpoint:** `GET /mining/info`

**Response:**
```json
{
  "difficulty": 4,
  "blockReward": 50,
  "networkHashrate": "100 MH/s",
  "pendingTransactions": 10
}
```

### Start Mining

**Endpoint:** `POST /mining/start`

**Body:**
```json
{
  "minerAddress": "0x..."
}
```

---

## Staking Endpoints

### Stake Tokens

**Endpoint:** `POST /staking/stake`

**Body:**
```json
{
  "address": "0x...",
  "amount": 1000,
  "privateKey": "..."
}
```

### Get Staking Info

**Endpoint:** `GET /staking/info/:address`

**Response:**
```json
{
  "stakedAmount": 1000,
  "rewards": 50,
  "stakingTime": 1234567890
}
```

---

## Governance Endpoints

### Create Proposal

**Endpoint:** `POST /governance/proposal`

**Body:**
```json
{
  "title": "Proposal Title",
  "description": "Description",
  "proposer": "0x...",
  "privateKey": "..."
}
```

### Vote on Proposal

**Endpoint:** `POST /governance/vote`

**Body:**
```json
{
  "proposalId": 1,
  "vote": true,
  "voter": "0x...",
  "privateKey": "..."
}
```

### Get Proposal

**Endpoint:** `GET /governance/proposal/:id`

---

## Error Responses

All endpoints may return these error codes:

- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

**Error Format:**
```json
{
  "error": "Error message"
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- Standard endpoints: 100 requests/minute
- Heavy operations: 10 requests/minute

## WebSocket Events

Connect to WebSocket for real-time updates:

```javascript
const socket = io('http://localhost:3000');

socket.on('new_block', (block) => {
  console.log('New block:', block);
});

socket.on('new_transaction', (tx) => {
  console.log('New transaction:', tx);
});
```

Available events:
- `stats` - Blockchain statistics
- `new_block` - New block mined
- `new_transaction` - New transaction
- `mempool_stats` - Mempool updates
- `address_balance` - Balance updates
