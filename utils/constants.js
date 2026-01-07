// STRAT Blockchain Constants

module.exports = {
  // Network Constants
  NETWORK: {
    MAINNET: 'mainnet',
    TESTNET: 'testnet',
    DEVNET: 'devnet',
    CHAIN_ID_MAINNET: 1,
    CHAIN_ID_TESTNET: 2,
    CHAIN_ID_DEVNET: 3
  },

  // Blockchain Parameters
  BLOCKCHAIN: {
    BLOCK_TIME: 15000, // 15 seconds
    MAX_BLOCK_SIZE: 1048576, // 1 MB
    MAX_TX_PER_BLOCK: 2000,
    DIFFICULTY_ADJUSTMENT_INTERVAL: 100, // blocks
    INITIAL_DIFFICULTY: 4,
    MAX_DIFFICULTY: 20,
    MIN_DIFFICULTY: 1,
    GENESIS_REWARD: 50,
    HALVING_INTERVAL: 210000, // blocks
    MAX_SUPPLY: 21000000 // 21 million STRAT
  },

  // Transaction Constants
  TRANSACTION: {
    MIN_FEE: 0.0001, // STRAT
    MAX_FEE: 1.0, // STRAT
    DEFAULT_FEE: 0.001, // STRAT
    MIN_TX_SIZE: 100, // bytes
    MAX_TX_SIZE: 10240, // 10 KB
    CONFIRMATIONS_REQUIRED: 6,
    MEMPOOL_MAX_SIZE: 5000
  },

  // Consensus Constants
  CONSENSUS: {
    TYPE: 'PoS', // Proof of Stake
    MIN_STAKE: 100, // Minimum 100 STRAT to stake
    EPOCH_LENGTH: 7200, // blocks (~30 hours)
    VALIDATOR_SLOTS: 21,
    SLASHING_PERCENTAGE: 5, // 5% slash for bad behavior
    UNBONDING_PERIOD: 151200, // blocks (~26 days)
    MAX_DELEGATION: 10 // Max delegations per address
  },

  // DeFi Constants
  DEFI: {
    MIN_LIQUIDITY: 1, // Minimum 1 STRAT
    MAX_FEE: 1.0, // 1% max pool fee
    MIN_FEE: 0.01, // 0.01% min pool fee
    DEFAULT_POOL_FEE: 0.3, // 0.3%
    FLASH_LOAN_FEE: 0.09, // 0.09%
    MIN_COLLATERAL_RATIO: 150, // 150% collateralization
    LIQUIDATION_PENALTY: 5, // 5% liquidation penalty
    MIN_BORROW: 10 // Minimum 10 STRAT to borrow
  },

  // NFT Constants
  NFT: {
    MAX_ROYALTY: 50, // 50% max royalty
    DEFAULT_ROYALTY: 5, // 5% default
    MINTING_FEE: 0.01, // STRAT
    MARKETPLACE_FEE: 2.5, // 2.5%
    MAX_METADATA_SIZE: 102400, // 100 KB
    IPFS_GATEWAY: 'https://ipfs.io/ipfs/'
  },

  // Governance Constants
  GOVERNANCE: {
    MIN_PROPOSAL_STAKE: 100, // 100 STRAT to create proposal
    VOTING_PERIOD: 604800000, // 7 days in ms
    MIN_VOTING_PERIOD: 86400000, // 1 day
    MAX_VOTING_PERIOD: 2592000000, // 30 days
    EXECUTION_DELAY: 172800000, // 2 days
    DEFAULT_QUORUM: 0.1, // 10%
    DEFAULT_THRESHOLD: 0.5, // 50%
    MAX_PROPOSALS_PER_USER: 5, // Active proposals
    PROPOSAL_EXPIRATION: 5184000000 // 60 days
  },

  // Trading Constants
  TRADING: {
    MIN_ORDER_SIZE: 0.01, // STRAT
    MAX_ORDER_SIZE: 1000000, // STRAT
    MAX_ACTIVE_ORDERS: 100, // Per user
    ORDER_EXPIRATION: 2592000000, // 30 days
    TAKER_FEE: 0.1, // 0.1%
    MAKER_FEE: 0.05, // 0.05%
    MAX_LEVERAGE: 10, // 10x max leverage
    LIQUIDATION_THRESHOLD: 85 // 85%
  },

  // Social Constants
  SOCIAL: {
    MAX_POST_LENGTH: 10000, // characters
    MAX_COMMENT_LENGTH: 2000,
    MAX_USERNAME_LENGTH: 50,
    MAX_BIO_LENGTH: 500,
    MAX_IMAGES_PER_POST: 10,
    POSTING_COOLDOWN: 30000, // 30 seconds
    MAX_DAILY_POSTS: 100
  },

  // Smart Contract Constants
  SMART_CONTRACT: {
    MAX_GAS: 10000000,
    GAS_PRICE: 0.00000001, // STRAT per gas unit
    MAX_CONTRACT_SIZE: 24576, // 24 KB
    DEPLOYMENT_FEE: 0.1, // STRAT
    VERIFICATION_FEE: 0.01 // STRAT
  },

  // Staking Constants
  STAKING: {
    MIN_STAKE_AMOUNT: 1, // 1 STRAT
    MAX_STAKE_AMOUNT: 1000000, // 1M STRAT
    MIN_STAKING_PERIOD: 86400000, // 1 day
    REWARD_RATE: 0.08, // 8% APY
    COMPOUND_FREQUENCY: 86400000, // Daily
    EARLY_UNSTAKE_PENALTY: 2 // 2%
  },

  // Rate Limiting
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 60,
    MAX_REQUESTS_PER_HOUR: 1000,
    MAX_REQUESTS_PER_DAY: 10000,
    DDOS_THRESHOLD: 100, // requests per second
    BAN_DURATION: 3600000 // 1 hour
  },

  // WebSocket Constants
  WEBSOCKET: {
    PING_INTERVAL: 30000, // 30 seconds
    CONNECTION_TIMEOUT: 60000, // 1 minute
    MAX_CONNECTIONS_PER_IP: 10,
    MAX_MESSAGE_SIZE: 10240, // 10 KB
    HEARTBEAT_INTERVAL: 25000 // 25 seconds
  },

  // Cache Constants
  CACHE: {
    BLOCK_TTL: 3600, // 1 hour
    TRANSACTION_TTL: 1800, // 30 minutes
    PRICE_TTL: 60, // 1 minute
    USER_TTL: 300, // 5 minutes
    API_TTL: 120 // 2 minutes
  },

  // Error Codes
  ERROR_CODES: {
    INVALID_TRANSACTION: 1001,
    INSUFFICIENT_FUNDS: 1002,
    INVALID_SIGNATURE: 1003,
    DUPLICATE_TRANSACTION: 1004,
    BLOCK_VALIDATION_FAILED: 2001,
    CHAIN_SYNC_FAILED: 2002,
    CONSENSUS_FAILURE: 3001,
    INSUFFICIENT_STAKE: 3002,
    PROPOSAL_NOT_FOUND: 4001,
    VOTING_PERIOD_ENDED: 4002,
    INSUFFICIENT_VOTING_POWER: 4003,
    ORDER_NOT_FOUND: 5001,
    INSUFFICIENT_LIQUIDITY: 5002,
    SLIPPAGE_EXCEEDED: 5003,
    NFT_NOT_FOUND: 6001,
    NOT_NFT_OWNER: 6002,
    SMART_CONTRACT_EXECUTION_FAILED: 7001,
    GAS_LIMIT_EXCEEDED: 7002,
    RATE_LIMIT_EXCEEDED: 8001,
    UNAUTHORIZED: 8002,
    FORBIDDEN: 8003
  },

  // Token Standards
  TOKEN_STANDARDS: {
    NATIVE: 'STRAT',
    ERC20: 'ERC20',
    ERC721: 'ERC721',
    ERC1155: 'ERC1155'
  },

  // API Versions
  API_VERSION: {
    V1: 'v1',
    V2: 'v2',
    CURRENT: 'v1'
  },

  // Time Constants
  TIME: {
    SECOND: 1000,
    MINUTE: 60000,
    HOUR: 3600000,
    DAY: 86400000,
    WEEK: 604800000,
    MONTH: 2592000000,
    YEAR: 31536000000
  },

  // Decimal Precision
  PRECISION: {
    STRAT: 18, // 18 decimal places
    USD: 2,
    PERCENTAGE: 2
  }
};
