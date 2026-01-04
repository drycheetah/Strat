# STRAT - Production Architecture

## Overview
STRAT is being rebuilt as a production-ready, enterprise-grade blockchain platform suitable for real-world deployment. This is NOT a toy or meme coin - it's a serious cryptocurrency with professional infrastructure.

## Architecture Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - REST API framework
- **MongoDB** - Primary database for users, wallets, blocks
- **WebSocket** - Real-time P2P communication
- **JWT** - Secure authentication
- **bcrypt** - Password hashing
- **BIP39/BIP32** - HD wallet implementation

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Professional styling
- **Recharts** - Advanced charting
- **WebSocket Client** - Real-time updates
- **React Query** - Data fetching/caching

### Security
- **Helmet.js** - HTTP security headers
- **CORS** - Cross-origin protection
- **Rate Limiting** - DDoS protection
- **Input Validation** (Joi) - Request validation
- **Encrypted Storage** - AES-256-GCM encryption
- **JWT Tokens** - Secure sessions

## Core Features

### 1. User Management
- ✅ Secure registration/login
- ✅ Email verification
- ✅ Password reset
- ✅ 2FA support (planned)
- ✅ Account lockout protection
- ✅ Role-based access control

### 2. HD Wallet System
- ✅ BIP39 mnemonic phrases (12/24 words)
- ✅ BIP32 hierarchical deterministic wallets
- ✅ Multiple wallets per user
- ✅ Encrypted private key storage
- ✅ Wallet backup/restore
- ✅ Change address generation
- Multi-signature support (planned)

### 3. Blockchain Core
- Proof-of-Work consensus
- UTXO transaction model
- Merkle tree validation
- Dynamic difficulty adjustment
- Block persistence to MongoDB
- Transaction mempool
- Smart contract execution
- Gas fee system

### 4. Transaction System
- UTXO-based transactions
- Digital signatures (ECDSA)
- Transaction validation
- Fee calculation
- Priority-based mempool
- Transaction history
- Confirmations tracking

### 5. Smart Contracts
- JavaScript-based VM
- State persistence
- Gas limits
- Deployment transactions
- Contract calls
- Event logging
- Security sandboxing

### 6. P2P Network
- WebSocket-based communication
- Peer discovery
- Block propagation
- Transaction broadcasting
- Chain synchronization
- Network health monitoring

### 7. API Layer
- RESTful endpoints
- Rate limiting
- Authentication middleware
- Input validation
- Error handling
- API documentation
- Versioning support

### 8. Frontend Dashboard
- **Modern UI/UX Design**
  - Professional gradient themes
  - Responsive layout
  - Dark/light mode
  - Real-time charts

- **Wallet Management**
  - Create HD wallets
  - Import from mnemonic
  - View balances
  - Transaction history
  - Export private keys (secure)

- **Transactions**
  - Send STRAT
  - QR code generation
  - Transaction status
  - Fee estimation
  - Batch transactions

- **Block Explorer**
  - Browse blocks
  - Search transactions
  - Address lookup
  - Network statistics
  - Rich list

- **Mining Interface**
  - Start/stop mining
  - Hashrate display
  - Earnings tracking
  - Mining pool support (future)

- **Smart Contracts**
  - Deploy contracts
  - Call contract methods
  - View contract state
  - Contract templates

### 9. Security Features
- **Authentication**
  - Secure password hashing (bcrypt, 12 rounds)
  - JWT with expiration
  - Refresh token rotation
  - Session management

- **Data Protection**
  - AES-256-GCM encryption
  - Secure key derivation (scrypt)
  - Encrypted wallet storage
  - HTTPS enforced

- **Attack Prevention**
  - Rate limiting (global + endpoint-specific)
  - CSRF protection
  - XSS prevention
  - SQL injection protection (NoSQL)
  - Input sanitization
  - Account lockout (5 attempts, 15min)

### 10. Monitoring & Logging
- Winston logging
- Error tracking
- Performance metrics
- Network statistics
- User activity logs
- Security event logging

## Database Schema

### Users Collection
```javascript
{
  email: String (unique, indexed)
  username: String (unique)
  password: String (hashed)
  wallets: [ObjectId]
  primaryWallet: ObjectId
  isVerified: Boolean
  loginAttempts: Number
  lockUntil: Date
  role: String (user|admin)
  createdAt: Date
}
```

### Wallets Collection
```javascript
{
  user: ObjectId
  address: String (unique, indexed)
  publicKey: String
  encryptedPrivateKey: String
  encryptedMnemonic: String
  name: String
  type: String (hd|standard|multisig)
  derivationPath: String
  balance: Number
  transactionCount: Number
  isBackedUp: Boolean
  createdAt: Date
}
```

