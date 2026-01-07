# WebSocket API Documentation

## Overview

STRAT provides a comprehensive WebSocket API for real-time blockchain data streaming and updates. The WebSocket API enables clients to subscribe to various events and receive instant notifications.

## Connection

### Endpoint
```
ws://localhost:3000/socket.io/
```

### Authentication
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token',
    apiKey: 'your-api-key'
  }
});
```

## Client Events (Emit)

### Subscribe to Address Updates
Monitor balance and transaction updates for a specific address.

```javascript
socket.emit('subscribe_address', 'STRATaddress123...');
```

**Response:**
```javascript
socket.on('address_balance', (data) => {
  console.log(data);
  // { address: 'STRATaddress123...', balance: 1000.5 }
});
```

### Unsubscribe from Address
```javascript
socket.emit('unsubscribe_address', 'STRATaddress123...');
```

### Subscribe to New Blocks
Receive notifications when new blocks are mined.

```javascript
socket.emit('subscribe_blocks');
```

**Response:**
```javascript
socket.on('new_block', (block) => {
  console.log('New block mined:', block);
  // { index: 1234, hash: '0x...', transactions: [...], ... }
});
```

### Unsubscribe from Blocks
```javascript
socket.emit('unsubscribe_blocks');
```

### Subscribe to Mempool Updates
Monitor pending transactions and mempool statistics.

```javascript
socket.emit('subscribe_mempool');
```

**Response:**
```javascript
socket.on('mempool_stats', (stats) => {
  console.log('Mempool stats:', stats);
  // {
  //   size: 150,
  //   bytes: 45000,
  //   utilization: 0.45,
  //   avgFee: 0.001,
  //   highPriorityCount: 20
  // }
});
```

### Subscribe to Mining Updates
Monitor mining activity and hashrate.

```javascript
socket.emit('subscribe_mining');
```

**Response:**
```javascript
socket.on('mining_update', (data) => {
  console.log('Mining update:', data);
  // {
  //   hashrate: 1000000,
  //   difficulty: 4,
  //   miners: 25,
  //   estimatedTime: 60000
  // }
});
```

### Subscribe to Price Updates
Real-time cryptocurrency price updates.

```javascript
socket.emit('subscribe_price', { symbol: 'STRAT' });
```

**Response:**
```javascript
socket.on('price_update', (data) => {
  console.log('Price update:', data);
  // {
  //   symbol: 'STRAT',
  //   price: 1.25,
  //   change24h: 5.2,
  //   volume24h: 1000000,
  //   timestamp: 1640000000000
  // }
});
```

### Subscribe to Smart Contract Events
Monitor specific smart contract events.

```javascript
socket.emit('subscribe_contract', {
  address: 'STRATcontract123...',
  events: ['Transfer', 'Approval']
});
```

**Response:**
```javascript
socket.on('contract_event', (event) => {
  console.log('Contract event:', event);
  // {
  //   contractAddress: 'STRATcontract123...',
  //   event: 'Transfer',
  //   args: { from: '0x...', to: '0x...', value: 100 },
  //   transactionHash: '0x...',
  //   blockNumber: 1234
  // }
});
```

### Subscribe to Governance Proposals
Monitor governance proposals and voting.

```javascript
socket.emit('subscribe_governance');
```

**Response:**
```javascript
socket.on('proposal_update', (proposal) => {
  console.log('Proposal update:', proposal);
  // {
  //   id: 'prop-123',
  //   title: 'Increase block reward',
  //   votesFor: 1000,
  //   votesAgainst: 500,
  //   status: 'active'
  // }
});
```

## Server Events (Listen)

### Connection Events

#### Connected
```javascript
socket.on('connect', () => {
  console.log('Connected to STRAT WebSocket');
});
```

#### Disconnected
```javascript
socket.on('disconnect', () => {
  console.log('Disconnected from STRAT WebSocket');
});
```

#### Error
```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

### Blockchain Events

#### Stats Update
Broadcast every 10 seconds with blockchain statistics.

```javascript
socket.on('stats', (stats) => {
  console.log('Blockchain stats:', stats);
  // {
  //   blockHeight: 1234,
  //   difficulty: 4,
  //   pendingTransactions: 50,
  //   mempoolSize: 150,
  //   mempoolUtilization: 0.45,
  //   utxos: 5000,
  //   timestamp: 1640000000000
  // }
});
```

#### New Transaction
```javascript
socket.on('new_transaction', (transaction) => {
  console.log('New transaction:', transaction);
  // {
  //   id: 'tx-123',
  //   from: '0x...',
  //   to: '0x...',
  //   amount: 100,
  //   fee: 0.001,
  //   timestamp: 1640000000000
  // }
});
```

