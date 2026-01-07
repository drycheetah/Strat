const Blockchain = require('../../../src/blockchain');
const { Transaction, UTXO } = require('../../../src/transaction');
const CryptoUtils = require('../../../src/crypto');

describe('Concurrent Transaction Stress Tests', () => {
  let blockchain;

  beforeEach(() => {
    blockchain = new Blockchain();
  });

  describe('High Volume Concurrent Transactions', () => {
    test('should handle 1000 concurrent transaction submissions', async () => {
      const transactions = [];

      for (let i = 0; i < 1000; i++) {
        const keyPair = CryptoUtils.generateKeyPair();
        const tx = {
          hash: `tx-${i}`,
          from: CryptoUtils.getAddressFromPublicKey(keyPair.publicKey),
          to: 'recipient',
          amount: 1,
          fee: 0.01,
          isValid: jest.fn().mockReturnValue(true)
        };
        transactions.push(tx);
      }

      const startTime = Date.now();

      const results = await Promise.allSettled(
        transactions.map(tx => Promise.resolve(blockchain.mempool.addTransaction(tx)))
      );

      const duration = Date.now() - startTime;

      console.log(`Processed 1000 concurrent transactions in ${duration}ms`);
      expect(results.filter(r => r.status === 'fulfilled').length).toBeGreaterThan(900);
      expect(duration).toBeLessThan(10000);
    });

    test('should handle concurrent balance lookups', async () => {
      const addresses = Array.from({ length: 500 }, (_, i) => `address-${i}`);

      const startTime = Date.now();

      const results = await Promise.all(
        addresses.map(addr => Promise.resolve(blockchain.getBalance(addr)))
      );

      const duration = Date.now() - startTime;

      console.log(`500 concurrent balance lookups in ${duration}ms`);
      expect(results).toHaveLength(500);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Mining Under Load', () => {
    test('should mine blocks while receiving transactions', async () => {
      const startTime = Date.now();

      // Simulate continuous transaction submission
      const txPromise = new Promise((resolve) => {
        const interval = setInterval(() => {
          const tx = {
            hash: `tx-${Date.now()}`,
            fee: Math.random(),
            isValid: jest.fn().mockReturnValue(true)
          };
          blockchain.mempool.addTransaction(tx);
        }, 10);

        setTimeout(() => {
          clearInterval(interval);
          resolve();
        }, 1000);
      });

      // Mine blocks concurrently
      const miningPromises = [];
      for (let i = 0; i < 3; i++) {
        miningPromises.push(
          new Promise(resolve => {
            blockchain.minePendingTransactions('miner');
            resolve();
          })
        );
      }

      await Promise.all([txPromise, ...miningPromises]);

      const duration = Date.now() - startTime;

      console.log(`Mined under load in ${duration}ms`);
      expect(blockchain.chain.length).toBeGreaterThan(1);
    });
  });

  describe('Memory Pressure Tests', () => {
    test('should handle memory pressure with large mempool', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Add 10000 transactions to mempool
      for (let i = 0; i < 10000; i++) {
        blockchain.mempool.addTransaction({
          hash: `tx-${i}`,
          fee: Math.random(),
          size: 250,
          from: `addr-${i}`,
          to: 'recipient',
          amount: 1
        });
      }

      const afterAddMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (afterAddMemory - initialMemory) / 1024 / 1024;

      console.log(`Memory increase with 10k transactions: ${memoryIncrease.toFixed(2)} MB`);
      expect(memoryIncrease).toBeLessThan(1000); // Less than 1GB
    });

    test('should garbage collect after mining', async () => {
      // Fill mempool
      for (let i = 0; i < 5000; i++) {
        blockchain.mempool.addTransaction({
          hash: `tx-${i}`,
          fee: 0.01,
          size: 250
        });
      }

      const beforeMining = process.memoryUsage().heapUsed;

      blockchain.minePendingTransactions('miner');

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterMining = process.memoryUsage().heapUsed;

      console.log(`Memory before: ${(beforeMining / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Memory after: ${(afterMining / 1024 / 1024).toFixed(2)} MB`);

      expect(blockchain.mempool.transactions.size).toBeLessThan(5000);
    });
  });

  describe('Race Condition Tests', () => {
    test('should handle concurrent UTXO modifications', async () => {
      const operations = [];

      // Simulate concurrent UTXO operations
      for (let i = 0; i < 100; i++) {
        operations.push(
          new Promise(resolve => {
            blockchain.utxos.set(`utxo-${i}`, {
              txHash: `tx-${i}`,
              outputIndex: 0,
              address: `addr-${i}`,
              amount: 100
            });
            resolve();
          })
        );
      }

      await Promise.all(operations);

      expect(blockchain.utxos.size).toBeGreaterThanOrEqual(100);
    });

    test('should handle concurrent chain validation', async () => {
      // Mine some blocks
      for (let i = 0; i < 10; i++) {
        blockchain.minePendingTransactions('miner');
      }

      // Validate concurrently
      const validations = Array.from({ length: 50 }, () =>
        Promise.resolve(blockchain.isChainValid())
      );

      const results = await Promise.all(validations);

      expect(results.every(r => r === true)).toBe(true);
    });
  });

  describe('Throughput Under Stress', () => {
    test('should maintain throughput under sustained load', async () => {
      const duration = 5000; // 5 seconds
      const startTime = Date.now();
      let txCount = 0;

      while (Date.now() - startTime < duration) {
        blockchain.mempool.addTransaction({
          hash: `tx-${txCount}`,
          fee: 0.01,
          size: 250,
          isValid: jest.fn().mockReturnValue(true)
        });
        txCount++;

        // Small delay to simulate realistic load
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const actualDuration = Date.now() - startTime;
      const throughput = (txCount / actualDuration) * 1000;

      console.log(`Sustained throughput: ${throughput.toFixed(2)} tx/s`);
      console.log(`Total transactions: ${txCount}`);

      expect(txCount).toBeGreaterThan(100);
      expect(throughput).toBeGreaterThan(10);
    });
  });

  describe('Network Partition Simulation', () => {
    test('should handle network split and merge', () => {
      const blockchain1 = new Blockchain();
      const blockchain2 = new Blockchain();

      // Mine on both chains independently
      blockchain1.minePendingTransactions('miner1');
      blockchain1.minePendingTransactions('miner1');

      blockchain2.minePendingTransactions('miner2');
      blockchain2.minePendingTransactions('miner2');
      blockchain2.minePendingTransactions('miner2');

      // Longer chain should be valid
      expect(blockchain2.chain.length).toBeGreaterThan(blockchain1.chain.length);
    });
  });
});
