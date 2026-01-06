# New Features Added to STRAT Blockchain

This document outlines all the major features and enhancements added to the STRAT blockchain during the development session.

## Table of Contents

1. [Transaction Mempool with Fee Prioritization](#transaction-mempool-with-fee-prioritization)
2. [Blockchain Explorer API](#blockchain-explorer-api)
3. [Enhanced WebSocket Support](#enhanced-websocket-support)
4. [Staking Mechanism](#staking-mechanism)
5. [Smart Contract Gas Metering](#smart-contract-gas-metering)
6. [Rate Limiting and DDoS Protection](#rate-limiting-and-ddos-protection)

---

## Transaction Mempool with Fee Prioritization

### Overview
Implemented a sophisticated mempool system that manages pending transactions before they're included in blocks, with priority-based transaction selection for miners.

### Features
- **Fee-based prioritization**: Transactions with higher fees get priority
- **UTXO tracking**: Prevents double-spending in mempool
- **Replace-By-Fee (RBF)**: Replace pending transactions with higher fee versions
- **Automatic cleanup**: Removes invalid transactions when blockchain advances
- **Size limits**: Configurable mempool size with automatic eviction of low-priority transactions

### API Endpoints

#### Get Mempool Statistics
```http
GET /api/mempool/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "count": 15,
    "totalFees": 0.15,
    "totalSize": 12450,
    "avgFeeRate": 0.00001205,
    "utilization": "15.00%",
    "transactions": [...]
  }
}
```

#### Get Transaction from Mempool
```http
GET /api/mempool/transaction/:txHash
```

#### Get Transactions by Priority
```http
GET /api/mempool/transactions?limit=50
```

#### Replace Transaction (RBF)
```http
POST /api/mempool/replace/:oldTxHash
```

#### Get Recommended Fee Rate
```http
GET /api/mempool/fee-rate?priority=medium
```

**Response:**
```json
{
  "success": true,
  "priority": "medium",
  "recommendedFeeRate": 0.00001205,
  "minFeeRate": 0.001,
  "currentFeeRates": {
    "high": 0.00002,
    "medium": 0.000012,
    "low": 0.000005
  },
  "mempoolUtilization": "15.00%"
}
```

---

## Blockchain Explorer API

### Overview
Comprehensive blockchain explorer functionality allowing users to search and browse blockchain data.

### Features
- **Universal search**: Search blocks, transactions, and addresses
- **Rich list**: View top addresses by balance
- **Mining statistics**: Track miner performance
- **Chart data**: Historical difficulty, transaction, and supply data
- **Transaction history**: Complete address transaction history with pagination

### API Endpoints

#### Get Blockchain Statistics
```http
GET /api/explorer/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "blocks": 1245,
    "wallets": 89,
    "circulatingSupply": 1245000,
    "difficulty": 4,
    "avgBlockTime": 10234,
    "hashrate": "1234.56",
    "mempoolSize": 15,
    "utxos": 245,
    "contracts": 12
  }
}
```

#### Search Blockchain
```http
GET /api/explorer/search/:query
```

Searches for blocks (by index or hash), transactions (by hash), or addresses.

#### Get Block Details
```http
GET /api/explorer/block/:identifier
```

`:identifier` can be either block index (number) or block hash.

#### Get Transaction Details
```http
GET /api/explorer/transaction/:txHash
```

Returns transaction details including confirmation status and block information.

#### Get Address Details
```http
GET /api/explorer/address/:address?page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "address": "STRATxxx...",
  "balance": 125.5,
  "utxoCount": 8,
  "transactionCount": 45,
  "totalReceived": 200.0,
  "totalSent": 74.5,
  "transactions": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 45,
    "pages": 1
  }
}
```

#### Get Recent Blocks
```http
GET /api/explorer/blocks?page=1&limit=20
```

#### Get Rich List
```http
GET /api/explorer/richlist?limit=100
```

**Response:**
```json
{
  "success": true,
  "richList": [
    {
      "rank": 1,
      "address": "STRATxxx...",
      "balance": 50000.0,
      "percentage": "4.02"
    },
    ...
  ],
  "totalAddresses": 89
}
```

#### Get Mining Statistics
```http
GET /api/explorer/mining?days=7
```

**Response:**
```json
{
  "success": true,
  "period": "7 days",
  "totalBlocks": 1008,
  "totalRewards": 1008.0,
  "avgBlockTime": 10123,
  "uniqueMiners": 5,
  "miners": [
    {
      "address": "STRATxxx...",
      "blocks": 450,
      "totalReward": 450.0,
      "totalFees": 4.5
    },
    ...
  ]
}
```

#### Get Chart Data
```http
GET /api/explorer/charts/:type?days=30
```

Types: `difficulty`, `transactions`

---

## Enhanced WebSocket Support

### Overview
Real-time event streaming for live blockchain updates.

### Events

#### Connection
Automatically receive current stats on connection:
```javascript
socket.on('stats', (data) => {
  console.log('Blockchain stats:', data);
  // { blockHeight, difficulty, pendingTransactions, mempoolSize, utxos }
});
```

#### Subscribe to Address Updates
```javascript
// Subscribe
socket.emit('subscribe_address', 'STRATxxx...');

// Receive balance updates
socket.on('address_balance', (data) => {
  console.log('Balance update:', data);
  // { address, balance, change }
});
```

#### Subscribe to New Blocks
```javascript
// Subscribe
socket.emit('subscribe_blocks');

// Receive new blocks
socket.on('new_block', (data) => {
  console.log('New block:', data);
  // { index, hash, miner, reward, transactionCount, timestamp }
});
```

#### Subscribe to Mempool Updates
```javascript
// Subscribe
socket.emit('subscribe_mempool');

// Receive mempool stats every 5 seconds
socket.on('mempool_stats', (stats) => {
  console.log('Mempool:', stats);
  // { count, totalFees, avgFeeRate, utilization }
});
```

#### Subscribe to Mining Events
```javascript
// Subscribe
socket.emit('subscribe_mining');

// Receive mining events
socket.on('block_mined', (data) => {
  console.log('Block mined:', data);
  // { index, miner, reward }
});
```

#### Subscribe to Staking Events
```javascript
socket.on('stake_created', (data) => {
  console.log('Stake created:', data);
});

socket.on('stake_unlocked', (data) => {
  console.log('Stake unlocked:', data);
});

socket.on('rewards_claimed', (data) => {
  console.log('Rewards claimed:', data);
});
```

---

## Staking Mechanism

### Overview
Earn rewards by locking STRAT tokens for a specified period.

### Features
- **Multiple lock periods**: Short (3% APY), Medium (5% APY), Long (8% APY), Extended (12% APY)
- **Flexible rewards**: Claim rewards without unlocking principal
- **Auto-compounding**: Rewards accumulate automatically
- **Block-based calculation**: Rewards calculated per block

### Lock Periods

| Period    | Blocks  | Est. Days | APY   |
|-----------|---------|-----------|-------|
| Short     | 1,000   | ~1.9      | 3.0%  |
| Medium    | 5,000   | ~9.5      | 5.0%  |
| Long      | 10,000  | ~19.0     | 8.0%  |
| Extended  | 25,000  | ~47.6     | 12.0% |

### API Endpoints

#### Get Staking Info
```http
GET /api/staking/info
```

**Response:**
```json
{
  "success": true,
  "minStakeAmount": 1,
  "lockPeriods": [
    {
      "name": "short",
      "blocks": 1000,
      "apy": 3.0,
      "estimatedDays": "1.9"
    },
    ...
  ]
}
```

#### Create Stake
```http
POST /api/staking/stake
```

**Request Body:**
```json
{
  "address": "STRATxxx...",
  "amount": 100,
  "lockPeriod": "medium"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stake created successfully",
  "stake": {
    "id": "stake_id",
    "amount": 100,
    "apy": 5.0,
    "unlockBlock": 15234,
    "estimatedReward": "0.9516"
  }
}
```

#### Get Address Stakes
```http
GET /api/staking/address/:address?status=active
```

**Response:**
```json
{
  "success": true,
  "address": "STRATxxx...",
  "stats": {
    "totalStaked": 250,
    "totalRewards": 2.45,
    "activeStakes": 3,
    "totalStakes": 5
  },
  "stakes": [
    {
      "id": "stake_id",
      "amount": 100,
      "apy": 5.0,
      "status": "active",
      "startBlock": 10234,
      "unlockBlock": 15234,
      "currentBlock": 12500,
      "blocksRemaining": 2734,
      "canUnlock": false,
      "pendingRewards": 1.23,
      "totalRewards": 1.23,
      "createdAt": "2025-01-06T..."
    },
    ...
  ]
}
```

#### Unlock Stake
```http
POST /api/staking/unlock/:stakeId
```

Unlocks stake when lock period is complete.

#### Withdraw Stake
```http
POST /api/staking/withdraw/:stakeId
```

Withdraws unlocked stake and rewards to wallet.

#### Claim Rewards
```http
POST /api/staking/claim/:stakeId
```

Claims accumulated rewards without withdrawing principal.

#### Get Global Staking Stats
```http
GET /api/staking/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalStaked": 50000,
    "totalRewards": 245.67,
    "activeStakes": 156,
    "uniqueStakers": 45,
    "averageStake": 320.51
  }
}
```

---

## Smart Contract Gas Metering

### Overview
Prevents infinite loops and limits computation in smart contracts through gas metering.

### Features
- **Gas costs for operations**: Each operation has a defined gas cost
- **Out-of-gas protection**: Execution stops when gas limit is reached
- **Sandboxed execution**: Contracts run in isolated environment
- **Gas estimation**: Estimate gas before executing
- **Dynamic gas pricing**: Gas price adjusts based on network congestion

### Gas Costs

| Operation       | Gas Cost |
|----------------|----------|
| ADD/SUB        | 3        |
| MUL/DIV        | 5        |
| SLOAD (read)   | 200      |
| SSTORE (write) | 5000     |
| CALL           | 700      |
| CREATE         | 32000    |

### API Endpoints

#### Estimate Gas
```http
POST /api/contracts/estimate-gas
```

**Request Body:**
```json
{
  "contractAddress": "0xabc...",
  "params": { "method": "setValue", "value": 42 },
  "from": "STRATxxx..."
}
```

**Response:**
```json
{
  "success": true,
  "gasEstimate": 25600,
  "gasPrice": 0.00001205,
  "totalCost": 0.30848,
  "mempoolUtilization": "15.00%"
}
```

#### Get Current Gas Price
```http
GET /api/contracts/gas/price
```

**Response:**
```json
{
  "success": true,
  "gasPrice": 0.00001205,
  "mempoolSize": 15,
  "mempoolUtilization": "15.00%",
  "recommendation": {
    "slow": 0.00000964,
    "standard": 0.00001205,
    "fast": 0.00001808,
    "instant": 0.00002410
  }
}
```

### Contract Execution

When executing contracts, the system now returns gas information:

```json
{
  "success": true,
  "result": { ... },
  "gasUsed": 25600,
  "gasReport": {
    "gasLimit": 1000000,
    "gasUsed": 25600,
    "gasRemaining": 974400,
    "operations": [
      { "operation": "contract_execution", "gas": 700, "total": 700 },
      { "operation": "state.value (read)", "gas": 200, "total": 900 },
      { "operation": "state.value (write)", "gas": 5000, "total": 5900 },
      ...
    ]
  }
}
```

---

## Rate Limiting and DDoS Protection

### Overview
Comprehensive protection against abuse and DDoS attacks.

### Features

#### Rate Limiters
- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 failed attempts per 15 minutes
- **Transactions**: 10 per minute
- **Mining**: 60 requests per minute
- **Contract Deployment**: 10 per hour
- **Explorer**: 60 requests per minute

#### DDoS Detection
- **Request flood detection**: Blocks IPs with >100 requests/minute
- **Endpoint scanning detection**: Blocks IPs scanning >30 endpoints/minute
- **Suspicious IP tracking**: Maintains blacklist of suspicious IPs
- **Automatic cleanup**: Removes old entries every 5 minutes

#### Request Size Limiting
- **Maximum payload**: 10MB
- **Prevents memory exhaustion**: Rejects oversized requests

### Responses

When rate limited:
```json
{
  "error": "Too many requests",
  "message": "You have exceeded the rate limit.",
  "retryAfter": "2025-01-06T15:30:00.000Z"
}
```

When blocked for suspicious activity:
```json
{
  "error": "Suspicious activity detected",
  "message": "Your IP has been temporarily blocked due to suspicious activity."
}
```

---

## Usage Examples

### Creating and Managing a Stake

```javascript
// 1. Get staking info
const info = await fetch('http://localhost:3000/api/staking/info').then(r => r.json());
console.log('Available lock periods:', info.lockPeriods);

// 2. Create a stake
const stake = await fetch('http://localhost:3000/api/staking/stake', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: 'your_address',
    amount: 100,
    lockPeriod: 'medium'
  })
}).then(r => r.json());

console.log('Stake created:', stake.stake.id);

// 3. Monitor stake status
const stakes = await fetch(`http://localhost:3000/api/staking/address/${address}`)
  .then(r => r.json());

const myStake = stakes.stakes.find(s => s.id === stake.stake.id);
console.log('Blocks remaining:', myStake.blocksRemaining);
console.log('Pending rewards:', myStake.pendingRewards);

// 4. Claim rewards
if (myStake.pendingRewards > 0) {
  await fetch(`http://localhost:3000/api/staking/claim/${myStake.id}`, {
    method: 'POST'
  });
}

// 5. Unlock when ready
if (myStake.canUnlock) {
  await fetch(`http://localhost:3000/api/staking/unlock/${myStake.id}`, {
    method: 'POST'
  });

  // 6. Withdraw
  await fetch(`http://localhost:3000/api/staking/withdraw/${myStake.id}`, {
    method: 'POST'
  });
}
```

### Using the Mempool

```javascript
// Get recommended fee
const feeData = await fetch('http://localhost:3000/api/mempool/fee-rate?priority=fast')
  .then(r => r.json());

console.log('Recommended fee rate:', feeData.recommendedFeeRate);

// Submit transaction with appropriate fee
const tx = createTransaction({
  from: myAddress,
  to: recipientAddress,
  amount: 10,
  feeRate: feeData.recommendedFeeRate
});

// Monitor in mempool
const mempoolTx = await fetch(`http://localhost:3000/api/mempool/transaction/${tx.hash}`)
  .then(r => r.json());

console.log('Position in queue:', mempoolTx.position);
console.log('Priority score:', mempoolTx.priority);
```

### Exploring the Blockchain

```javascript
// Search for anything
const search = await fetch('http://localhost:3000/api/explorer/search/STRATxxx...')
  .then(r => r.json());

console.log('Found:', search.totalResults);
console.log('Addresses:', search.results.addresses);

// Get rich list
const richList = await fetch('http://localhost:3000/api/explorer/richlist?limit=10')
  .then(r => r.json());

console.log('Top 10 holders:', richList.richList);

// Get mining stats
const mining = await fetch('http://localhost:3000/api/explorer/mining?days=7')
  .then(r => r.json());

console.log('Total blocks (7 days):', mining.totalBlocks);
console.log('Top miners:', mining.miners);
```

---

## Environment Variables

Add these to your `.env` file to configure the new features:

```env
# Mempool Configuration
MEMPOOL_MAX_SIZE=10000
MIN_FEE_RATE=0.001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Gas Configuration
DEFAULT_GAS_LIMIT=1000000
BASE_GAS_PRICE=0.00001
```

---

## Breaking Changes

None. All features are backwards compatible with existing functionality.

---

## Performance Improvements

1. **Mempool**: Faster transaction selection for miners through priority queuing
2. **Gas Metering**: Prevents resource exhaustion from runaway contracts
3. **Rate Limiting**: Protects server resources from abuse
4. **WebSocket**: Reduces polling overhead with push notifications

---

## Security Enhancements

1. **DDoS Protection**: Multiple layers of protection against attacks
2. **Gas Limits**: Prevents infinite loops in smart contracts
3. **Request Size Limits**: Prevents memory exhaustion attacks
4. **Rate Limiting**: Prevents brute force and spam attacks

---

## Future Enhancements

Potential improvements for future versions:

1. **Mempool**: Add transaction replacement by fee (RBF) UI
2. **Staking**: Auto-compound rewards option
3. **Explorer**: Add more chart types (supply, fees, etc.)
4. **Gas**: Dynamic gas price adjustment based on block fullness
5. **Admin Dashboard**: Web interface for monitoring
6. **Analytics**: Advanced blockchain analytics and insights

---

## Support

For issues or questions about these features, please refer to the main README.md or create an issue in the repository.

---

**Last Updated:** January 6, 2026
**Version:** 1.0.0
