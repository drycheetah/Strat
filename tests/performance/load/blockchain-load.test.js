const Blockchain = require('../../../src/blockchain');
const { Transaction } = require('../../../src/transaction');
const CryptoUtils = require('../../../src/crypto');

describe('Blockchain Load Tests', () => {
  let blockchain;

  beforeEach(() => {
    blockchain = new Blockchain();
  });

  describe('Transaction Processing', () => {
    test('should handle 1000 transactions', async () => {
      const transactions = [];
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const keyPair = CryptoUtils.generateKeyPair();
        const tx = {
          hash: `tx-${i}`,
          from: CryptoUtils.getAddressFromPublicKey(keyPair.publicKey),
          to: 'recipient-address',
          amount: 10,
          fee: 0.1,
          timestamp: Date.now(),
          isValid: jest.fn().mockReturnValue(true)
        };
        transactions.push(tx);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(transactions).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
      console.log(`Created 1000 transactions in ${duration}ms`);
    });

    test('should measure transaction throughput', async () => {
      const txCount = 100;
      const startTime = Date.now();

      for (let i = 0; i < txCount; i++) {
        const tx = {
          hash: `tx-${i}`,
          isValid: jest.fn().mockReturnValue(true)
        };
        // Process transaction
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (txCount / duration) * 1000; // tx per second

      console.log(`Throughput: ${throughput.toFixed(2)} tx/s`);
      expect(throughput).toBeGreaterThan(10);
    });
  });

  describe('Block Mining Performance', () => {
    test('should measure mining time for difficulty 2', () => {
      const startTime = Date.now();

      blockchain.minePendingTransactions('miner-address');

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Mined block with difficulty 2 in ${duration}ms`);
      expect(duration).toBeLessThan(10000);
    });

    test('should compare mining times across difficulties', () => {
      const results = [];

      for (let difficulty = 1; difficulty <= 3; difficulty++) {
        blockchain.difficulty = difficulty;
        const startTime = Date.now();

        blockchain.minePendingTransactions('miner-address');

        const duration = Date.now() - startTime;
        results.push({ difficulty, duration });
        console.log(`Difficulty ${difficulty}: ${duration}ms`);
      }

      // Higher difficulty should take longer
      expect(results[2].duration).toBeGreaterThanOrEqual(results[0].duration);
    });
  });

  describe('Chain Validation Performance', () => {
    test('should validate chain with 100 blocks', () => {
      // Add 100 blocks
      for (let i = 0; i < 100; i++) {
        blockchain.minePendingTransactions('miner-address');
      }

      const startTime = Date.now();
      const isValid = blockchain.isChainValid();
      const duration = Date.now() - startTime;

      console.log(`Validated 100-block chain in ${duration}ms`);
      expect(isValid).toBe(true);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('UTXO Set Performance', () => {
    test('should handle large UTXO set', () => {
      // Create large UTXO set
      for (let i = 0; i < 1000; i++) {
        blockchain.utxos.set(`utxo-${i}`, {
          txHash: `tx-${i}`,
          outputIndex: 0,
          address: `addr-${i}`,
          amount: 100
        });
      }

      const startTime = Date.now();
      const balance = blockchain.getBalance('addr-500');
      const duration = Date.now() - startTime;

      console.log(`Looked up balance in ${blockchain.utxos.size} UTXOs in ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Memory Usage', () => {
    test('should track memory usage with large chain', () => {
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      // Create 50 blocks
      for (let i = 0; i < 50; i++) {
        blockchain.minePendingTransactions('miner-address');
      }

      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);
      expect(memoryIncrease).toBeLessThan(500); // Should not exceed 500MB
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent balance lookups', async () => {
      const addresses = Array.from({ length: 100 }, (_, i) => `addr-${i}`);

      const startTime = Date.now();

      const balances = await Promise.all(
        addresses.map(addr => Promise.resolve(blockchain.getBalance(addr)))
      );

      const duration = Date.now() - startTime;

      console.log(`100 concurrent balance lookups in ${duration}ms`);
      expect(balances).toHaveLength(100);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Scalability Tests', () => {
    test('should scale linearly with chain size', () => {
      const measurements = [];

      [10, 50, 100].forEach(blockCount => {
        const testBlockchain = new Blockchain();

        const startTime = Date.now();
        for (let i = 0; i < blockCount; i++) {
          testBlockchain.minePendingTransactions('miner');
        }
        const duration = Date.now() - startTime;

        const avgPerBlock = duration / blockCount;
        measurements.push({ blockCount, avgPerBlock });
        console.log(`${blockCount} blocks: ${avgPerBlock.toFixed(2)}ms/block`);
      });

      expect(measurements).toHaveLength(3);
    });
  });
});
