# ⛏️ STRAT Standalone Miner

A command-line mining tool for the STRAT blockchain. Mine STRAT tokens from your terminal!

---

## 🚀 Quick Start

### Option 1: Direct Usage (No Installation)

```bash
node strat-miner.js --address YOUR_WALLET_ADDRESS
```

### Option 2: Global Installation

```bash
# Install globally (from project directory)
npm install -g .

# Run from anywhere
strat-miner --address YOUR_WALLET_ADDRESS
```

---

## 📋 Requirements

- **Node.js** v14 or higher
- **STRAT wallet address** (get one from https://strat.io/dashboard.html)
- **Internet connection** to connect to STRAT blockchain

---

## 💻 Usage

### Basic Mining

```bash
node strat-miner.js --address STRATxxx123abc
```

### Connect to Custom API

```bash
node strat-miner.js --address STRATxxx123abc --api https://api.strat.io
```

### Multi-threaded Mining (Faster!)

```bash
node strat-miner.js --address STRATxxx123abc --threads 4
```

### Full Example

```bash
node strat-miner.js \
  --address STRATxxx123abc \
  --api https://api.strat.io \
  --threads 8
```

---

## 🎮 Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--address` | `-a` | Your STRAT wallet address (required) | - |
| `--api` | `-u` | STRAT blockchain API URL | `http://localhost:3000` |
| `--threads` | `-t` | Number of mining threads | `1` |
| `--help` | `-h` | Show help message | - |

---

## 📊 Mining Dashboard

Once mining starts, you'll see a real-time dashboard:

```
╔═══════════════════════════════════════════════════════════╗
║              STRAT MINER - RUNNING                        ║
╚═══════════════════════════════════════════════════════════╝

📊 Mining Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Hashrate:        15,234 H/s
  Total Hashes:    1,523,456

  Blocks Found:    3
  Current Block:   #4,521
  Difficulty:      0000 (4 leading zeros)

  Total Earned:    150.00 STRAT
  Avg Block Time:  45s

  Uptime:          2h 15m 30s
  Threads:         4

⛏️  Mining to:      STRATxxx123abc...
🌐 Connected to:   https://api.strat.io

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: ⚡ MINING...

Press Ctrl+C to stop mining
```

---

## 💰 How Mining Works

1. **Get Work**: Miner requests current block data from STRAT API
2. **Hash**: Miner calculates millions of hashes to find valid proof-of-work
3. **Submit**: When valid hash is found, miner submits to blockchain
4. **Reward**: If accepted, you earn STRAT tokens (current reward: 50 STRAT/block)

### Mining Rewards

- **Block Reward**: 50 STRAT per block (decreases over time)
- **Transaction Fees**: Small fees from transactions in the block
- **Automatic**: Rewards sent directly to your wallet address

---

## 🎯 Mining Tips

### 1. Optimize Threads

Test different thread counts to find optimal performance:

```bash
# Try 1, 2, 4, 8 threads and compare hashrate
node strat-miner.js -a YOUR_ADDRESS -t 1
node strat-miner.js -a YOUR_ADDRESS -t 4
node strat-miner.js -a YOUR_ADDRESS -t 8
```

### 2. Run 24/7

Use a process manager like `pm2` to keep mining continuously:

```bash
npm install -g pm2
pm2 start strat-miner.js -- --address YOUR_ADDRESS --threads 4
pm2 save
pm2 startup  # Auto-start on system boot
```

### 3. Monitor Performance

Check your earnings anytime:

```bash
curl https://api.strat.io/api/mining/earnings/YOUR_ADDRESS
```

### 4. Join Mining Pools (Coming Soon)

Solo mining difficulty increases over time. Pool mining shares rewards more consistently.

---

## 🔧 Troubleshooting

### "Failed to get mining work"

- Check your internet connection
- Verify the API URL is correct
- Make sure STRAT blockchain is running

### Low Hashrate

- Increase threads: `--threads 8`
- Close other applications using CPU
- Consider mining on a more powerful machine

### "Transaction signature required" or Auth Errors

These errors are for the SOL bridge, not mining. Mining doesn't require authentication!

### No Blocks Found

- Mining is competitive - finding blocks requires luck and hashpower
- Lower difficulty = easier to find blocks (early blockchain)
- Higher difficulty = harder to find blocks (mature blockchain)

---

## 🌐 API Endpoints Used

The miner connects to these STRAT blockchain endpoints:

- **GET** `/api/mining/work?address=YOUR_ADDRESS` - Get block to mine
- **POST** `/api/mining/submit` - Submit mined block
- **GET** `/api/mining/stats` - Get network statistics
- **GET** `/api/mining/earnings/:address` - Check your earnings

---

## 💡 Examples

### Mine on Local Development Server

```bash
node strat-miner.js \
  --address STRAT_local_test_123 \
  --api http://localhost:3000 \
  --threads 2
```

### Mine on Production

```bash
node strat-miner.js \
  --address STRATprod_abc123xyz \
  --api https://api.strat.io \
  --threads 8
```

### Check Earnings

```bash
# Using curl
curl https://api.strat.io/api/mining/earnings/YOUR_ADDRESS

# Using browser
https://strat.io/dashboard.html
```

---

## 📈 Profitability Calculator

Estimate your earnings:

| Hashrate | Difficulty | Avg Blocks/Day | STRAT/Day | USD/Day (@ $0.01) |
|----------|------------|----------------|-----------|-------------------|
| 1,000 H/s | 4 | 0.5 | 25 | $0.25 |
| 10,000 H/s | 4 | 5 | 250 | $2.50 |
| 100,000 H/s | 4 | 50 | 2,500 | $25.00 |

**Note**: Actual earnings vary based on network difficulty and competition.

---

## 🔐 Security

- **No Private Keys**: Miner never needs your private key
- **Read-Only Wallet**: Only needs your public wallet address
- **Open Source**: Review the code in `strat-miner.js`
- **No Sudo/Admin**: Never needs elevated permissions

---

## 🆘 Need Help?

- **Documentation**: https://docs.strat.io
- **Discord**: https://discord.gg/strat
- **GitHub Issues**: https://github.com/strat/blockchain/issues
- **Email**: support@strat.io

---

## 📜 License

MIT License - Free to use and modify

---

**Happy Mining! ⛏️💎**

*Built with Claude AI - Anthropic's frontier model*
