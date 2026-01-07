# STRAT API Documentation

## Complete API Reference

### Overview
The STRAT API provides comprehensive access to blockchain data, transaction submission, smart contract interaction, and platform services.

### Base URLs
- **Mainnet**: `https://api.strat.io/v1`
- **Testnet**: `https://testnet-api.strat.io/v1`
- **WebSocket**: `wss://ws.strat.io`

### Authentication
```javascript
// API Key (for rate limiting and premium features)
headers: {
    'X-API-Key': 'your-api-key',
    'Content-Type': 'application/json'
}
```

### Rate Limits
- **Free tier**: 100 requests/minute
- **Developer**: 1,000 requests/minute
- **Enterprise**: Unlimited

---

## Core API Endpoints

### 1. Blockchain Data

#### Get Block by Number
```http
GET /blocks/{blockNumber}
```

**Response**:
```json
{
    "number": 1234567,
    "hash": "0x...",
    "parentHash": "0x...",
    "timestamp": 1640000000,
    "transactions": [...],
    "gasUsed": "1234567",
    "gasLimit": "30000000"
}
```

#### Get Latest Block
```http
GET /blocks/latest
```

#### Get Block Range
```http
GET /blocks?from=1000&to=2000
```

---

### 2. Transaction APIs

#### Get Transaction
```http
GET /transactions/{txHash}
```

**Response**:
```json
{
    "hash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "value": "1000000000000000000",
    "gas": "21000",
    "gasPrice": "20000000000",
    "nonce": 42,
    "blockNumber": 1234567,
    "status": "success"
}
```

#### Send Transaction
```http
POST /transactions
```

**Request**:
```json
{
    "from": "0x...",
    "to": "0x...",
    "value": "1000000000000000000",
    "gas": "21000",
    "gasPrice": "20000000000",
    "data": "0x",
    "signature": "0x..."
}
```

#### Get Transaction Receipt
```http
GET /transactions/{txHash}/receipt
```

---

### 3. Account APIs

#### Get Balance
```http
GET /accounts/{address}/balance
```

**Response**:
```json
{
    "address": "0x...",
    "balance": "1000000000000000000",
    "balanceFormatted": "1.0 STRAT"
}
```

#### Get Transaction History
```http
GET /accounts/{address}/transactions?page=1&limit=20
```

#### Get Token Balances
```http
GET /accounts/{address}/tokens
```

**Response**:
```json
{
    "tokens": [
        {
            "address": "0x...",
            "name": "MyToken",
            "symbol": "MTK",
            "balance": "1000",
            "decimals": 18
        }
    ]
}
```

---

### 4. Smart Contract APIs

#### Call Contract Method (Read)
```http
POST /contracts/{address}/call
```

**Request**:
```json
{
    "method": "balanceOf",
    "params": ["0x..."],
    "abi": [...]
}
```

#### Execute Contract Method (Write)
```http
POST /contracts/{address}/execute
```

#### Get Contract ABI
```http
GET /contracts/{address}/abi
```

#### Get Contract Events
```http
GET /contracts/{address}/events?eventName=Transfer&from=1000&to=2000
```

---

### 5. DeFi APIs

#### Get Token Price
```http
GET /defi/tokens/{address}/price
```

**Response**:
```json
{
    "address": "0x...",
    "symbol": "STRAT",
    "price": "12.34",
    "priceChange24h": "5.67",
    "volume24h": "1000000"
}
```

#### Get Liquidity Pools
```http
GET /defi/pools
```

#### Get Staking Info
```http
GET /defi/staking/{address}
```

**Response**:
```json
{
    "stakedAmount": "1000",
    "rewards": "50",
    "apy": "12.5",
    "lockPeriod": "30 days",
    "unlockDate": "2024-02-01"
}
```

---

### 6. NFT APIs

#### Get NFT Metadata
```http
GET /nfts/{contractAddress}/{tokenId}
```

**Response**:
```json
{
    "tokenId": "1",
    "name": "Cool NFT",
    "description": "...",
    "image": "ipfs://...",
    "owner": "0x...",
    "attributes": [...]
}
```

