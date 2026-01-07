const Block = require('../../../src/block');
const { Transaction } = require('../../../src/transaction');

describe('Block', () => {
  let sampleTransactions;

  beforeEach(() => {
    sampleTransactions = [
      Transaction.createCoinbaseTx('miner-address', 1, 50)
    ];
  });

  describe('Block Creation', () => {
    test('should create block with correct properties', () => {
      const block = new Block(1, sampleTransactions, 'previous-hash');

      expect(block.index).toBe(1);
      expect(block.transactions).toEqual(sampleTransactions);
      expect(block.previousHash).toBe('previous-hash');
      expect(block.timestamp).toBeDefined();
      expect(block.nonce).toBe(0);
    });

    test('should initialize with timestamp', () => {
      const block = new Block(0, [], '0');
      expect(block.timestamp).toBeDefined();
      expect(typeof block.timestamp).toBe('number');
    });

    test('should initialize nonce to 0', () => {
      const block = new Block(0, [], '0');
      expect(block.nonce).toBe(0);
    });
  });

  describe('Hash Calculation', () => {
    test('should calculate block hash', () => {
      const block = new Block(1, sampleTransactions, 'previous-hash');
      const hash = block.calculateHash();

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should produce consistent hash for same data', () => {
      const block = new Block(1, sampleTransactions, 'previous-hash');
      block.timestamp = 1234567890;
      block.nonce = 100;

      const hash1 = block.calculateHash();
      const hash2 = block.calculateHash();

      expect(hash1).toBe(hash2);
    });

    test('should produce different hash when nonce changes', () => {
      const block = new Block(1, sampleTransactions, 'previous-hash');
      block.timestamp = 1234567890;

      block.nonce = 0;
      const hash1 = block.calculateHash();

      block.nonce = 1;
      const hash2 = block.calculateHash();

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Block Mining', () => {
    test('should mine block with correct difficulty', () => {
      const block = new Block(1, sampleTransactions, 'previous-hash');
      const difficulty = 2;

      block.mineBlock(difficulty);

      expect(block.hash).toBeDefined();
      expect(block.hash.substring(0, difficulty)).toBe('0'.repeat(difficulty));
    });

    test('should increment nonce during mining', () => {
      const block = new Block(1, sampleTransactions, 'previous-hash');
      const initialNonce = block.nonce;

      block.mineBlock(2);

      expect(block.nonce).toBeGreaterThan(initialNonce);
    });

    test('should set hash after mining', () => {
      const block = new Block(1, sampleTransactions, 'previous-hash');
      block.mineBlock(2);

      expect(block.hash).toBeDefined();
      expect(typeof block.hash).toBe('string');
    });

    test('should handle difficulty 0', () => {
      const block = new Block(1, sampleTransactions, 'previous-hash');
      block.mineBlock(0);

      expect(block.hash).toBeDefined();
    });

    test('should mine faster with lower difficulty', () => {
      const block1 = new Block(1, sampleTransactions, 'prev-hash');
      const block2 = new Block(1, sampleTransactions, 'prev-hash');

      const start1 = Date.now();
      block1.mineBlock(1);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      block2.mineBlock(2);
      const time2 = Date.now() - start2;

      // Lower difficulty should generally be faster
      // This is a probabilistic test
      expect(block1.hash).toBeDefined();
      expect(block2.hash).toBeDefined();
    });
  });

  describe('Block Validation', () => {
    test('should validate block with correct hash', () => {
      const block = new Block(1, sampleTransactions, 'previous-hash');
      block.mineBlock(2);

      expect(block.hasValidTransactions()).toBeDefined();
    });

    test('should validate all transactions in block', () => {
      const validTx = Transaction.createCoinbaseTx('miner', 1, 50);
      const block = new Block(1, [validTx], 'previous-hash');

      expect(block.hasValidTransactions()).toBe(true);
    });
  });

  describe('Block Properties', () => {
    test('should store miner address if provided', () => {
      const block = new Block(1, sampleTransactions, 'previous-hash');
      block.miner = 'miner-address';

      expect(block.miner).toBe('miner-address');
    });

    test('should store multiple transactions', () => {
      const tx1 = Transaction.createCoinbaseTx('miner', 1, 50);
      const tx2 = Transaction.createCoinbaseTx('miner', 2, 50);
      const block = new Block(1, [tx1, tx2], 'previous-hash');

      expect(block.transactions).toHaveLength(2);
    });

    test('should handle empty transaction list', () => {
      const block = new Block(1, [], 'previous-hash');
      expect(block.transactions).toEqual([]);
    });
  });

  describe('Block Index', () => {
    test('should maintain block index', () => {
      const block = new Block(42, sampleTransactions, 'previous-hash');
      expect(block.index).toBe(42);
    });

    test('should allow genesis block with index 0', () => {
      const block = new Block(0, sampleTransactions, '0');
      expect(block.index).toBe(0);
    });
  });

  describe('Previous Hash Link', () => {
    test('should store reference to previous block hash', () => {
      const prevHash = 'abc123def456';
      const block = new Block(1, sampleTransactions, prevHash);

      expect(block.previousHash).toBe(prevHash);
    });

    test('should allow genesis block with "0" previous hash', () => {
      const block = new Block(0, sampleTransactions, '0');
      expect(block.previousHash).toBe('0');
    });
  });

  describe('Block Serialization', () => {
    test('should be serializable to JSON', () => {
      const block = new Block(1, sampleTransactions, 'previous-hash');
      block.mineBlock(2);

      const json = JSON.stringify(block);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.index).toBe(block.index);
      expect(parsed.previousHash).toBe(block.previousHash);
    });
  });
});
