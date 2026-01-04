# STRAT Blockchain - Quick Start Guide

Get your STRAT blockchain up and running in 5 minutes!

## Installation

```bash
npm install
```

## Option 1: Web Dashboard (Recommended for Beginners)

### Step 1: Start the Node
```bash
npm start
```

You should see:
```
============================================================
         STRAT - Custom Blockchain Network
============================================================

Creating new wallet...
New wallet created and saved!

Wallet Information:
Address: STRATxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Balance: 0 STRAT

P2P server listening on port 6000
HTTP server listening on port 3000
Dashboard: http://localhost:3000
============================================================
```

### Step 2: Open the Dashboard
Open your browser and go to:
```
http://localhost:3000
```

### Step 3: Mine Your First Block
Click the "Mine Block" button to mine a block and earn 50 STRAT!

### Step 4: Send STRAT
- Enter a recipient address (copy from your wallet or create another node)
- Enter an amount
- Click "Send Transaction"
- Mine another block to confirm the transaction

### Step 5: Deploy a Smart Contract
- Scroll to the Smart Contracts section
- Try the example counter contract:
```javascript
const count = state.count || 0;
state.count = count + (params.increment || 1);
return { count: state.count };
```
- Click "Deploy Contract"
- Mine a block to deploy it

## Option 2: Command Line Interface (CLI)

### Step 1: Create Wallets
```bash
node cli.js wallet create alice
node cli.js wallet create bob
node cli.js wallet create miner
```

### Step 2: Mine Some STRAT
```bash
node cli.js mine miner
```

This will mine a block and give 50 STRAT to the miner wallet.

### Step 3: Check Balance
```bash
node cli.js wallet balance miner
```

### Step 4: Send STRAT
```bash
node cli.js transaction create miner alice 25
```

### Step 5: Mine the Transaction
```bash
node cli.js mine miner
```

### Step 6: Verify the Transfer
```bash
node cli.js wallet balance alice
node cli.js wallet balance miner
```

### Step 7: View the Blockchain
```bash
node cli.js blockchain show
```

## Running Multiple Nodes (P2P Network)

### Terminal 1 - Node 1
```bash
node index.js 3000 6000
```

### Terminal 2 - Node 2 (connect to Node 1)
```bash
node index.js 3001 6001 ws://localhost:6000
```

### Terminal 3 - Node 3 (connect to Node 1)
```bash
node index.js 3002 6002 ws://localhost:6000
```

Now:
- Open http://localhost:3000 (Node 1)
- Open http://localhost:3001 (Node 2)
- Open http://localhost:3002 (Node 3)

When you mine a block on one node, it will automatically sync to all connected nodes!

## Common Commands

### Wallet Management
```bash
# List all wallets
node cli.js wallet list

# Get wallet details
node cli.js wallet info alice

# Check balance
node cli.js wallet balance alice
```

### Blockchain Operations
```bash
# View entire blockchain
node cli.js blockchain show

# Validate blockchain
node cli.js blockchain validate

# Show statistics
node cli.js blockchain stats
```

## API Examples (using curl)

### Get All Blocks
```bash
curl http://localhost:3000/api/blocks
```

### Get Wallet Info
```bash
curl http://localhost:3000/api/wallet
```

### Check Balance
```bash
curl http://localhost:3000/api/balance/STRATxxxxxxxxx
```

### Send Transaction
```bash
curl -X POST http://localhost:3000/api/transaction \
  -H "Content-Type: application/json" \
  -d '{"to": "STRATxxxxxxxxx", "amount": 10}'
```

### Mine Block
```bash
curl -X POST http://localhost:3000/api/mine
```

### Get Blockchain Stats
```bash
curl http://localhost:3000/api/stats
```

## Understanding the Output

### Mining Output
```
Mining block 1 with difficulty 4...
Nonce: 100000, Hash: 00001a2b3c4d5e6f...
Block mined! Hash: 00001a2b3c4d5e6f7g8h9i0j...
Time taken: 5.23s, Nonce: 154231
```

This shows:
- Block being mined
- Current difficulty (4 leading zeros required)
- Mining progress (nonce attempts)
- Final hash and time taken

### Blockchain Validation
```
Blockchain is VALID!
All blocks are properly linked and hashed.
```

This confirms:
- All blocks are cryptographically linked
- No tampering has occurred
- Chain integrity is maintained

## Next Steps

1. **Experiment with Smart Contracts**: Try the examples in `examples/contracts.js`
2. **Set Up a Network**: Run multiple nodes and watch them sync
3. **Modify Parameters**: Edit `src/blockchain.js` to change difficulty, rewards, etc.
4. **Build Applications**: Use the API to create blockchain-based apps

## Troubleshooting

### "Insufficient funds" error
Mine more blocks to get STRAT coins:
```bash
node cli.js mine <your-wallet-name>
```

### Wallet file not found
Create a wallet first:
```bash
node cli.js wallet create <wallet-name>
```

### Port already in use
Use different ports:
```bash
node index.js 3001 6001
```

## What You've Built

You now have a fully functional blockchain with:
- Proof-of-Work consensus
- UTXO transaction model
- Mining rewards and fees
- Smart contract execution
- P2P networking
- Web dashboard
- CLI tools
- Digital signatures
- Merkle trees

Congratulations! You're running your own cryptocurrency!

## Learn More

- Read the full [README.md](README.md) for detailed documentation
- Explore the source code in the `src/` directory
- Check out example smart contracts in `examples/contracts.js`

---

Happy mining!