#### Get NFT Collection
```http
GET /nfts/collections/{address}
```

#### Get User NFTs
```http
GET /accounts/{address}/nfts
```

#### NFT Transfer History
```http
GET /nfts/{contractAddress}/{tokenId}/history
```

---

### 7. Governance APIs

#### Get Active Proposals
```http
GET /governance/proposals?status=active
```

#### Get Proposal Details
```http
GET /governance/proposals/{proposalId}
```

**Response**:
```json
{
    "id": "1",
    "title": "Increase staking rewards",
    "description": "...",
    "proposer": "0x...",
    "votesFor": "1000000",
    "votesAgainst": "500000",
    "status": "active",
    "endTime": "2024-02-01T00:00:00Z"
}
```

#### Submit Vote
```http
POST /governance/proposals/{proposalId}/vote
```

**Request**:
```json
{
    "voter": "0x...",
    "support": true,
    "votingPower": "1000",
    "signature": "0x..."
}
```

---

### 8. Analytics APIs

#### Network Statistics
```http
GET /analytics/network
```

**Response**:
```json
{
    "totalAccounts": 1000000,
    "totalTransactions": 50000000,
    "avgBlockTime": 3,
    "tps": 500,
    "totalValueLocked": "100000000",
    "marketCap": "500000000"
}
```

#### Token Statistics
```http
GET /analytics/tokens/{address}
```

#### Historical Data
```http
GET /analytics/history?metric=price&interval=1h&from=2024-01-01&to=2024-01-31
```

---

### 9. WebSocket API

#### Subscribe to New Blocks
```javascript
const ws = new WebSocket('wss://ws.strat.io');

ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'blocks'
}));

ws.onmessage = (event) => {
    const block = JSON.parse(event.data);
    console.log('New block:', block);
};
```

#### Subscribe to Transactions
```javascript
ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'transactions',
    filter: {
        address: '0x...'
    }
}));
```

#### Subscribe to Events
```javascript
ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'events',
    contract: '0x...',
    event: 'Transfer'
}));
```

---

### 10. Utility APIs

#### Estimate Gas
```http
POST /utils/estimateGas
```

#### Get Gas Price
```http
GET /utils/gasPrice
```

**Response**:
```json
{
    "slow": "10000000000",
    "standard": "20000000000",
    "fast": "30000000000"
}
```

#### Validate Address
```http
GET /utils/validateAddress/{address}
```

#### Convert Units
```http
GET /utils/convert?value=1&from=ether&to=gwei
```

---

## SDK Libraries

### JavaScript/TypeScript
```bash
npm install @strat/sdk
```

```javascript
import { StratSDK } from '@strat/sdk';

const strat = new StratSDK({
    network: 'mainnet',
    apiKey: 'your-api-key'
});

const balance = await strat.getBalance('0x...');
```

### Python
```bash
pip install strat-sdk
```

```python
from strat import StratClient

client = StratClient(api_key='your-api-key')
balance = client.get_balance('0x...')
```

### Go
```bash
go get github.com/strat/go-strat
```

---

## Error Handling

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

### Error Response Format
```json
{
    "error": {
        "code": "INVALID_ADDRESS",
        "message": "The provided address is invalid",
        "details": {
            "address": "0xinvalid"
        }
    }
}
```

---

## Best Practices

### Caching
- Cache blockchain data (blocks, transactions)
- Invalidate on new blocks
- Use ETags for conditional requests

### Error Handling
- Implement exponential backoff
- Handle rate limits gracefully
- Log errors for debugging

### Security
- Never expose API keys in frontend
- Use environment variables
- Implement request signing
- Validate all inputs

### Performance
- Use WebSocket for real-time data
- Batch requests when possible
- Implement pagination
- Use compression

---

## API Versioning

Current version: **v1**

Breaking changes will result in new version (v2, v3, etc.)

Non-breaking changes will be added to current version.

---

## Support

- Documentation: docs.strat.io/api
- Discord: discord.gg/strat
- Email: api-support@strat.io
- Status: status.strat.io

---

**Last Updated**: 2024-01-01
**API Version**: 1.0.0