### Blocks Collection
```javascript
{
  index: Number (unique, indexed)
  timestamp: Number (indexed)
  transactions: [Transaction]
  previousHash: String
  hash: String (unique, indexed)
  nonce: Number
  difficulty: Number
  merkleRoot: String
  miner: String
  reward: Number
  totalFees: Number
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/refresh` - Refresh JWT token

### Wallets
- `POST /api/wallets` - Create new wallet
- `POST /api/wallets/restore` - Restore from mnemonic
- `GET /api/wallets` - Get all user wallets
- `GET /api/wallets/:id` - Get specific wallet
- `GET /api/wallets/:id/transactions` - Get transaction history
- `POST /api/wallets/:id/export` - Export mnemonic (password required)
- `PUT /api/wallets/:id/primary` - Set as primary wallet

### Transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:hash` - Get transaction details
- `GET /api/transactions/pending` - Get pending transactions
- `GET /api/transactions/mempool` - Get mempool status

### Blockchain
- `GET /api/blocks` - Get all blocks (paginated)
- `GET /api/blocks/:index` - Get specific block
- `GET /api/blocks/latest` - Get latest block
- `GET /api/stats` - Get blockchain statistics
- `POST /api/mine` - Mine new block

### Smart Contracts
- `POST /api/contracts/deploy` - Deploy contract
- `POST /api/contracts/call` - Call contract method
- `GET /api/contracts/:address` - Get contract info
- `GET /api/contracts/:address/state` - Get contract state

### Network
- `GET /api/network/peers` - Get connected peers
- `POST /api/network/peers` - Connect to peer
- `GET /api/network/stats` - Get network statistics

## Deployment

### Requirements
- Node.js 18+
- MongoDB 6.0+
- 2GB+ RAM
- SSL certificate (Let's Encrypt)
- Domain name

### Environment Setup
```bash
# Install dependencies
npm install --production

# Set environment variables
cp .env.example .env
# Edit .env with production values

# Initialize database
npm run db:init

# Start production server
npm run start:prod
```

### Production Configuration
```env
NODE_ENV=production
PORT=443
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<256-bit-random-key>
CORS_ORIGIN=https://yourdomain.com
SSL_CERT=/path/to/cert.pem
SSL_KEY=/path/to/key.pem
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000 6000
CMD ["npm", "start"]
```

### Kubernetes (Future)
- Horizontal pod autoscaling
- Load balancing
- Persistent volume claims
- ConfigMaps/Secrets

## Performance Optimizations

### Database
- Indexes on frequently queried fields
- Connection pooling
- Query optimization
- Aggregation pipelines

### Caching
- Redis for session storage
- In-memory blockchain cache
- API response caching
- Compiled contract caching

### Frontend
- Code splitting
- Lazy loading
- Service workers
- CDN for static assets
- Gzip compression

## Monitoring & Maintenance

### Health Checks
- `/health` - API health endpoint
- Database connectivity
- P2P network status
- Mempool size

### Metrics
- Transactions per second
- Block time average
- Network hashrate
- Active users
- API response times

### Backups
- Daily MongoDB backups
- Wallet backup exports
- Blockchain snapshots
- Configuration backups

## Security Audit Checklist
- [ ] Penetration testing
- [ ] Smart contract audit
- [ ] Dependency vulnerability scan
- [ ] SSL/TLS configuration
- [ ] DDoS protection
- [ ] Incident response plan

## Roadmap

### Phase 1: Core Infrastructure (Current)
- ✅ User authentication
- ✅ HD wallet system
- ✅ Database persistence
- ✅ API security
- In Progress: Frontend development

### Phase 2: Advanced Features
- Block explorer
- Advanced charts
- Mining pools
- Token standards (ERC-20 like)
- Atomic swaps

### Phase 3: Scaling
- Sharding
- Layer 2 solutions
- Improved consensus
- Mobile apps
- Hardware wallet support

### Phase 4: Ecosystem
- Developer tools/SDK
- Block explorer API
- Merchant integration
- Payment gateway
- Governance system

## Key Differences from Demo Version

| Feature | Demo | Production |
|---------|------|------------|
| Storage | In-memory | MongoDB |
| Auth | None | JWT + bcrypt |
| Wallets | Simple file | HD + encryption |
| Security | Basic | Enterprise-grade |
| UI | Simple HTML | React + TypeScript |
| API | Basic REST | Full REST + WebSocket |
| Validation | Minimal | Comprehensive (Joi) |
| Rate Limiting | None | Multi-tier |
| Logging | Console | Winston (file + levels) |
| Error Handling | Basic | Production-ready |
| Testing | None | Unit + Integration |
| Deployment | Local | Cloud-ready |

## Support & Maintenance
- Regular security updates
- Dependency updates
- Bug fixes
- Performance monitoring
- Community support

---

**This is a professional cryptocurrency platform, not a meme coin.**
