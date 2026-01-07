const mongoose = require('mongoose');

// Transaction Analytics Model
const transactionAnalyticsSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  hour: { type: Number, min: 0, max: 23 },
  totalTransactions: { type: Number, default: 0 },
  totalVolume: { type: Number, default: 0 },
  averageTransactionValue: { type: Number, default: 0 },
  averageFee: { type: Number, default: 0 },
  totalFees: { type: Number, default: 0 },
  uniqueAddresses: { type: Number, default: 0 },
  successRate: { type: Number, default: 100 },
  failedTransactions: { type: Number, default: 0 },
  peakTPS: { type: Number, default: 0 },
  averageTPS: { type: Number, default: 0 },
  transactionTypes: {
    transfer: { type: Number, default: 0 },
    contract: { type: Number, default: 0 },
    staking: { type: Number, default: 0 },
    bridge: { type: Number, default: 0 },
    nft: { type: Number, default: 0 }
  }
}, { timestamps: true });

transactionAnalyticsSchema.index({ date: -1 });
transactionAnalyticsSchema.index({ date: 1, hour: 1 });

// User Behavior Analytics Model
const userBehaviorAnalyticsSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  totalUsers: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  newUsers: { type: Number, default: 0 },
  returningUsers: { type: Number, default: 0 },
  averageSessionDuration: { type: Number, default: 0 }, // in seconds
  averageTransactionsPerUser: { type: Number, default: 0 },
  userRetentionRate: { type: Number, default: 0 },
  churnRate: { type: Number, default: 0 },
  topUsersByVolume: [{
    address: String,
    volume: Number,
    transactions: Number
  }],
  userDistribution: {
    whales: { type: Number, default: 0 }, // > 100,000 STRAT
    large: { type: Number, default: 0 },  // 10,000 - 100,000 STRAT
    medium: { type: Number, default: 0 }, // 1,000 - 10,000 STRAT
    small: { type: Number, default: 0 },  // < 1,000 STRAT
    inactive: { type: Number, default: 0 }
  },
  activityByTimeOfDay: [Number] // 24 hours
}, { timestamps: true });

userBehaviorAnalyticsSchema.index({ date: -1 });

// Protocol Analytics Model
const protocolAnalyticsSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  protocol: {
    type: String,
    required: true,
    enum: ['defi', 'staking', 'bridge', 'nft', 'governance', 'social']
  },
  totalValueLocked: { type: Number, default: 0 },
  volume24h: { type: Number, default: 0 },
  volume7d: { type: Number, default: 0 },
  volume30d: { type: Number, default: 0 },
  uniqueUsers: { type: Number, default: 0 },
  totalTransactions: { type: Number, default: 0 },
  averageTransactionSize: { type: Number, default: 0 },
  protocolRevenue: { type: Number, default: 0 },
  protocolFees: { type: Number, default: 0 },
  utilizationRate: { type: Number, default: 0 },
  metrics: mongoose.Schema.Types.Mixed // Protocol-specific metrics
}, { timestamps: true });

protocolAnalyticsSchema.index({ date: -1, protocol: 1 });

// Network Health Analytics Model
const networkHealthSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  blockHeight: { type: Number, required: true },
  difficulty: { type: Number, required: true },
  hashRate: { type: Number, default: 0 },
  averageBlockTime: { type: Number, default: 0 }, // in seconds
  mempoolSize: { type: Number, default: 0 },
  mempoolUtilization: { type: Number, default: 0 },
  pendingTransactions: { type: Number, default: 0 },
  networkUtxos: { type: Number, default: 0 },
  activeValidators: { type: Number, default: 0 },
  totalStaked: { type: Number, default: 0 },
  p2pConnections: { type: Number, default: 0 },
  networkLatency: { type: Number, default: 0 }, // in ms
  orphanedBlocks: { type: Number, default: 0 },
  averageGasPrice: { type: Number, default: 0 },
  networkStatus: {
    type: String,
    enum: ['healthy', 'degraded', 'critical'],
    default: 'healthy'
  }
}, { timestamps: true });

networkHealthSchema.index({ timestamp: -1 });

// Performance Metrics Model
const performanceMetricsSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  service: {
    type: String,
    required: true,
    enum: ['api', 'blockchain', 'p2p', 'database', 'websocket']
  },
  responseTime: { type: Number, default: 0 }, // in ms
  throughput: { type: Number, default: 0 }, // requests per second
  errorRate: { type: Number, default: 0 },
  cpuUsage: { type: Number, default: 0 },
  memoryUsage: { type: Number, default: 0 },
  diskUsage: { type: Number, default: 0 },
  networkIO: {
    in: { type: Number, default: 0 },
    out: { type: Number, default: 0 }
  },
  activeConnections: { type: Number, default: 0 }
}, { timestamps: true });

performanceMetricsSchema.index({ timestamp: -1, service: 1 });

// Alert Model
const alertSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  severity: {
    type: String,
    required: true,
    enum: ['info', 'warning', 'error', 'critical']
  },
  category: {
    type: String,
    required: true,
    enum: ['performance', 'security', 'network', 'transaction', 'validator', 'system']
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  source: { type: String, required: true },
  metadata: mongoose.Schema.Types.Mixed,
  resolved: { type: Boolean, default: false },
  resolvedAt: Date,
  resolvedBy: String,
  actions: [{
    action: String,
    timestamp: Date,
    result: String
  }]
}, { timestamps: true });

alertSchema.index({ timestamp: -1, severity: 1 });
alertSchema.index({ resolved: 1 });

// Revenue Analytics Model
const revenueAnalyticsSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  totalRevenue: { type: Number, default: 0 },
  transactionFees: { type: Number, default: 0 },
  bridgeFees: { type: Number, default: 0 },
  nftRoyalties: { type: Number, default: 0 },
  stakingRewards: { type: Number, default: 0 },
  contractDeploymentFees: { type: Number, default: 0 },
  otherRevenue: { type: Number, default: 0 },
  revenueByProtocol: {
    defi: { type: Number, default: 0 },
    nft: { type: Number, default: 0 },
    bridge: { type: Number, default: 0 },
    staking: { type: Number, default: 0 },
    trading: { type: Number, default: 0 }
  },
  cumulativeRevenue: { type: Number, default: 0 }
}, { timestamps: true });

revenueAnalyticsSchema.index({ date: -1 });

const TransactionAnalytics = mongoose.model('TransactionAnalytics', transactionAnalyticsSchema);
const UserBehaviorAnalytics = mongoose.model('UserBehaviorAnalytics', userBehaviorAnalyticsSchema);
const ProtocolAnalytics = mongoose.model('ProtocolAnalytics', protocolAnalyticsSchema);
const NetworkHealth = mongoose.model('NetworkHealth', networkHealthSchema);
const PerformanceMetrics = mongoose.model('PerformanceMetrics', performanceMetricsSchema);
const Alert = mongoose.model('Alert', alertSchema);
const RevenueAnalytics = mongoose.model('RevenueAnalytics', revenueAnalyticsSchema);

module.exports = {
  TransactionAnalytics,
  UserBehaviorAnalytics,
  ProtocolAnalytics,
  NetworkHealth,
  PerformanceMetrics,
  Alert,
  RevenueAnalytics
};
