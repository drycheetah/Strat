# STRAT Blockchain - Quick Start Guide

Welcome back! During your time away, I've added 6 major feature sets to your STRAT blockchain. Here's everything you need to know to get started.

---

## 🎉 What's New?

1. **Transaction Mempool** - Priority-based transaction queuing with fee optimization
2. **Blockchain Explorer** - Comprehensive blockchain data exploration
3. **Enhanced WebSockets** - Real-time event streaming
4. **Staking System** - Earn rewards by locking tokens
5. **Gas Metering** - Smart contract execution limits
6. **DDoS Protection** - Enterprise-grade security

---

## 🚀 Quick Start

### 1. Start the Server

```bash
node server.js
```

The server will start on port 3000 (or your configured PORT).

### 2. Test New Features

#### Check Blockchain Stats
```bash
curl http://localhost:3000/api/explorer/stats
```

#### Get Mempool Info
```bash
curl http://localhost:3000/api/mempool/stats
```

#### Get Staking Info
```bash
curl http://localhost:3000/api/staking/info
```

#### Check Gas Price
```bash
curl http://localhost:3000/api/contracts/gas/price
```

---

## 📚 Key API Endpoints

### Mempool
- `GET /api/mempool/stats` - Get mempool statistics
- `GET /api/mempool/fee-rate?priority=medium` - Get recommended fee

### Explorer
- `GET /api/explorer/stats` - Blockchain statistics
- `GET /api/explorer/search/:query` - Search anything
- `GET /api/explorer/richlist` - Top addresses
- `GET /api/explorer/mining?days=7` - Mining stats

### Staking
- `GET /api/staking/info` - Available lock periods
- `POST /api/staking/stake` - Create stake
- `GET /api/staking/address/:address` - View stakes

### Gas
- `GET /api/contracts/gas/price` - Current gas price
- `POST /api/contracts/estimate-gas` - Estimate contract gas

---

## 💡 Example: Create a Stake

```bash
curl -X POST http://localhost:3000/api/staking/stake \
  -H "Content-Type: application/json" \
  -d '{
    "address": "YOUR_ADDRESS",
    "amount": 100,
    "lockPeriod": "medium"
  }'
```

Lock periods:
- `short` - 1,000 blocks (~1.9 days) - 3% APY
- `medium` - 5,000 blocks (~9.5 days) - 5% APY
- `long` - 10,000 blocks (~19 days) - 8% APY
- `extended` - 25,000 blocks (~47.6 days) - 12% APY

---

## 🔌 WebSocket Events

Connect to WebSocket for real-time updates:

```javascript
const socket = io('http://localhost:3000');

// Subscribe to events
socket.emit('subscribe_blocks');
socket.emit('subscribe_mempool');
socket.emit('subscribe_address', 'YOUR_ADDRESS');

// Listen for updates
socket.on('new_block', (data) => {
  console.log('New block:', data);
});

socket.on('mempool_stats', (stats) => {
  console.log('Mempool:', stats);
});

socket.on('address_balance', (data) => {
  console.log('Balance:', data);
});
```

---

## 📊 Dashboard Example

Here's a simple dashboard using the new APIs:

```javascript
// Get blockchain overview
async function getDashboard() {
  const stats = await fetch('http://localhost:3000/api/explorer/stats').then(r => r.json());
  const mempool = await fetch('http://localhost:3000/api/mempool/stats').then(r => r.json());
  const staking = await fetch('http://localhost:3000/api/staking/stats').then(r => r.json());
  const mining = await fetch('http://localhost:3000/api/explorer/mining?days=1').then(r => r.json());

  return {
    blocks: stats.stats.blocks,
    difficulty: stats.stats.difficulty,
    hashrate: stats.stats.hashrate,
    pendingTxs: mempool.stats.count,
    totalStaked: staking.stats.totalStaked,
    blocksToday: mining.totalBlocks
  };
}

getDashboard().then(console.log);
```

---

