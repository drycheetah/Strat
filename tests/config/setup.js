// Global test setup
const mongoose = require('mongoose');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.PORT = '3001';

// Increase timeout for slower operations
jest.setTimeout(30000);

// Global beforeAll hook
beforeAll(async () => {
  // Setup can be extended as needed
});

// Global afterAll hook
afterAll(async () => {
  // Close mongoose connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

// Global beforeEach hook
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Global afterEach hook
afterEach(() => {
  // Cleanup after each test
});
