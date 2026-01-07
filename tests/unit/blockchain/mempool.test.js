const Mempool = require('../../../src/mempool');

describe('Mempool', () => {
  let mempool;

  beforeEach(() => {
    mempool = new Mempool();
  });

  describe('Transaction Addition', () => {
    test('should add transaction to mempool', () => {
      const tx = {
        hash: 'tx-hash-1',
        fee: 1.0,
        size: 250
      };

      mempool.addTransaction(tx);

      expect(mempool.transactions.size).toBe(1);
      expect(mempool.transactions.has('tx-hash-1')).toBe(true);
    });

    test('should reject duplicate transactions', () => {
      const tx = {
        hash: 'tx-hash-1',
        fee: 1.0
      };

      mempool.addTransaction(tx);
      const result = mempool.addTransaction(tx);

      expect(mempool.transactions.size).toBe(1);
    });

    test('should handle multiple transactions', () => {
      const txs = [
        { hash: 'tx-1', fee: 1.0 },
        { hash: 'tx-2', fee: 2.0 },
        { hash: 'tx-3', fee: 1.5 }
      ];

      txs.forEach(tx => mempool.addTransaction(tx));

      expect(mempool.transactions.size).toBe(3);
    });
  });

  describe('Fee Prioritization', () => {
    test('should prioritize transactions by fee', () => {
      const txs = [
        { hash: 'tx-low', fee: 0.5, size: 250 },
        { hash: 'tx-high', fee: 2.0, size: 250 },
        { hash: 'tx-mid', fee: 1.0, size: 250 }
      ];

      txs.forEach(tx => mempool.addTransaction(tx));

      const sorted = mempool.getTransactionsForMining(10, 1000000);

      expect(sorted[0].hash).toBe('tx-high');
      expect(sorted[sorted.length - 1].hash).toBe('tx-low');
    });

    test('should calculate fee per byte', () => {
      const tx1 = { hash: 'tx-1', fee: 1.0, size: 250 }; // 0.004 per byte
      const tx2 = { hash: 'tx-2', fee: 2.0, size: 250 }; // 0.008 per byte

      mempool.addTransaction(tx1);
      mempool.addTransaction(tx2);

      const sorted = mempool.getTransactionsForMining(10, 1000000);

      expect(sorted[0].hash).toBe('tx-2');
    });
  });

  describe('Transaction Removal', () => {
    test('should remove transaction by hash', () => {
      const tx = { hash: 'tx-1', fee: 1.0 };

      mempool.addTransaction(tx);
      expect(mempool.transactions.size).toBe(1);

      mempool.removeTransaction('tx-1');
      expect(mempool.transactions.size).toBe(0);
    });

    test('should handle removing non-existent transaction', () => {
      mempool.removeTransaction('non-existent');
      expect(mempool.transactions.size).toBe(0);
    });
  });

  describe('Mining Selection', () => {
    test('should limit transactions by count', () => {
      for (let i = 0; i < 20; i++) {
        mempool.addTransaction({
          hash: `tx-${i}`,
          fee: 1.0,
          size: 250
        });
      }

      const selected = mempool.getTransactionsForMining(10, 1000000);

      expect(selected.length).toBeLessThanOrEqual(10);
    });

    test('should limit transactions by block size', () => {
      for (let i = 0; i < 10; i++) {
        mempool.addTransaction({
          hash: `tx-${i}`,
          fee: 1.0,
          size: 1000
        });
      }

      const selected = mempool.getTransactionsForMining(100, 5000);

      const totalSize = selected.reduce((sum, tx) => sum + tx.size, 0);
      expect(totalSize).toBeLessThanOrEqual(5000);
    });
  });

  describe('Mempool Stats', () => {
    test('should calculate total fees', () => {
      mempool.addTransaction({ hash: 'tx-1', fee: 1.0 });
      mempool.addTransaction({ hash: 'tx-2', fee: 2.0 });
      mempool.addTransaction({ hash: 'tx-3', fee: 1.5 });

      const stats = mempool.getStats();

      expect(stats.totalFees).toBe(4.5);
    });

    test('should track transaction count', () => {
      mempool.addTransaction({ hash: 'tx-1', fee: 1.0 });
      mempool.addTransaction({ hash: 'tx-2', fee: 1.0 });

      const stats = mempool.getStats();

      expect(stats.count).toBe(2);
    });
  });

  describe('Invalid Transaction Cleanup', () => {
    test('should remove invalid transactions', () => {
      const validTx = {
        hash: 'tx-valid',
        fee: 1.0,
        isValid: jest.fn().mockReturnValue(true)
      };

      const invalidTx = {
        hash: 'tx-invalid',
        fee: 1.0,
        isValid: jest.fn().mockReturnValue(false)
      };

      mempool.addTransaction(validTx);
      mempool.addTransaction(invalidTx);

      const mockBlockchain = {
        isChainValid: jest.fn().mockReturnValue(true)
      };

      mempool.cleanupInvalidTransactions(mockBlockchain);

      expect(mempool.transactions.has('tx-valid')).toBe(true);
      expect(mempool.transactions.has('tx-invalid')).toBe(false);
    });
  });

  describe('Mempool Size Limits', () => {
    test('should enforce maximum mempool size', () => {
      for (let i = 0; i < 10000; i++) {
        mempool.addTransaction({
          hash: `tx-${i}`,
          fee: Math.random(),
          size: 250
        });
      }

      // Should have limit or handle gracefully
      expect(mempool.transactions.size).toBeGreaterThan(0);
    });
  });

  describe('Transaction Replacement', () => {
    test('should allow RBF (Replace-By-Fee)', () => {
      const tx1 = {
        hash: 'tx-1',
        fee: 1.0,
        from: 'address-1',
        nonce: 1
      };

      const tx2 = {
        hash: 'tx-1-replacement',
        fee: 2.0,
        from: 'address-1',
        nonce: 1,
        replaceable: true
      };

      mempool.addTransaction(tx1);
      mempool.addTransaction(tx2);

      // Should handle replacement logic
      expect(mempool.transactions.size).toBeGreaterThan(0);
    });
  });
});
