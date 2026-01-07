const Blockchain = require('../../../src/blockchain');
const { Transaction, UTXO } = require('../../../src/transaction');
const CryptoUtils = require('../../../src/crypto');

describe('Transaction Throughput Tests', () => {
  let blockchain;

  beforeEach(() => {
    blockchain = new Blockchain();
  });

  describe('Sequential Transaction Processing', () => {
    test('should measure sequential throughput', () => {
      const txCount = 1000;
      const transactions = [];

      // Create transactions
      for (let i = 0; i < txCount; i++) {
        const keyPair = CryptoUtils.generateKeyPair();
        transactions.push({
          hash: `tx-${i}`,
          from: CryptoUtils.getAddressFromPublicKey(keyPair.publicKey),
          to: 'recipient',
          amount: 1,
          fee: 0.01,
          isValid: jest.fn().mockReturnValue(true)
        });
      }

      const startTime = Date.now();

      transactions.forEach(tx => {
        blockchain.mempool.addTransaction(tx);
      });

      const duration = Date.now() - startTime;
      const tps = (txCount / duration) * 1000;

      console.log(`Sequential TPS: ${tps.toFixed(2)}`);
      console.log(`Total time: ${duration}ms for ${txCount} transactions`);

      expect(tps).toBeGreaterThan(100);
    });
  });

  describe('Parallel Transaction Processing', () => {
    test('should measure parallel throughput', async () => {
      const txCount = 1000;
      const batches = 10;
      const batchSize = txCount / batches;

      const startTime = Date.now();

      const batchPromises = [];
      for (let b = 0; b < batches; b++) {
        const batchTxs = [];
        for (let i = 0; i < batchSize; i++) {
          batchTxs.push({
            hash: `tx-${b}-${i}`,
            fee: 0.01,
            size: 250,
            isValid: jest.fn().mockReturnValue(true)
          });
        }

        batchPromises.push(
          Promise.all(
            batchTxs.map(tx => Promise.resolve(blockchain.mempool.addTransaction(tx)))
          )
        );
      }

      await Promise.all(batchPromises);

      const duration = Date.now() - startTime;
      const tps = (txCount / duration) * 1000;

      console.log(`Parallel TPS: ${tps.toFixed(2)}`);
      console.log(`Total time: ${duration}ms for ${txCount} transactions`);

      expect(tps).toBeGreaterThan(100);
    });
  });

  describe('Block Production Rate', () => {
    test('should measure blocks per second', () => {
      const blockCount = 50;
      const startTime = Date.now();

      for (let i = 0; i < blockCount; i++) {
        // Add some transactions
        for (let j = 0; j < 10; j++) {
          blockchain.mempool.addTransaction({
            hash: `tx-${i}-${j}`,
            fee: 0.01,
            size: 250
          });
        }

        blockchain.minePendingTransactions('miner');
      }

      const duration = Date.now() - startTime;
      const bps = (blockCount / duration) * 1000;
      const avgBlockTime = duration / blockCount;

      console.log(`Blocks per second: ${bps.toFixed(4)}`);
      console.log(`Average block time: ${avgBlockTime.toFixed(2)}ms`);

      expect(blockchain.chain.length).toBe(blockCount + 1); // +1 for genesis
    });
  });

  describe('Transaction Validation Throughput', () => {
    test('should measure validation speed', () => {
      const txCount = 5000;
      const transactions = [];

      // Create signed transactions
      for (let i = 0; i < txCount; i++) {
        const keyPair = CryptoUtils.generateKeyPair();
        const address = CryptoUtils.getAddressFromPublicKey(keyPair.publicKey);

        const tx = new Transaction(
          [new UTXO(address, 100, 0)],
          [new UTXO('recipient', 90, 0)]
        );
        tx.sign(keyPair.privateKey);
        transactions.push(tx);
      }

      const startTime = Date.now();

      const validCount = transactions.filter(tx => tx.isValid()).length;

      const duration = Date.now() - startTime;
      const validationsPerSecond = (txCount / duration) * 1000;

      console.log(`Validation throughput: ${validationsPerSecond.toFixed(2)} tx/s`);
      console.log(`Valid transactions: ${validCount}/${txCount}`);

      expect(validationsPerSecond).toBeGreaterThan(500);
    });
  });

  describe('Mempool Throughput', () => {
    test('should handle high mempool insertion rate', () => {
      const insertCount = 10000;
      const startTime = Date.now();

      for (let i = 0; i < insertCount; i++) {
        blockchain.mempool.addTransaction({
          hash: `tx-${i}`,
          fee: Math.random() * 0.1,
          size: 250
        });
      }

      const duration = Date.now() - startTime;
      const insertionsPerSecond = (insertCount / duration) * 1000;

      console.log(`Mempool insertion rate: ${insertionsPerSecond.toFixed(2)} tx/s`);
      expect(insertionsPerSecond).toBeGreaterThan(1000);
    });

    test('should handle high mempool retrieval rate', () => {
      // Fill mempool
      for (let i = 0; i < 5000; i++) {
        blockchain.mempool.addTransaction({
          hash: `tx-${i}`,
          fee: Math.random(),
          size: 250
        });
      }

      const retrievalCount = 1000;
      const startTime = Date.now();

      for (let i = 0; i < retrievalCount; i++) {
        blockchain.mempool.getTransactionsForMining(100, 1000000);
      }

      const duration = Date.now() - startTime;
      const retrievalsPerSecond = (retrievalCount / duration) * 1000;

      console.log(`Mempool retrieval rate: ${retrievalsPerSecond.toFixed(2)} ops/s`);
      expect(retrievalsPerSecond).toBeGreaterThan(100);
    });
  });

  describe('UTXO Lookup Throughput', () => {
    test('should measure UTXO lookup speed', () => {
      // Populate UTXO set
      for (let i = 0; i < 10000; i++) {
        blockchain.utxos.set(`utxo-${i}`, {
          txHash: `tx-${i}`,
          outputIndex: 0,
          address: `addr-${i % 100}`,
          amount: 100
        });
      }

      const lookupCount = 10000;
      const startTime = Date.now();

      for (let i = 0; i < lookupCount; i++) {
        const address = `addr-${i % 100}`;
        blockchain.getBalance(address);
      }

      const duration = Date.now() - startTime;
      const lookupsPerSecond = (lookupCount / duration) * 1000;

      console.log(`UTXO lookup rate: ${lookupsPerSecond.toFixed(2)} lookups/s`);
      expect(lookupsPerSecond).toBeGreaterThan(1000);
    });
  });

  describe('End-to-End Throughput', () => {
    test('should measure complete transaction lifecycle', () => {
      const cycleCount = 100;
      const startTime = Date.now();

      for (let i = 0; i < cycleCount; i++) {
        // Create transaction
        const keyPair = CryptoUtils.generateKeyPair();
        const tx = {
          hash: `tx-${i}`,
          from: CryptoUtils.getAddressFromPublicKey(keyPair.publicKey),
          to: 'recipient',
          amount: 10,
          fee: 0.1,
          isValid: jest.fn().mockReturnValue(true)
        };

        // Add to mempool
        blockchain.mempool.addTransaction(tx);

        // Mine every 10 transactions
        if ((i + 1) % 10 === 0) {
          blockchain.minePendingTransactions('miner');
        }
      }

      const duration = Date.now() - startTime;
      const cyclesPerSecond = (cycleCount / duration) * 1000;

      console.log(`E2E throughput: ${cyclesPerSecond.toFixed(2)} cycles/s`);
      console.log(`Total blocks mined: ${blockchain.chain.length - 1}`);

      expect(cyclesPerSecond).toBeGreaterThan(10);
    });
  });

  describe('Sustained Load Throughput', () => {
    test('should maintain throughput under sustained load', async () => {
      const testDuration = 3000; // 3 seconds
      const startTime = Date.now();
      let txCount = 0;

      while (Date.now() - startTime < testDuration) {
        blockchain.mempool.addTransaction({
          hash: `tx-${txCount}`,
          fee: 0.01,
          size: 250
        });
        txCount++;

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const actualDuration = Date.now() - startTime;
      const avgTps = (txCount / actualDuration) * 1000;

      console.log(`Sustained throughput: ${avgTps.toFixed(2)} tx/s over ${actualDuration}ms`);
      console.log(`Total transactions: ${txCount}`);

      expect(avgTps).toBeGreaterThan(50);
    });
  });
});