#### Transaction Confirmed
```javascript
socket.on('transaction_confirmed', (data) => {
  console.log('Transaction confirmed:', data);
  // {
  //   txId: 'tx-123',
  //   blockHeight: 1234,
  //   confirmations: 1
  // }
});
```

#### Balance Update
```javascript
socket.on('balance_update', (data) => {
  console.log('Balance updated:', data);
  // {
  //   address: '0x...',
  //   oldBalance: 1000,
  //   newBalance: 1100,
  //   change: 100
  // }
});
```

### Mining Events

#### Mining Started
```javascript
socket.on('mining_started', (data) => {
  console.log('Mining started:', data);
  // {
  //   miner: '0x...',
  //   difficulty: 4,
  //   timestamp: 1640000000000
  // }
});
```

#### Block Found
```javascript
socket.on('block_found', (block) => {
  console.log('Block found:', block);
  // {
  //   index: 1234,
  //   hash: '0x...',
  //   miner: '0x...',
  //   reward: 50,
  //   transactions: 25
  // }
});
```

### Notification Events

#### Alert
```javascript
socket.on('alert', (alert) => {
  console.log('System alert:', alert);
  // {
  //   type: 'warning',
  //   message: 'High network congestion',
  //   timestamp: 1640000000000
  // }
});
```

## Rate Limiting

WebSocket connections are subject to rate limiting:
- Maximum 100 subscriptions per connection
- Maximum 1000 messages per minute per connection
- Maximum 10 concurrent connections per IP address

When rate limit is exceeded:
```javascript
socket.on('rate_limit_exceeded', (data) => {
  console.error('Rate limit exceeded:', data);
  // {
  //   limit: 1000,
  //   window: 60000,
  //   retryAfter: 30000
  // }
});
```

## Error Handling

### Authentication Error
```javascript
socket.on('auth_error', (error) => {
  console.error('Authentication failed:', error);
  // {
  //   code: 'AUTH_FAILED',
  //   message: 'Invalid token'
  // }
});
```

### Subscription Error
```javascript
socket.on('subscription_error', (error) => {
  console.error('Subscription failed:', error);
  // {
  //   code: 'INVALID_SUBSCRIPTION',
  //   message: 'Invalid address format',
  //   subscription: 'subscribe_address'
  // }
});
```

## Best Practices

1. **Connection Management**
   - Implement reconnection logic with exponential backoff
   - Handle disconnect events gracefully
   - Clean up subscriptions on disconnect

2. **Error Handling**
   - Always listen for error events
   - Implement fallback mechanisms
   - Log errors for debugging

3. **Performance**
   - Subscribe only to necessary events
   - Unsubscribe when data is no longer needed
   - Use message batching for high-frequency updates

4. **Security**
   - Use secure WebSocket connections (wss://) in production
   - Validate all incoming data
   - Implement proper authentication

## Example Client Implementation

```javascript
const io = require('socket.io-client');

class STRATWebSocketClient {
  constructor(url, apiKey) {
    this.socket = io(url, {
      auth: { apiKey },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Connected to STRAT');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from STRAT');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('stats', (stats) => {
      this.handleStats(stats);
    });
  }

  subscribeToAddress(address) {
    this.socket.emit('subscribe_address', address);

    return new Promise((resolve) => {
      this.socket.once('address_balance', (data) => {
        resolve(data);
      });
    });
  }

  subscribeToBlocks(callback) {
    this.socket.emit('subscribe_blocks');
    this.socket.on('new_block', callback);
  }

  handleStats(stats) {
    // Custom stats handling logic
    console.log('Blockchain stats:', stats);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

// Usage
const client = new STRATWebSocketClient('http://localhost:3000', 'your-api-key');

client.subscribeToBlocks((block) => {
  console.log('New block:', block);
});

client.subscribeToAddress('STRATaddress123...')
  .then((data) => {
    console.log('Address balance:', data.balance);
  });
```

## Protocol Specifications

### Message Format
All messages follow the Socket.IO protocol with JSON payloads.

### Heartbeat
Automatic ping/pong every 25 seconds to maintain connection.

### Compression
Message compression is enabled for payloads > 1KB.

### Binary Data
Binary data (if any) is transmitted using Buffer objects.

## Support

For WebSocket API support:
- Documentation: https://docs.strat.io/websocket-api
- Issues: https://github.com/strat/blockchain/issues
- Discord: https://discord.gg/strat
