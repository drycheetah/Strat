const io = require('socket.io-client');

describe('WebSocket Integration Tests', () => {
  let socket;
  const serverUrl = 'http://localhost:3000';

  beforeEach((done) => {
    socket = io(serverUrl);
    socket.on('connect', done);
  });

  afterEach(() => {
    if (socket.connected) {
      socket.disconnect();
    }
  });

  describe('Connection', () => {
    test('should connect to WebSocket server', (done) => {
      expect(socket.connected).toBe(true);
      done();
    });

    test('should receive connection acknowledgment', (done) => {
      socket.on('welcome', (data) => {
        expect(data).toBeDefined();
        expect(data.message).toBeDefined();
        done();
      });
    });

    test('should handle disconnection', (done) => {
      socket.on('disconnect', () => {
        expect(socket.connected).toBe(false);
        done();
      });

      socket.disconnect();
    });
  });

  describe('Block Updates', () => {
    test('should receive new block notifications', (done) => {
      socket.on('newBlock', (block) => {
        expect(block).toBeDefined();
        expect(block.index).toBeDefined();
        expect(block.hash).toBeDefined();
        done();
      });

      // Trigger block mining
      socket.emit('mineBlock', { minerAddress: 'test-miner' });
    });

    test('should receive block data in correct format', (done) => {
      socket.on('newBlock', (block) => {
        expect(typeof block.index).toBe('number');
        expect(typeof block.timestamp).toBe('number');
        expect(Array.isArray(block.transactions)).toBe(true);
        done();
      });
    });
  });

  describe('Transaction Updates', () => {
    test('should receive new transaction notifications', (done) => {
      socket.on('newTransaction', (tx) => {
        expect(tx).toBeDefined();
        expect(tx.hash).toBeDefined();
        done();
      });

      // Emit new transaction
      socket.emit('submitTransaction', {
        from: 'sender',
        to: 'recipient',
        amount: 100
      });
    });

    test('should broadcast transactions to all clients', (done) => {
      const socket2 = io(serverUrl);

      socket2.on('connect', () => {
        socket2.on('newTransaction', (tx) => {
          expect(tx).toBeDefined();
          socket2.disconnect();
          done();
        });

        // Submit from first socket
        socket.emit('submitTransaction', {
          from: 'sender',
          to: 'recipient',
          amount: 100
        });
      });
    });
  });

  describe('Price Updates', () => {
    test('should receive real-time price updates', (done) => {
      socket.on('priceUpdate', (priceData) => {
        expect(priceData).toBeDefined();
        expect(priceData.price).toBeDefined();
        expect(typeof priceData.price).toBe('number');
        done();
      });

      // Simulate price update
      setTimeout(() => {
        socket.emit('requestPrice', { pair: 'STRAT/USDT' });
      }, 100);
    });

    test('should handle multiple price subscriptions', (done) => {
      const pairs = ['STRAT/USDT', 'STRAT/BTC'];
      let receivedUpdates = 0;

      socket.on('priceUpdate', (data) => {
        receivedUpdates++;
        expect(pairs).toContain(data.pair);

        if (receivedUpdates === pairs.length) {
          done();
        }
      });

      pairs.forEach(pair => {
        socket.emit('subscribe', { channel: 'price', pair });
      });
    });
  });

  describe('Order Book Updates', () => {
    test('should receive order book updates', (done) => {
      socket.on('orderBookUpdate', (orderBook) => {
        expect(orderBook).toBeDefined();
        expect(orderBook.bids).toBeDefined();
        expect(orderBook.asks).toBeDefined();
        done();
      });

      socket.emit('subscribeOrderBook', { pair: 'STRAT/USDT' });
    });

    test('should update on new orders', (done) => {
      socket.on('orderBookUpdate', (orderBook) => {
        expect(Array.isArray(orderBook.bids)).toBe(true);
        expect(Array.isArray(orderBook.asks)).toBe(true);
        done();
      });

      socket.emit('placeOrder', {
        type: 'buy',
        pair: 'STRAT/USDT',
        amount: 100,
        price: 10.5
      });
    });
  });

  describe('Room Management', () => {
    test('should join specific rooms', (done) => {
      socket.emit('joinRoom', { room: 'trading' }, (response) => {
        expect(response.success).toBe(true);
        done();
      });
    });

    test('should leave rooms', (done) => {
      socket.emit('joinRoom', { room: 'trading' }, () => {
        socket.emit('leaveRoom', { room: 'trading' }, (response) => {
          expect(response.success).toBe(true);
          done();
        });
      });
    });

    test('should receive room-specific messages', (done) => {
      socket.emit('joinRoom', { room: 'alerts' }, () => {
        socket.on('roomMessage', (message) => {
          expect(message.room).toBe('alerts');
          done();
        });

        // Simulate room message
        socket.emit('sendToRoom', {
          room: 'alerts',
          message: 'Test alert'
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid events gracefully', (done) => {
      socket.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      socket.emit('invalidEvent', { data: 'bad' });
    });

    test('should validate message format', (done) => {
      socket.on('validationError', (error) => {
        expect(error.message).toBeDefined();
        done();
      });

      socket.emit('submitTransaction', {
        // Missing required fields
        amount: 100
      });
    });
  });

  describe('Authentication', () => {
    test('should authenticate with token', (done) => {
      socket.emit('authenticate', { token: 'valid-token' }, (response) => {
        expect(response).toBeDefined();
        done();
      });
    });

    test('should reject invalid tokens', (done) => {
      socket.emit('authenticate', { token: 'invalid' }, (response) => {
        expect(response.success).toBe(false);
        done();
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should rate limit excessive messages', (done) => {
      let messageCount = 0;
      let rateLimited = false;

      socket.on('rateLimitExceeded', () => {
        rateLimited = true;
      });

      // Send many messages rapidly
      const interval = setInterval(() => {
        socket.emit('ping');
        messageCount++;

        if (messageCount >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Should have been rate limited
            expect(rateLimited || messageCount < 100).toBe(true);
            done();
          }, 100);
        }
      }, 10);
    });
  });

  describe('Reconnection', () => {
    test('should handle reconnection', (done) => {
      let reconnected = false;

      socket.on('reconnect', () => {
        reconnected = true;
      });

      // Simulate disconnect and reconnect
      socket.disconnect();

      setTimeout(() => {
        socket.connect();
        setTimeout(() => {
          expect(socket.connected).toBe(true);
          done();
        }, 100);
      }, 100);
    });
  });
});
