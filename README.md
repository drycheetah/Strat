# STRAT Blockchain

A full-featured custom blockchain implementation with proof-of-work consensus, UTXO transaction model, smart contracts, and peer-to-peer networking.

## Features

- **Proof-of-Work Mining**: Secure consensus mechanism with adjustable difficulty
- **UTXO Model**: Bitcoin-style unspent transaction output model for transactions
- **Smart Contracts**: JavaScript-based smart contract execution engine
- **P2P Network**: WebSocket-based peer-to-peer networking for decentralization
- **Web Dashboard**: Beautiful web interface for monitoring and interacting with the blockchain
- **CLI Tools**: Command-line interface for wallet management and mining
- **Transaction Fees**: Built-in transaction fee system to incentivize miners
- **Mining Rewards**: Block rewards for miners with automatic adjustment
- **Digital Signatures**: Elliptic curve cryptography (secp256k1) for secure transactions

## Installation

```bash
npm install
```

## Quick Start

### 1. Start a Node

```bash
npm start
# Or specify custom ports: node index.js <http-port> <p2p-port>
node index.js 3000 6000
```

This will:
- Create a default wallet (if it doesn't exist)
- Start the blockchain node
- Launch the web dashboard at http://localhost:3000
- Start P2P server on port 6000

### 2. Access the Web Dashboard

Open your browser and navigate to:
```
http://localhost:3000
```

The dashboard allows you to:
- View your wallet and balance
- Send STRAT to other addresses
- Mine new blocks
- Deploy and interact with smart contracts
- View the entire blockchain
- Monitor network statistics

## CLI Usage

The CLI tool provides powerful command-line functionality:

### Wallet Commands

```bash
# Create a new wallet
node cli.js wallet create <name>

# List all wallets
node cli.js wallet list

# Check wallet balance
node cli.js wallet balance <name>

# Show detailed wallet information
node cli.js wallet info <name>
```

### Transaction Commands

```bash
# Create a transaction between wallets
node cli.js transaction create <from-wallet> <to-wallet> <amount>
```

### Mining Commands

```bash
# Mine pending transactions
node cli.js mine <miner-wallet>
```

### Blockchain Commands

```bash
# Display the entire blockchain
node cli.js blockchain show

# Validate blockchain integrity
node cli.js blockchain validate

# Show blockchain statistics
node cli.js blockchain stats
```

## Example Workflow

```bash
# 1. Create wallets
node cli.js wallet create alice
node cli.js wallet create bob
node cli.js wallet create miner

# 2. Mine initial blocks to get some STRAT
node cli.js mine miner

# 3. Check balance
node cli.js wallet balance miner

# 4. Send STRAT to another wallet
node cli.js transaction create miner alice 25

# 5. Mine the transaction
node cli.js mine miner

# 6. Verify the transaction
node cli.js wallet balance alice
node cli.js blockchain show
```

## Running Multiple Nodes (P2P Network)

You can run multiple nodes and connect them together:

### Node 1
```bash
node index.js 3000 6000
```

### Node 2 (connecting to Node 1)
```bash
node index.js 3001 6001 ws://localhost:6000
```

### Node 3 (connecting to Node 1)
```bash
node index.js 3002 6002 ws://localhost:6000
```

Nodes will automatically sync their blockchains and share transactions.

## Smart Contracts

STRAT supports JavaScript-based smart contracts with state management.

### Example Contract

```javascript
// Simple counter contract
const count = state.count || 0;
state.count = count + (params.increment || 1);
return { count: state.count };
```

### Deploying via Web Dashboard

1. Navigate to the Smart Contracts section
2. Enter your contract code
3. Click "Deploy Contract"
4. Mine a block to deploy it

### Deploying via API

```bash
curl -X POST http://localhost:3000/api/contract/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const count = state.count || 0; state.count = count + 1; return {count: state.count};",
    "gasLimit": 100000,
    "gasPrice": 1
  }'
```

## API Endpoints

### Blockchain
- `GET /api/blocks` - Get all blocks
- `GET /api/blocks/:index` - Get specific block
- `GET /api/stats` - Get blockchain statistics

### Wallet
- `GET /api/wallet` - Get current wallet info
- `GET /api/balance/:address` - Get balance for address

### Transactions
- `POST /api/transaction` - Create new transaction
- `GET /api/pending` - Get pending transactions

### Mining
- `POST /api/mine` - Mine a new block

### Smart Contracts
- `POST /api/contract/deploy` - Deploy a contract
- `POST /api/contract/call` - Call a contract
- `GET /api/contract/:address` - Get contract info

### P2P Network
- `GET /api/peers` - Get connected peers
- `POST /api/peers` - Connect to new peer

## Architecture

### Core Components

- **Block** ([src/block.js](src/block.js)): Block structure with proof-of-work mining
- **Transaction** ([src/transaction.js](src/transaction.js)): Transaction handling with digital signatures
- **Blockchain** ([src/blockchain.js](src/blockchain.js)): Main blockchain logic with UTXO management
- **Wallet** ([src/wallet.js](src/wallet.js)): Wallet management and transaction creation
- **Crypto** ([src/crypto.js](src/crypto.js)): Cryptographic utilities (hashing, signatures)
- **P2P Server** ([src/p2p.js](src/p2p.js)): Peer-to-peer networking
- **HTTP Server** ([src/server.js](src/server.js)): REST API and web server

### Transaction Model

STRAT uses the UTXO (Unspent Transaction Output) model:
- Each transaction consumes previous UTXOs as inputs
- Creates new UTXOs as outputs
- Change is returned to sender
- Transaction fees incentivize miners

### Consensus

- **Proof-of-Work**: Miners solve cryptographic puzzles
- **Difficulty Adjustment**: Automatically adjusts every 10 blocks
- **Block Time**: Target of 10 seconds per block
- **Mining Reward**: 50 STRAT per block
- **Transaction Fee**: 0.01 STRAT per transaction

## Security Features

- **Digital Signatures**: All transactions signed with ECDSA (secp256k1)
- **Merkle Trees**: Efficient transaction verification
- **Chain Validation**: Cryptographic linking of blocks
- **UTXO Verification**: Prevents double-spending
- **Address Generation**: Secure key-to-address derivation

## Project Structure

```
strat/
├── src/
│   ├── block.js           # Block implementation
│   ├── blockchain.js      # Blockchain core logic
│   ├── crypto.js          # Cryptographic utilities
│   ├── transaction.js     # Transaction handling
│   ├── wallet.js          # Wallet management
│   ├── p2p.js            # P2P networking
│   └── server.js         # HTTP server
├── public/
│   └── index.html        # Web dashboard
├── wallets/              # Wallet storage (auto-created)
├── index.js              # Node entry point
├── cli.js                # CLI tool
└── package.json          # Dependencies
```

## Configuration

Edit the blockchain parameters in [src/blockchain.js](src/blockchain.js):

```javascript
this.difficulty = 4;                    // Mining difficulty
this.miningReward = 50;                 // Block reward
this.transactionFee = 0.01;            // Transaction fee
this.blockTime = 10000;                // Target block time (ms)
this.difficultyAdjustmentInterval = 10; // Adjust every N blocks
```

## Technical Details

### Address Format
- Prefix: `STRAT`
- Hash: RIPEMD160(SHA256(publicKey))
- Example: `STRAT1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9`

### Transaction Hash
- SHA256 of transaction inputs and outputs
- Used as transaction identifier

### Block Hash
- SHA256 of block header (index, timestamp, transactions, nonce, previousHash)
- Must meet difficulty requirement (leading zeros)

### Merkle Root
- Binary hash tree of all transactions
- Enables efficient transaction verification

## Development

### Prerequisites
- Node.js 14+
- npm or yarn

### Dependencies
- `elliptic`: Elliptic curve cryptography
- `ws`: WebSocket implementation
- `express`: Web server framework

## Limitations

This is an educational implementation. For production use, consider:
- Database persistence (currently in-memory)
- Advanced consensus mechanisms
- More sophisticated smart contract security
- Network encryption
- DDoS protection
- Comprehensive testing suite

## License

MIT

## Contributing

This is a custom blockchain implementation for educational purposes. Feel free to fork and experiment!

## Support

For issues and questions, please review the code documentation and examples provided.

---

Built with Node.js | Powered by Proof-of-Work | Secured by Cryptography
