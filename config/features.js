// Feature flags for STRAT blockchain platform
module.exports = {
  // Core blockchain features
  blockchain: {
    sharding: {
      enabled: true,
      numberOfShards: 4,
      crossShardCommunication: true
    },
    pruning: {
      enabled: true,
      keepBlocks: 10000, // Keep last 10k blocks
      pruneInterval: 86400000 // Daily pruning
    },
    checkpoints: {
      enabled: true,
      checkpointInterval: 1000 // Every 1000 blocks
    }
  },

  // DeFi features
  defi: {
    liquidityPools: true,
    yieldFarming: true,
    lending: true,
    borrowing: true,
    flashLoans: false, // Coming soon
    perpetuals: false, // Coming soon
    options: false, // Coming soon
    syntheticAssets: false // Coming soon
  },

  // NFT features
  nft: {
    minting: true,
    marketplace: true,
    royalties: true,
    fractional: false, // Coming soon
    rental: false, // Coming soon
    bundles: false // Coming soon
  },

  // Governance features
  governance: {
    proposals: true,
    voting: true,
    delegation: true,
    timelock: true,
    quadraticVoting: false, // Coming soon
    conviction: false // Coming soon
  },

  // Trading features
  trading: {
    limitOrders: true,
    stopLoss: true,
    takeProfit: true,
    marginTrading: false, // Coming soon
    derivatives: false, // Coming soon
    perpetuals: false // Coming soon
  },

  // Social features
  social: {
    posts: true,
    comments: true,
    likes: true,
    profiles: true,
    achievements: true,
    referrals: true,
    messaging: false, // Coming soon
    groups: false // Coming soon
  },

  // Smart contract features
  smartContracts: {
    deployment: true,
    verification: true,
    interaction: true,
    upgradeable: false, // Coming soon
    multisig: false // Coming soon
  },

  // Security features
  security: {
    rateLimiting: true,
    ddosProtection: true,
    ipWhitelist: false,
    twoFactorAuth: false, // Coming soon
    hardwareWallet: true
  },

  // Analytics features
  analytics: {
    userAnalytics: true,
    transactionAnalytics: true,
    performanceMonitoring: true,
    errorTracking: true
  },

  // Integrations
  integrations: {
    metamask: true,
    walletConnect: true,
    ledger: true,
    trezor: false, // Coming soon
    exchanges: false // Coming soon
  },

  // API features
  api: {
    rest: true,
    graphql: false, // Coming soon
    websocket: true,
    grpc: false // Coming soon
  },

  // Mobile features
  mobile: {
    reactNativeWallet: false, // In development
    reactNativeMiner: false, // In development
    flutterPortfolio: false // In development
  },

  // Gaming features
  gaming: {
    nftAssets: false, // In development
    playToEarn: false, // In development
    tournaments: false, // In development
    vrCasino: false // Planned
  }
};
