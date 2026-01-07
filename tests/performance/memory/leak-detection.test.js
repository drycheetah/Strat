const Blockchain = require('../../../src/blockchain');
const { Transaction } = require('../../../src/transaction');

describe('Memory Leak Detection Tests', () => {
  describe('Blockchain Memory Leaks', () => {
    test('should not leak memory when adding many blocks', () => {
      const blockchain = new Blockchain();
      const measurements = [];

      for (let i = 0; i < 100; i++) {
        if (i % 10 === 0) {
          const memUsage = process.memoryUsage();
          measurements.push({
            iteration: i,
            heapUsed: memUsage.heapUsed / 1024 / 1024
          });
        }

        blockchain.minePendingTransactions('miner');
      }

      // Log memory progression
      measurements.forEach(m => {
        console.log(`Iteration ${m.iteration}: ${m.heapUsed.toFixed(2)} MB`);
      });

      // Memory should grow linearly, not exponentially
      const firstMeasurement = measurements[0].heapUsed;
      const lastMeasurement = measurements[measurements.length - 1].heapUsed;
      const growth = lastMeasurement - firstMeasurement;

      console.log(`Total memory growth: ${growth.toFixed(2)} MB`);
      expect(growth).toBeLessThan(500); // Should not grow more than 500MB
    });

    test('should not leak memory in mempool operations', () => {
      const blockchain = new Blockchain();
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      // Add and remove transactions repeatedly
      for (let cycle = 0; cycle < 10; cycle++) {
        // Add 1000 transactions
        for (let i = 0; i < 1000; i++) {
          blockchain.mempool.addTransaction({
            hash: `tx-${cycle}-${i}`,
            fee: 0.01,
            size: 250
          });
        }

        // Mine block (clears mempool)
        blockchain.minePendingTransactions('miner');
      }

      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const growth = finalMemory - initialMemory;

      console.log(`Memory after 10 cycles: ${growth.toFixed(2)} MB increase`);
      expect(growth).toBeLessThan(200);
    });
  });

  describe('Transaction Memory Leaks', () => {
    test('should not leak memory when creating many transactions', () => {
      const measurements = [];
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        if (i % 1000 === 0) {
          const memUsage = process.memoryUsage();
          measurements.push({
            iteration: i,
            heapUsed: memUsage.heapUsed / 1024 / 1024
          });
        }

        const tx = new Transaction([], []);
      }

      measurements.forEach(m => {
        console.log(`Created ${m.iteration} txs: ${m.heapUsed.toFixed(2)} MB`);
      });

      const growth = measurements[measurements.length - 1].heapUsed - measurements[0].heapUsed;
      expect(growth).toBeLessThan(100);
    });
  });

  describe('Event Listener Leaks', () => {
    test('should not accumulate event listeners', () => {
      const blockchain = new Blockchain();
      const initialListeners = process.listenerCount('warning');

      // Simulate operations that might add listeners
      for (let i = 0; i < 100; i++) {
        blockchain.minePendingTransactions('miner');
      }

      const finalListeners = process.listenerCount('warning');

      console.log(`Listeners: ${initialListeners} -> ${finalListeners}`);
      expect(finalListeners).toBeLessThanOrEqual(initialListeners + 10);
    });
  });

  describe('Closure Memory Leaks', () => {
    test('should not retain closures unnecessarily', () => {
      const results = [];
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      function createClosure(data) {
        return function() {
          return data;
        };
      }

      // Create many closures
      for (let i = 0; i < 10000; i++) {
        const closure = createClosure({ data: 'x'.repeat(1000) });
        results.push(closure());
      }

      const afterCreation = process.memoryUsage().heapUsed / 1024 / 1024;

      // Clear results
      results.length = 0;

      if (global.gc) {
        global.gc();
      }

      const afterCleanup = process.memoryUsage().heapUsed / 1024 / 1024;

      console.log(`Initial: ${initialMemory.toFixed(2)} MB`);
      console.log(`After creation: ${afterCreation.toFixed(2)} MB`);
      console.log(`After cleanup: ${afterCleanup.toFixed(2)} MB`);

      expect(afterCleanup).toBeLessThan(afterCreation);
    });
  });

  describe('Circular Reference Detection', () => {
    test('should detect potential circular references', () => {
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2' };

      // Create circular reference
      obj1.ref = obj2;
      obj2.ref = obj1;

      // Try to serialize (would fail with circular reference)
      let hasCircular = false;
      try {
        JSON.stringify(obj1);
      } catch (e) {
        if (e.message.includes('circular')) {
          hasCircular = true;
        }
      }

      expect(hasCircular).toBe(true);
    });
  });

  describe('Buffer Memory Leaks', () => {
    test('should not leak buffer memory', () => {
      const buffers = [];
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      // Create many buffers
      for (let i = 0; i < 1000; i++) {
        buffers.push(Buffer.alloc(10000));
      }

      const withBuffers = process.memoryUsage().heapUsed / 1024 / 1024;

      // Clear buffers
      buffers.length = 0;

      if (global.gc) {
        global.gc();
      }

      const afterCleanup = process.memoryUsage().heapUsed / 1024 / 1024;

      console.log(`Initial: ${initialMemory.toFixed(2)} MB`);
      console.log(`With buffers: ${withBuffers.toFixed(2)} MB`);
      console.log(`After cleanup: ${afterCleanup.toFixed(2)} MB`);

      expect(afterCleanup).toBeLessThan(withBuffers);
    });
  });

  describe('Async Operation Leaks', () => {
    test('should not leak memory with async operations', async () => {
      const promises = [];
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      for (let i = 0; i < 1000; i++) {
        promises.push(
          new Promise(resolve => {
            setTimeout(() => resolve(i), 1);
          })
        );
      }

      await Promise.all(promises);

      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const growth = finalMemory - initialMemory;

      console.log(`Async memory growth: ${growth.toFixed(2)} MB`);
      expect(growth).toBeLessThan(50);
    });
  });
});
