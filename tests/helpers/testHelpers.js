const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

/**
 * Generate a test JWT token
 */
function generateTestToken(userId = 'test-user-id', address = 'test-address') {
  return jwt.sign(
    { userId, address },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );
}

/**
 * Create a mock request object
 */
function mockRequest(options = {}) {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user || null,
    ...options
  };
}

/**
 * Create a mock response object
 */
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Create a mock next function
 */
function mockNext() {
  return jest.fn();
}

/**
 * Generate a random Ethereum-style address
 */
function generateRandomAddress() {
  const chars = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

/**
 * Generate a random transaction hash
 */
function generateRandomHash() {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

/**
 * Wait for a specified time
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clean up database collections
 */
async function cleanupDatabase() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Create a mock blockchain
 */
function createMockBlockchain() {
  return {
    chain: [],
    pendingTransactions: [],
    difficulty: 2,
    miningReward: 50,
    addBlock: jest.fn(),
    getLastBlock: jest.fn(),
    isChainValid: jest.fn().mockReturnValue(true),
    getBalance: jest.fn().mockReturnValue(100)
  };
}

/**
 * Create a mock transaction
 */
function createMockTransaction(overrides = {}) {
  return {
    from: generateRandomAddress(),
    to: generateRandomAddress(),
    amount: 10,
    fee: 0.1,
    timestamp: Date.now(),
    signature: generateRandomHash(),
    hash: generateRandomHash(),
    ...overrides
  };
}

/**
 * Create a mock block
 */
function createMockBlock(overrides = {}) {
  return {
    index: 1,
    timestamp: Date.now(),
    transactions: [],
    previousHash: generateRandomHash(),
    hash: generateRandomHash(),
    nonce: 12345,
    miner: generateRandomAddress(),
    ...overrides
  };
}

/**
 * Create a mock user
 */
function createMockUser(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    username: 'testuser',
    email: 'test@example.com',
    address: generateRandomAddress(),
    balance: 100,
    createdAt: new Date(),
    ...overrides
  };
}

/**
 * Assert async function throws
 */
async function expectAsyncThrow(fn, errorMessage) {
  let error;
  try {
    await fn();
  } catch (e) {
    error = e;
  }
  expect(error).toBeDefined();
  if (errorMessage) {
    expect(error.message).toContain(errorMessage);
  }
}

module.exports = {
  generateTestToken,
  mockRequest,
  mockResponse,
  mockNext,
  generateRandomAddress,
  generateRandomHash,
  wait,
  cleanupDatabase,
  createMockBlockchain,
  createMockTransaction,
  createMockBlock,
  createMockUser,
  expectAsyncThrow
};
