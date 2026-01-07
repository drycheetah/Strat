// Validation utilities for STRAT blockchain

const { isValidAddress } = require('./helpers');
const { TRANSACTION, BLOCKCHAIN, DEFI, NFT, GOVERNANCE, TRADING, SOCIAL } = require('./constants');

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validate transaction data
 */
exports.validateTransaction = (tx) => {
  const errors = [];

  if (!tx.from || !isValidAddress(tx.from)) {
    errors.push({ field: 'from', message: 'Invalid sender address' });
  }

  if (!tx.to || !isValidAddress(tx.to)) {
    errors.push({ field: 'to', message: 'Invalid recipient address' });
  }

  if (typeof tx.amount !== 'number' || tx.amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number' });
  }

  if (tx.fee && (tx.fee < TRANSACTION.MIN_FEE || tx.fee > TRANSACTION.MAX_FEE)) {
    errors.push({
      field: 'fee',
      message: `Fee must be between ${TRANSACTION.MIN_FEE} and ${TRANSACTION.MAX_FEE}`
    });
  }

  if (!tx.signature || tx.signature.length === 0) {
    errors.push({ field: 'signature', message: 'Transaction signature is required' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate block data
 */
exports.validateBlock = (block) => {
  const errors = [];

  if (typeof block.index !== 'number' || block.index < 0) {
    errors.push({ field: 'index', message: 'Block index must be a non-negative number' });
  }

  if (!block.previousHash || block.previousHash.length !== 64) {
    errors.push({ field: 'previousHash', message: 'Invalid previous hash' });
  }

  if (!block.hash || block.hash.length !== 64) {
    errors.push({ field: 'hash', message: 'Invalid block hash' });
  }

  if (!block.timestamp || typeof block.timestamp !== 'number') {
    errors.push({ field: 'timestamp', message: 'Invalid timestamp' });
  }

  if (!Array.isArray(block.transactions)) {
    errors.push({ field: 'transactions', message: 'Transactions must be an array' });
  } else if (block.transactions.length > BLOCKCHAIN.MAX_TX_PER_BLOCK) {
    errors.push({
      field: 'transactions',
      message: `Block cannot contain more than ${BLOCKCHAIN.MAX_TX_PER_BLOCK} transactions`
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate NFT metadata
 */
exports.validateNFT = (nft) => {
  const errors = [];

  if (!nft.name || nft.name.length === 0) {
    errors.push({ field: 'name', message: 'NFT name is required' });
  }

  if (!nft.image || nft.image.length === 0) {
    errors.push({ field: 'image', message: 'NFT image is required' });
  }

  if (!nft.owner || !isValidAddress(nft.owner)) {
    errors.push({ field: 'owner', message: 'Invalid owner address' });
  }

  if (nft.royaltyPercent && (nft.royaltyPercent < 0 || nft.royaltyPercent > NFT.MAX_ROYALTY)) {
    errors.push({
      field: 'royaltyPercent',
      message: `Royalty must be between 0 and ${NFT.MAX_ROYALTY}%`
    });
  }

  if (nft.metadata && JSON.stringify(nft.metadata).length > NFT.MAX_METADATA_SIZE) {
    errors.push({
      field: 'metadata',
      message: `Metadata size exceeds maximum of ${NFT.MAX_METADATA_SIZE} bytes`
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate governance proposal
 */
exports.validateProposal = (proposal) => {
  const errors = [];

  if (!proposal.title || proposal.title.length < 5 || proposal.title.length > 200) {
    errors.push({ field: 'title', message: 'Title must be between 5 and 200 characters' });
  }

  if (!proposal.description || proposal.description.length < 20 || proposal.description.length > 5000) {
    errors.push({ field: 'description', message: 'Description must be between 20 and 5000 characters' });
  }

  if (!proposal.proposer || !isValidAddress(proposal.proposer)) {
    errors.push({ field: 'proposer', message: 'Invalid proposer address' });
  }

  if (proposal.votingPeriod) {
    if (proposal.votingPeriod < GOVERNANCE.MIN_VOTING_PERIOD) {
      errors.push({
        field: 'votingPeriod',
        message: `Voting period must be at least ${GOVERNANCE.MIN_VOTING_PERIOD / 86400000} days`
      });
    }
    if (proposal.votingPeriod > GOVERNANCE.MAX_VOTING_PERIOD) {
      errors.push({
        field: 'votingPeriod',
        message: `Voting period cannot exceed ${GOVERNANCE.MAX_VOTING_PERIOD / 86400000} days`
      });
    }
  }

  if (proposal.quorum && (proposal.quorum < 0 || proposal.quorum > 1)) {
    errors.push({ field: 'quorum', message: 'Quorum must be between 0 and 1' });
  }

  if (proposal.passingThreshold && (proposal.passingThreshold < 0 || proposal.passingThreshold > 1)) {
    errors.push({ field: 'passingThreshold', message: 'Passing threshold must be between 0 and 1' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate trading order
 */
exports.validateOrder = (order) => {
  const errors = [];

  if (!order.user || !isValidAddress(order.user)) {
    errors.push({ field: 'user', message: 'Invalid user address' });
  }

  if (!order.pair || order.pair.length === 0) {
    errors.push({ field: 'pair', message: 'Trading pair is required' });
  }

  if (!['buy', 'sell'].includes(order.side)) {
    errors.push({ field: 'side', message: 'Order side must be "buy" or "sell"' });
  }

  if (!['limit', 'market', 'stop-loss', 'take-profit'].includes(order.type)) {
    errors.push({ field: 'type', message: 'Invalid order type' });
  }

  if (typeof order.amount !== 'number' || order.amount < TRADING.MIN_ORDER_SIZE) {
    errors.push({
      field: 'amount',
      message: `Amount must be at least ${TRADING.MIN_ORDER_SIZE} STRAT`
    });
  }

  if (order.amount > TRADING.MAX_ORDER_SIZE) {
    errors.push({
      field: 'amount',
      message: `Amount cannot exceed ${TRADING.MAX_ORDER_SIZE} STRAT`
    });
  }

  if (order.type !== 'market' && (!order.price || order.price <= 0)) {
    errors.push({ field: 'price', message: 'Price is required for non-market orders' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate liquidity pool
 */
exports.validateLiquidityPool = (pool) => {
  const errors = [];

  if (!pool.tokenA || pool.tokenA.length === 0) {
    errors.push({ field: 'tokenA', message: 'Token A is required' });
  }

  if (!pool.tokenB || pool.tokenB.length === 0) {
    errors.push({ field: 'tokenB', message: 'Token B is required' });
  }

  if (pool.tokenA === pool.tokenB) {
    errors.push({ field: 'tokenA', message: 'Token A and Token B must be different' });
  }

  if (typeof pool.reserveA !== 'number' || pool.reserveA < DEFI.MIN_LIQUIDITY) {
    errors.push({
      field: 'reserveA',
      message: `Reserve A must be at least ${DEFI.MIN_LIQUIDITY}`
    });
  }

  if (typeof pool.reserveB !== 'number' || pool.reserveB < DEFI.MIN_LIQUIDITY) {
    errors.push({
      field: 'reserveB',
      message: `Reserve B must be at least ${DEFI.MIN_LIQUIDITY}`
    });
  }

  if (pool.fee && (pool.fee < DEFI.MIN_FEE || pool.fee > DEFI.MAX_FEE)) {
    errors.push({
      field: 'fee',
      message: `Fee must be between ${DEFI.MIN_FEE}% and ${DEFI.MAX_FEE}%`
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate social post
 */
exports.validatePost = (post) => {
  const errors = [];

  if (!post.author || !isValidAddress(post.author)) {
    errors.push({ field: 'author', message: 'Invalid author address' });
  }

  if (!post.content || post.content.length === 0) {
    errors.push({ field: 'content', message: 'Post content is required' });
  }

  if (post.content && post.content.length > SOCIAL.MAX_POST_LENGTH) {
    errors.push({
      field: 'content',
      message: `Post content cannot exceed ${SOCIAL.MAX_POST_LENGTH} characters`
    });
  }

  if (post.images && post.images.length > SOCIAL.MAX_IMAGES_PER_POST) {
    errors.push({
      field: 'images',
      message: `Cannot attach more than ${SOCIAL.MAX_IMAGES_PER_POST} images`
    });
  }

  if (post.visibility && !['public', 'followers', 'private'].includes(post.visibility)) {
    errors.push({ field: 'visibility', message: 'Invalid visibility setting' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate staking data
 */
exports.validateStake = (stake) => {
  const errors = [];

  if (!stake.address || !isValidAddress(stake.address)) {
    errors.push({ field: 'address', message: 'Invalid staker address' });
  }

  if (typeof stake.amount !== 'number' || stake.amount < 1) {
    errors.push({ field: 'amount', message: 'Stake amount must be at least 1 STRAT' });
  }

  if (stake.lockPeriod && stake.lockPeriod < 0) {
    errors.push({ field: 'lockPeriod', message: 'Lock period cannot be negative' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate smart contract deployment
 */
exports.validateContractDeployment = (contract) => {
  const errors = [];

  if (!contract.deployer || !isValidAddress(contract.deployer)) {
    errors.push({ field: 'deployer', message: 'Invalid deployer address' });
  }

  if (!contract.bytecode || contract.bytecode.length === 0) {
    errors.push({ field: 'bytecode', message: 'Contract bytecode is required' });
  }

  if (!contract.abi || !Array.isArray(contract.abi)) {
    errors.push({ field: 'abi', message: 'Contract ABI is required and must be an array' });
  }

  if (contract.name && contract.name.length > 100) {
    errors.push({ field: 'name', message: 'Contract name cannot exceed 100 characters' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate pagination parameters
 */
exports.validatePagination = (page, limit) => {
  const errors = [];

  if (page && (typeof page !== 'number' || page < 1)) {
    errors.push({ field: 'page', message: 'Page must be a positive number' });
  }

  if (limit && (typeof limit !== 'number' || limit < 1 || limit > 100)) {
    errors.push({ field: 'limit', message: 'Limit must be between 1 and 100' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate password strength
 */
exports.validatePassword = (password) => {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  }

  if (!/[a-z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
  }

  if (!/[A-Z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
  }

  if (!/[0-9]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one number' });
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one special character (!@#$%^&*)' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate username
 */
exports.validateUsername = (username) => {
  const errors = [];

  if (!username || username.length < 3 || username.length > 50) {
    errors.push({ field: 'username', message: 'Username must be between 3 and 50 characters' });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push({ field: 'username', message: 'Username can only contain letters, numbers, underscores, and hyphens' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize and validate input
 */
exports.sanitizeInput = (input, maxLength = 1000) => {
  if (typeof input !== 'string') return '';

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Truncate to max length
  sanitized = sanitized.slice(0, maxLength);

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
};

/**
 * Validate and format date range
 */
exports.validateDateRange = (startDate, endDate) => {
  const errors = [];
  const now = Date.now();

  if (!startDate || isNaN(new Date(startDate).getTime())) {
    errors.push({ field: 'startDate', message: 'Invalid start date' });
  }

  if (!endDate || isNaN(new Date(endDate).getTime())) {
    errors.push({ field: 'endDate', message: 'Invalid end date' });
  }

  if (new Date(startDate) > new Date(endDate)) {
    errors.push({ field: 'dateRange', message: 'Start date must be before end date' });
  }

  if (new Date(endDate) > now) {
    errors.push({ field: 'endDate', message: 'End date cannot be in the future' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

exports.ValidationError = ValidationError;
