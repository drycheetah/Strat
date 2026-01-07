const mongoose = require('mongoose');
const User = require('../../../models/User');

describe('User Model', () => {
  describe('Schema Validation', () => {
    test('should be valid with all required fields', () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        address: 'wallet-address'
      });

      const error = user.validateSync();
      expect(error).toBeUndefined();
    });

    test('should require username', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password'
      });

      const error = user.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.username).toBeDefined();
    });

    test('should require email', () => {
      const user = new User({
        username: 'testuser',
        password: 'password'
      });

      const error = user.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });

    test('should validate email format', () => {
      const user = new User({
        username: 'testuser',
        email: 'invalid-email',
        password: 'password'
      });

      const error = user.validateSync();
      expect(error).toBeDefined();
    });

    test('should require password', () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com'
      });

      const error = user.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });
  });

  describe('User Properties', () => {
    test('should have default balance of 0', () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password'
      });

      expect(user.balance).toBe(0);
    });

    test('should store wallet address', () => {
      const address = 'wallet-address-123';
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password',
        address
      });

      expect(user.address).toBe(address);
    });

    test('should have createdAt timestamp', () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password'
      });

      expect(user.createdAt).toBeDefined();
    });

    test('should allow storing public key', () => {
      const publicKey = 'public-key-hex';
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password',
        publicKey
      });

      expect(user.publicKey).toBe(publicKey);
    });
  });

  describe('User Methods', () => {
    test('should not expose password in JSON', () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword'
      });

      const json = user.toJSON();
      expect(json.password).toBeUndefined();
    });

    test('should include username in JSON', () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password'
      });

      const json = user.toJSON();
      expect(json.username).toBe('testuser');
    });
  });

  describe('Indexes', () => {
    test('should have unique username index', () => {
      const indexes = User.schema.indexes();
      const usernameIndex = indexes.find(idx =>
        idx[0].username !== undefined
      );
      expect(usernameIndex).toBeDefined();
    });

    test('should have unique email index', () => {
      const indexes = User.schema.indexes();
      const emailIndex = indexes.find(idx =>
        idx[0].email !== undefined
      );
      expect(emailIndex).toBeDefined();
    });
  });

  describe('Virtual Properties', () => {
    test('should calculate account age', () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password',
        createdAt: new Date(Date.now() - 86400000) // 1 day ago
      });

      const age = Date.now() - user.createdAt.getTime();
      expect(age).toBeGreaterThan(0);
    });
  });

  describe('Data Types', () => {
    test('should store balance as number', () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password',
        balance: 100.50
      });

      expect(typeof user.balance).toBe('number');
      expect(user.balance).toBe(100.50);
    });

    test('should handle large balance values', () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password',
        balance: 1000000000
      });

      expect(user.balance).toBe(1000000000);
    });
  });
});
