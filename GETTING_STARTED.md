# Getting Started with STRAT

## Prerequisites

Before you begin, ensure you have:
- **Node.js** 18.x or higher
- **MongoDB** 6.0+ running locally OR MongoDB Atlas account
- **Git** (optional)

## Quick Start (Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

The `.env` file is already configured for local development. If MongoDB is not on default port, update:

```env
MONGODB_URI=mongodb://localhost:27017/strat
```

### 3. Start MongoDB (if local)

**Windows:**
```bash
# If installed as service, it should auto-start
# Or manually:
mongod --dbpath=C:\data\db
```

**Mac/Linux:**
```bash
# If installed via homebrew:
brew services start mongodb-community

# Or manually:
mongod --config /usr/local/etc/mongod.conf
```

### 4. Start the Server

```bash
npm run dev
```

You should see:
```
==========================================================
STRAT Blockchain - Production Server
==========================================================
Environment: development
HTTP Server: http://localhost:3000
P2P Server: ws://localhost:6000
Blockchain: 1 blocks
Difficulty: 4
==========================================================
```

### 5. Test the API

Open another terminal:

```bash
# Health check
curl http://localhost:3000/health

# Get blockchain stats
curl http://localhost:3000/api/blockchain/stats

# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123456"
  }'
```

## Using the System

### 1. Register and Login

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "username": "alice",
    "password": "Secure123!"
  }'
```

Save the `token` and `wallet.mnemonic` from the response!

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "Secure123!"
  }'
```

Save the `token` - you'll need it for authenticated requests.

### 2. Use Your Wallet

**Get wallets:**
```bash
curl http://localhost:3000/api/wallets \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Get wallet balance:**
```bash
curl http://localhost:3000/api/wallets/WALLET_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Mine Blocks

```bash
curl -X POST http://localhost:3000/api/blockchain/mine \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

This will mine a block and credit 50 STRAT to your wallet!

### 4. Send Transactions

```bash
curl -X POST http://localhost:3000/api/transactions/send \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "fromWalletId": "YOUR_WALLET_ID",
    "toAddress": "RECIPIENT_ADDRESS",
    "amount": 10,
    "password": "Secure123!"
  }'
```

### 5. Deploy Smart Contract

```bash
curl -X POST http://localhost:3000/api/contracts/deploy \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "YOUR_WALLET_ID",
    "code": "const count = state.count || 0; state.count = count + 1; return {count: state.count};",
    "password": "Secure123!",
    "gasLimit": 100000,
    "gasPrice": 1
  }'
```

## Using the CLI

The original CLI still works for basic operations:

```bash
# View blockchain
node cli.js blockchain show

# Check stats
node cli.js blockchain stats

# Validate chain
node cli.js blockchain validate
```

## API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile (requires token)

### Wallets
- `POST /api/wallets` - Create new wallet
- `POST /api/wallets/restore` - Restore from mnemonic
- `GET /api/wallets` - List all wallets
- `GET /api/wallets/:id` - Get wallet details
- `GET /api/wallets/:id/transactions` - Get transaction history

### Blockchain
- `GET /api/blockchain/stats` - Get statistics
- `GET /api/blockchain/blocks` - List blocks (paginated)
- `GET /api/blockchain/blocks/:id` - Get specific block
- `GET /api/blockchain/address/:address` - Get address info
- `POST /api/blockchain/mine` - Mine new block

### Transactions
- `POST /api/transactions/send` - Send transaction
- `POST /api/transactions/estimate-fee` - Estimate fee
- `GET /api/transactions/mempool` - View mempool
- `GET /api/transactions/:hash` - Get transaction

### Smart Contracts
- `POST /api/contracts/deploy` - Deploy contract
- `POST /api/contracts/call` - Call contract
- `GET /api/contracts` - List all contracts
- `GET /api/contracts/:address` - Get contract info

## WebSocket Events

Connect to `ws://localhost:3000`:

**Server Events:**
- `stats` - Blockchain statistics (every 10s)
- `new_block` - New block mined
- `new_transaction` - New transaction created
- `contract_deployed` - Contract deployed
- `contract_called` - Contract called

**Client Events:**
- `subscribe_address` - Subscribe to address updates
- `unsubscribe_address` - Unsubscribe from address

## Troubleshooting

### "Cannot connect to MongoDB"
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`
- For Atlas, whitelist your IP

### "Port 3000 already in use"
- Change PORT in `.env`
- Or kill process: `lsof -ti:3000 | xargs kill` (Mac/Linux)

### "Authentication required"
- Ensure you're sending the JWT token in headers:
  ```
  Authorization: Bearer YOUR_TOKEN
  ```

### "Insufficient funds"
- Mine some blocks first to get STRAT
- Check balance: `GET /api/wallets/:id`

## Next Steps

1. **Frontend Development**: Build React frontend (see STATUS.md)
2. **Production Deployment**: Follow SETUP_PRODUCTION.md
3. **P2P Network**: Connect multiple nodes
4. **Smart Contracts**: Build more complex contracts

## Architecture

This is a **production-grade blockchain** with:
- ✅ MongoDB database persistence
- ✅ JWT authentication
- ✅ HD wallets (BIP39/BIP32)
- ✅ UTXO transaction model
- ✅ Smart contracts
- ✅ WebSocket real-time updates
- ✅ Rate limiting & security
- ✅ RESTful API
- ✅ P2P networking

See [PRODUCTION_ARCHITECTURE.md](PRODUCTION_ARCHITECTURE.md) for complete details.

## Support

- Check STATUS.md for current implementation status
- Review PRODUCTION_ARCHITECTURE.md for system design
- See SETUP_PRODUCTION.md for deployment guide

---

**This is a real cryptocurrency blockchain, not a demo.**
