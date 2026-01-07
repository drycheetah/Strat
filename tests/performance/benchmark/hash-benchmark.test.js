const CryptoUtils = require('../../../src/crypto');

describe('Cryptographic Hash Benchmarks', () => {
  describe('Hash Performance', () => {
    test('should benchmark hash generation speed', () => {
      const iterations = 10000;
      const data = 'test data for hashing';

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        CryptoUtils.hash(data + i);
      }

      const duration = Date.now() - startTime;
      const hashesPerSecond = (iterations / duration) * 1000;

      console.log(`Hash performance: ${hashesPerSecond.toFixed(2)} hashes/sec`);
      console.log(`Average time per hash: ${(duration / iterations).toFixed(3)}ms`);

      expect(hashesPerSecond).toBeGreaterThan(1000);
    });

    test('should benchmark hash with different data sizes', () => {
      const sizes = [100, 1000, 10000, 100000];
      const results = [];

      sizes.forEach(size => {
        const data = 'a'.repeat(size);
        const iterations = 1000;

        const startTime = Date.now();

        for (let i = 0; i < iterations; i++) {
          CryptoUtils.hash(data);
        }

        const duration = Date.now() - startTime;
        const avgTime = duration / iterations;

        results.push({ size, avgTime });
        console.log(`${size} bytes: ${avgTime.toFixed(3)}ms per hash`);
      });

      expect(results).toHaveLength(4);
    });
  });

  describe('Signature Generation Benchmark', () => {
    test('should benchmark signature generation', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      const iterations = 1000;
      const data = 'data to sign';

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        CryptoUtils.sign(data, keyPair.privateKey);
      }

      const duration = Date.now() - startTime;
      const signaturesPerSecond = (iterations / duration) * 1000;

      console.log(`Signature performance: ${signaturesPerSecond.toFixed(2)} sigs/sec`);
      console.log(`Average time per signature: ${(duration / iterations).toFixed(3)}ms`);

      expect(signaturesPerSecond).toBeGreaterThan(100);
    });
  });

  describe('Signature Verification Benchmark', () => {
    test('should benchmark signature verification', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      const data = 'data to verify';
      const signature = CryptoUtils.sign(data, keyPair.privateKey);
      const iterations = 1000;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        CryptoUtils.verify(data, signature, keyPair.publicKey);
      }

      const duration = Date.now() - startTime;
      const verificationsPerSecond = (iterations / duration) * 1000;

      console.log(`Verification performance: ${verificationsPerSecond.toFixed(2)} verifications/sec`);
      console.log(`Average time per verification: ${(duration / iterations).toFixed(3)}ms`);

      expect(verificationsPerSecond).toBeGreaterThan(100);
    });
  });

  describe('Key Generation Benchmark', () => {
    test('should benchmark key pair generation', () => {
      const iterations = 100;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        CryptoUtils.generateKeyPair();
      }

      const duration = Date.now() - startTime;
      const keysPerSecond = (iterations / duration) * 1000;

      console.log(`Key generation: ${keysPerSecond.toFixed(2)} keypairs/sec`);
      console.log(`Average time per keypair: ${(duration / iterations).toFixed(3)}ms`);

      expect(keysPerSecond).toBeGreaterThan(10);
    });
  });

  describe('Address Derivation Benchmark', () => {
    test('should benchmark address generation', () => {
      const keyPairs = Array.from({ length: 100 }, () =>
        CryptoUtils.generateKeyPair()
      );
      const iterations = keyPairs.length;

      const startTime = Date.now();

      keyPairs.forEach(keyPair => {
        CryptoUtils.getAddressFromPublicKey(keyPair.publicKey);
      });

      const duration = Date.now() - startTime;
      const addressesPerSecond = (iterations / duration) * 1000;

      console.log(`Address derivation: ${addressesPerSecond.toFixed(2)} addresses/sec`);
      console.log(`Average time per address: ${(duration / iterations).toFixed(3)}ms`);

      expect(addressesPerSecond).toBeGreaterThan(100);
    });
  });

  describe('Batch Operations Benchmark', () => {
    test('should benchmark batch hash operations', () => {
      const batchSizes = [10, 100, 1000];
      const results = [];

      batchSizes.forEach(batchSize => {
        const data = Array.from({ length: batchSize }, (_, i) => `data-${i}`);

        const startTime = Date.now();

        data.forEach(item => {
          CryptoUtils.hash(item);
        });

        const duration = Date.now() - startTime;
        const throughput = (batchSize / duration) * 1000;

        results.push({ batchSize, throughput });
        console.log(`Batch ${batchSize}: ${throughput.toFixed(2)} ops/sec`);
      });

      expect(results).toHaveLength(3);
    });

    test('should benchmark batch signature verification', () => {
      const batchSize = 100;
      const keyPairs = Array.from({ length: batchSize }, () =>
        CryptoUtils.generateKeyPair()
      );

      const signatures = keyPairs.map(keyPair => ({
        data: 'test data',
        signature: CryptoUtils.sign('test data', keyPair.privateKey),
        publicKey: keyPair.publicKey
      }));

      const startTime = Date.now();

      signatures.forEach(sig => {
        CryptoUtils.verify(sig.data, sig.signature, sig.publicKey);
      });

      const duration = Date.now() - startTime;
      const throughput = (batchSize / duration) * 1000;

      console.log(`Batch verification: ${throughput.toFixed(2)} verifications/sec`);

      expect(throughput).toBeGreaterThan(50);
    });
  });

  describe('Comparative Performance', () => {
    test('should compare hash vs signature performance', () => {
      const iterations = 1000;
      const data = 'test data';
      const keyPair = CryptoUtils.generateKeyPair();

      // Hash benchmark
      const hashStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        CryptoUtils.hash(data);
      }
      const hashDuration = Date.now() - hashStart;

      // Signature benchmark
      const sigStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        CryptoUtils.sign(data, keyPair.privateKey);
      }
      const sigDuration = Date.now() - sigStart;

      console.log(`Hash: ${hashDuration}ms total`);
      console.log(`Signature: ${sigDuration}ms total`);
      console.log(`Signature is ${(sigDuration / hashDuration).toFixed(2)}x slower than hash`);

      expect(sigDuration).toBeGreaterThan(hashDuration);
    });
  });
});
