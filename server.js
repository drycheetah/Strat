require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const connectDB = require('./config/database');
const Blockchain = require('./src/blockchain');
const BlockModel = require('./models/Block');
const P2PServer = require('./src/p2p');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const walletRoutes = require('./routes/wallet.routes');
const blockchainRoutes = require('./routes/blockchain.routes');
const transactionRoutes = require('./routes/transaction.routes');
const contractRoutes = require('./routes/contract.routes');
const bridgeRoutes = require('./routes/bridge.routes');
const miningRoutes = require('./routes/mining.routes');
const mempoolRoutes = require('./routes/mempool.routes');
const explorerRoutes = require('./routes/explorer.routes');
const stakingRoutes = require('./routes/staking.routes');
const socialRoutes = require('./routes/social.routes');
const nftRoutes = require('./routes/nft.routes');
const gamingRoutes = require('./routes/gaming.routes');
const metaverseRoutes = require('./routes/metaverse.routes');
const governanceRoutes = require('./routes/governance.routes');
const tradingRoutes = require('./routes/trading.routes');
const analyticsRoutes = require('./routes/analytics.routes');

// Import analytics services
const TransactionAnalyticsService = require('./services/transactionAnalytics');
const UserAnalyticsService = require('./services/userAnalytics');
const ProtocolAnalyticsService = require('./services/protocolAnalytics');
const RevenueAnalyticsService = require('./services/revenueAnalytics');
const AlertingService = require('./services/alerting');
const PerformanceMonitor = require('./services/performanceMonitor');
const NetworkHealthMonitor = require('./services/networkHealthMonitor');
const ReportGenerator = require('./services/reportGenerator');

class ProductionServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });

    this.port = process.env.PORT || 3000;
    this.p2pPort = process.env.P2P_PORT || 6000;
    this.blockchain = null;
    this.p2pServer = null;

    // Analytics services
    this.transactionAnalytics = null;
    this.userAnalytics = null;
    this.protocolAnalytics = null;
    this.revenueAnalytics = null;
    this.alerting = null;
    this.performanceMonitor = null;
    this.networkMonitor = null;
    this.reportGenerator = null;
  }

  async initialize() {
    try {
      console.log('🔄 Connecting to MongoDB...');
      console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
      logger.info('Connecting to database...');

      // Connect to database with timeout
      const dbPromise = connectDB();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('MongoDB connection timeout after 30s')), 30000)
      );

      await Promise.race([dbPromise, timeoutPromise]);
      console.log('✅ Database connected successfully');
      logger.info('Database connected successfully');

      console.log('🔄 Initializing blockchain...');
      // Initialize blockchain
      await this.initializeBlockchain();
      console.log('✅ Blockchain initialized');
      logger.info('Blockchain initialized');

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Setup WebSocket
      this.setupWebSocket();

      // Initialize P2P network
      this.initializeP2P();

      // Initialize analytics services
      this.initializeAnalytics();

      logger.info('Server initialization complete');
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      console.error('Stack:', error.stack);
      logger.error(`Server initialization failed: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
      process.exit(1);
    }
  }

  async initializeBlockchain() {
    this.blockchain = new Blockchain();

    console.log('🔄 Loading blockchain from database...');
    // Load blockchain from database
    const blocks = await BlockModel.find().sort({ index: 1 });

    if (blocks.length > 0) {
      console.log(`📦 Found ${blocks.length} blocks in database, loading...`);
      logger.info(`Loading ${blocks.length} blocks from database...`);

      // Rebuild blockchain from database
      this.blockchain.chain = [];
      this.blockchain.utxos = new Map();
      this.blockchain.contracts = new Map();

      for (let blockDoc of blocks) {
        const block = {
          index: blockDoc.index,
          timestamp: blockDoc.timestamp,
          transactions: blockDoc.transactions,
          previousHash: blockDoc.previousHash,
          hash: blockDoc.hash,
          nonce: blockDoc.nonce,
          difficulty: blockDoc.difficulty,
          merkleRoot: blockDoc.merkleRoot
        };

        this.blockchain.chain.push(block);

        // Update UTXOs and contracts
        this.blockchain.updateUTXOs(block);
      }

      // Update difficulty based on last blocks
      const latestBlock = blocks[blocks.length - 1];
      this.blockchain.difficulty = latestBlock.difficulty;

      logger.info(`Blockchain loaded: ${blocks.length} blocks, ${this.blockchain.utxos.size} UTXOs`);
    } else {
      logger.info('No existing blockchain found, starting fresh');

      // Save genesis block to database
      const genesisBlock = this.blockchain.chain[0];
      const genesisDoc = new BlockModel({
        index: genesisBlock.index,
        timestamp: genesisBlock.timestamp,
        transactions: genesisBlock.transactions,
        previousHash: genesisBlock.previousHash,
        hash: genesisBlock.hash,
        nonce: genesisBlock.nonce,
        difficulty: genesisBlock.difficulty || 4,
        merkleRoot: genesisBlock.merkleRoot,
        miner: 'GENESIS',
        reward: 0,
        totalFees: 0,
        transactionCount: genesisBlock.transactions.length
      });

      await genesisDoc.save();
      logger.info('Genesis block saved to database');
    }
  }

  setupMiddleware() {
    // DDoS Protection
    const { ddosDetection, requestSizeLimiter } = require('./middleware/rateLimiter');
    this.app.use(ddosDetection());
    this.app.use(requestSizeLimiter(10000000)); // 10MB max

    // Security
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Inject blockchain and services into requests
    this.app.use((req, res, next) => {
      req.blockchain = this.blockchain;
      req.p2pServer = this.p2pServer;
      req.io = this.io;
      next();
    });

    // Make analytics services available to controllers
    this.app.locals.transactionAnalytics = this.transactionAnalytics;
    this.app.locals.userAnalytics = this.userAnalytics;
    this.app.locals.protocolAnalytics = this.protocolAnalytics;
    this.app.locals.revenueAnalytics = this.revenueAnalytics;
    this.app.locals.alerting = this.alerting;
    this.app.locals.performanceMonitor = this.performanceMonitor;
    this.app.locals.networkMonitor = this.networkMonitor;
    this.app.locals.reportGenerator = this.reportGenerator;

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });

    // Static files
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: Date.now(),
        blockchain: {
          blocks: this.blockchain.chain.length,
          difficulty: this.blockchain.difficulty,
          pendingTx: this.blockchain.pendingTransactions.length
        }
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/wallets', walletRoutes);
    this.app.use('/api/blockchain', blockchainRoutes);
    this.app.use('/api/transactions', transactionRoutes);
    this.app.use('/api/contracts', contractRoutes);
    this.app.use('/api/bridge', bridgeRoutes);
    this.app.use('/api/mining', miningRoutes);
    this.app.use('/api/mempool', mempoolRoutes);
    this.app.use('/api/explorer', explorerRoutes);
    this.app.use('/api/staking', stakingRoutes);
    this.app.use('/api/social', socialRoutes);
    this.app.use('/api/nft', nftRoutes);
    this.app.use('/api/gaming', gamingRoutes);
    this.app.use('/api/metaverse', metaverseRoutes);
    this.app.use('/api/governance', governanceRoutes);
    this.app.use('/api/trading', tradingRoutes);
    this.app.use('/api/price', require('./routes/price.routes'));
    this.app.use('/api/liquidity', require('./routes/liquidity.routes'));
    this.app.use('/api/analytics', analyticsRoutes);

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'STRAT Blockchain API',
        version: '1.0.0',
        endpoints: {
          auth: '/api/auth',
          wallets: '/api/wallets',
          blockchain: '/api/blockchain',
          transactions: '/api/transactions',
          contracts: '/api/contracts',
          bridge: '/api/bridge'
        },
        documentation: '/api/docs'
      });
    });

    // Serve frontend
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    this.app.get('/dashboard', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
      });
    });

    // Global error handler
    this.app.use((err, req, res, next) => {
      logger.error(`Error: ${err.message}\n${err.stack}`);

      const statusCode = err.statusCode || 500;
      const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

      res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
      });
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      logger.info(`WebSocket client connected: ${socket.id}`);

      // Send current stats
      socket.emit('stats', {
        blockHeight: this.blockchain.chain.length,
        difficulty: this.blockchain.difficulty,
        pendingTransactions: this.blockchain.pendingTransactions.length,
        mempoolSize: this.blockchain.mempool.transactions.size,
        utxos: this.blockchain.utxos.size
      });

      // Subscribe to address updates
      socket.on('subscribe_address', (address) => {
        socket.join(`address:${address}`);
        logger.info(`Client ${socket.id} subscribed to address ${address}`);

        // Send current balance
        const balance = this.blockchain.getBalance(address);
        socket.emit('address_balance', { address, balance });
      });

      socket.on('unsubscribe_address', (address) => {
        socket.leave(`address:${address}`);
        logger.info(`Client ${socket.id} unsubscribed from address ${address}`);
      });

      // Subscribe to new blocks
      socket.on('subscribe_blocks', () => {
        socket.join('blocks');
        logger.info(`Client ${socket.id} subscribed to new blocks`);
      });

      socket.on('unsubscribe_blocks', () => {
        socket.leave('blocks');
      });

      // Subscribe to mempool updates
      socket.on('subscribe_mempool', () => {
        socket.join('mempool');
        logger.info(`Client ${socket.id} subscribed to mempool`);

        // Send current mempool stats
        const mempoolStats = this.blockchain.mempool.getStats();
        socket.emit('mempool_stats', mempoolStats);
      });

      socket.on('unsubscribe_mempool', () => {
        socket.leave('mempool');
      });

      // Subscribe to mining updates
      socket.on('subscribe_mining', () => {
        socket.join('mining');
        logger.info(`Client ${socket.id} subscribed to mining updates`);
      });

      socket.on('unsubscribe_mining', () => {
        socket.leave('mining');
      });

      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${socket.id}`);
      });
    });

    // Broadcast stats every 10 seconds
    setInterval(() => {
      const mempoolStats = this.blockchain.mempool.getStats();
      this.io.emit('stats', {
        blockHeight: this.blockchain.chain.length,
        difficulty: this.blockchain.difficulty,
        pendingTransactions: this.blockchain.pendingTransactions.length,
        mempoolSize: this.blockchain.mempool.transactions.size,
        mempoolUtilization: mempoolStats.utilization,
        utxos: this.blockchain.utxos.size,
        timestamp: Date.now()
      });
    }, 10000);

    // Broadcast mempool stats every 5 seconds
    setInterval(() => {
      const mempoolStats = this.blockchain.mempool.getStats();
      this.io.to('mempool').emit('mempool_stats', mempoolStats);
    }, 5000);
  }

  initializeP2P() {
    this.p2pServer = new P2PServer(this.blockchain, this.p2pPort);
    this.p2pServer.listen();

    // Connect to initial peer if provided
    const initialPeer = process.env.INITIAL_PEER;
    if (initialPeer) {
      logger.info(`Connecting to initial peer: ${initialPeer}`);
      this.p2pServer.connectToPeer(initialPeer);
    }
  }

  initializeAnalytics() {
    console.log('🔄 Initializing analytics services...');

    // Initialize analytics services
    this.transactionAnalytics = new TransactionAnalyticsService(this.blockchain);
    this.userAnalytics = new UserAnalyticsService(this.blockchain);
    this.protocolAnalytics = new ProtocolAnalyticsService(this.blockchain);
    this.revenueAnalytics = new RevenueAnalyticsService();
    this.alerting = new AlertingService(this.io);
    this.performanceMonitor = new PerformanceMonitor(this.alerting);
    this.networkMonitor = new NetworkHealthMonitor(this.blockchain, this.p2pServer, this.alerting);
    this.reportGenerator = new ReportGenerator();

    // Start analytics services
    this.transactionAnalytics.startAnalytics();
    this.userAnalytics.startAnalytics();
    this.protocolAnalytics.startAnalytics();
    this.revenueAnalytics.startTracking();
    this.alerting.startMonitoring();
    this.performanceMonitor.startMonitoring();
    this.networkMonitor.startMonitoring();
    this.reportGenerator.scheduleReports();

    console.log('✅ Analytics services initialized');
    logger.info('Analytics services initialized and started');
  }

  async start() {
    await this.initialize();

    this.server.listen(this.port, () => {
      logger.info('='.repeat(60));
      logger.info('STRAT Blockchain - Production Server');
      logger.info('='.repeat(60));
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`HTTP Server: http://localhost:${this.port}`);
      logger.info(`P2P Server: ws://localhost:${this.p2pPort}`);
      logger.info(`Blockchain: ${this.blockchain.chain.length} blocks`);
      logger.info(`Difficulty: ${this.blockchain.difficulty}`);
      logger.info('='.repeat(60));
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  async shutdown() {
    logger.info('Shutting down gracefully...');

    // Close HTTP server
    this.server.close(() => {
      logger.info('HTTP server closed');
    });

    // Close database connection
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    logger.info('Database connection closed');

    process.exit(0);
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new ProductionServer();
  server.start().catch(error => {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  });
}

module.exports = ProductionServer;