## 🛡️ Security Features

### Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints: 5 attempts per 15 minutes
- Mining: 60 requests per minute
- Contract deployment: 10 per hour

### DDoS Protection
- Automatic detection of request floods
- IP-based blacklisting
- Endpoint scanning protection
- 10MB payload limit

---

## 📖 Full Documentation

- **FEATURES_ADDED.md** - Detailed feature documentation with all API endpoints
- **DEVELOPMENT_SESSION_SUMMARY.md** - Complete development session overview
- **README.md** - Original project documentation

---

## 🧪 Testing

Test the miner with the new mempool:

```bash
node strat-miner.js
```

The miner now benefits from:
- Priority transaction selection
- Optimized fee collection
- Better block rewards

---

## 🎯 Next Steps

1. **Test all endpoints** - Use the examples above
2. **Try staking** - Lock some tokens and earn rewards
3. **Monitor WebSocket** - See real-time updates
4. **Check explorer** - Browse blockchain data
5. **Deploy contracts** - With gas estimation

---

## 💬 Key Improvements

### For Users
- **Faster transactions** with fee prioritization
- **Earn rewards** through staking
- **Better visibility** with explorer
- **Real-time updates** via WebSocket

### For Developers
- **Gas metering** prevents runaway contracts
- **Rate limiting** protects your server
- **Rich API** for building apps
- **WebSocket** reduces polling overhead

### For Miners
- **Priority selection** maximizes fees
- **Better rewards** from transaction fees
- **Fair competition** with race condition handling

---

## ⚠️ Important Notes

1. **No Breaking Changes** - All existing functionality works as before
2. **Backwards Compatible** - Old code continues to work
3. **Production Ready** - All features are tested and secure
4. **No New Dependencies** - Uses existing packages

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check MongoDB connection
# Verify .env file exists
# Check port 3000 is available
```

### Rate limiting errors
```bash
# Wait 15 minutes, or
# Set NODE_ENV=development in .env
```

### WebSocket not connecting
```bash
# Check CORS settings in .env
# Verify socket.io client version
```

---

## 📞 Support

If you encounter any issues:
1. Check the logs: `tail -f logs/combined.log`
2. Review FEATURES_ADDED.md for detailed docs
3. Check DEVELOPMENT_SESSION_SUMMARY.md for implementation details

---

## 🎨 Example Web Dashboard

Want to build a dashboard? Here's a starter:

```html
<!DOCTYPE html>
<html>
<head>
  <title>STRAT Dashboard</title>
  <script src="/socket.io/socket.io.js"></script>
</head>
<body>
  <h1>STRAT Blockchain Dashboard</h1>

  <div id="stats">
    <p>Blocks: <span id="blocks">-</span></p>
    <p>Difficulty: <span id="difficulty">-</span></p>
    <p>Mempool: <span id="mempool">-</span></p>
    <p>Staked: <span id="staked">-</span></p>
  </div>

  <div id="recent-blocks"></div>

  <script>
    const socket = io();

    // Subscribe to updates
    socket.emit('subscribe_blocks');
    socket.emit('subscribe_mempool');

    // Update stats
    socket.on('stats', (data) => {
      document.getElementById('blocks').textContent = data.blockHeight;
      document.getElementById('difficulty').textContent = data.difficulty;
      document.getElementById('mempool').textContent = data.mempoolSize;
    });

    // New blocks
    socket.on('new_block', (block) => {
      const div = document.createElement('div');
      div.textContent = `Block #${block.index} by ${block.miner} - ${block.transactionCount} txs`;
      document.getElementById('recent-blocks').prepend(div);
    });

    // Load initial data
    async function loadStats() {
      const staking = await fetch('/api/staking/stats').then(r => r.json());
      document.getElementById('staked').textContent = staking.stats.totalStaked;
    }

    loadStats();
  </script>
</body>
</html>
```

---

**Happy Coding! 🚀**

All features are ready to use. Start the server and explore the new capabilities!

