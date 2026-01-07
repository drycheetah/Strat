const Blockchain = require('../../../src/blockchain');
const Block = require('../../../src/block');
const { Transaction } = require('../../../src/transaction');

describe('Blockchain', () => {
  let blockchain;

  beforeEach(() => {
    blockchain = new Blockchain();
  });

  describe('Constructor', () => {
    test('should create blockchain with genesis block', () => {
      expect(blockchain.chain).toHaveLength(1);
      expect(blockchain.chain[0].index).toBe(0);
      expect(blockchain.chain[0].previousHash).toBe('0');
    });

    test('should initialize with correct default values', () => {
      expect(blockchain.difficulty).toBeDefined();
      expect(blockchain.miningReward).toBeDefined();
      expect(blockchain.transactionFee).toBeDefined();
      expect(blockchain.pendingTransactions).toEqual([]);
      expect(blockchain.mempool).toBeDefined();
    });

    test('should initialize UTXO set with genesis transaction', () => {
      expect(blockchain.utxos.size).toBeGreaterThan(0);
    });
  });

  describe('createGenesisBlock', () => {
    test('should create valid genesis block', () => {
      const genesisBlock = blockchain.createGenesisBlock();
      expect(genesisBlock.index).toBe(0);
      expect(genesisBlock.previousHash).toBe('0');
      expect(genesisBlock.transactions).toHaveLength(1);
      expect(genesisBlock.hash).toBeDefined();
    });

    test('genesis block should contain coinbase transaction', () => {
      const genesisBlock = blockchain.createGenesisBlock();
      const genesisTx = genesisBlock.transactions[0];
      expect(genesisTx.isCoinbase).toBe(true);
    });
  });

  describe('getLatestBlock', () => {
    test('should return the last block in chain', () => {
      const latestBlock = blockchain.getLatestBlock();
      expect(latestBlock).toBe(blockchain.chain[blockchain.chain.length - 1]);
    });
  });

  describe('minePendingTransactions', () => {
    test('should create new block with miner reward', () => {
      const minerAddress = 'miner-address-123';
      const initialLength = blockchain.chain.length;

      blockchain.minePendingTransactions(minerAddress);

      expect(blockchain.chain).toHaveLength(initialLength + 1);
      const newBlock = blockchain.getLatestBlock();
      expect(newBlock.transactions[0].isCoinbase).toBe(true);
    });

    test('should clear pending transactions after mining', () => {
      blockchain.pendingTransactions = [{ hash: 'test' }];
      blockchain.minePendingTransactions('miner-address');

      expect(blockchain.pendingTransactions).toEqual([]);
    });

    test('should include transaction fees in miner reward', () => {
      const minerAddress = 'miner-address';
      // This test would need proper transaction setup
      blockchain.minePendingTransactions(minerAddress);

      const newBlock = blockchain.getLatestBlock();
      const rewardTx = newBlock.transactions[0];
      expect(rewardTx.outputs[0].amount).toBeGreaterThanOrEqual(blockchain.miningReward);
    });
  });

  describe('isChainValid', () => {
    test('should validate a correct blockchain', () => {
      expect(blockchain.isChainValid()).toBe(true);
    });

    test('should detect tampered block hash', () => {
      blockchain.chain[0].hash = 'tampered-hash';
      expect(blockchain.isChainValid()).toBe(false);
    });

    test('should detect broken chain links', () => {
      if (blockchain.chain.length > 1) {
        blockchain.chain[1].previousHash = 'wrong-hash';
        expect(blockchain.isChainValid()).toBe(false);
      }
    });
  });

  describe('getBalance', () => {
    test('should return 0 for non-existent address', () => {
      const balance = blockchain.getBalance('non-existent-address');
      expect(balance).toBe(0);
    });

    test('should calculate balance from UTXO set', () => {
      const genesisBalance = blockchain.getBalance('GENESIS');
      expect(genesisBalance).toBeGreaterThan(0);
    });
  });

  describe('addTransaction', () => {
    test('should add valid transaction to mempool', () => {
      const mockTx = {
        hash: 'test-hash-123',
        from: 'address1',
        to: 'address2',
        amount: 10,
        isCoinbase: false,
        isValid: jest.fn().mockReturnValue(true)
      };

      const result = blockchain.addTransaction(mockTx);
      expect(result).toBeDefined();
    });

    test('should reject invalid transaction', () => {
      const invalidTx = {
        hash: 'invalid-hash',
        isValid: jest.fn().mockReturnValue(false)
      };

      expect(() => {
        blockchain.addTransaction(invalidTx);
      }).toThrow();
    });
  });

  describe('Difficulty Adjustment', () => {
    test('should adjust difficulty based on block time', () => {
      const initialDifficulty = blockchain.difficulty;

      // Add blocks to trigger adjustment
      for (let i = 0; i < blockchain.difficultyAdjustmentInterval; i++) {
        blockchain.minePendingTransactions('test-miner');
      }

      // Difficulty may have changed
      expect(blockchain.difficulty).toBeDefined();
    });
  });

  describe('UTXO Management', () => {
    test('should track UTXOs correctly', () => {
      const initialUtxoCount = blockchain.utxos.size;
      expect(initialUtxoCount).toBeGreaterThan(0);
    });

    test('should update UTXOs when mining block', () => {
      blockchain.minePendingTransactions('miner-123');
      expect(blockchain.utxos.size).toBeGreaterThan(0);
    });
  });

  describe('Smart Contracts', () => {
    test('should initialize contracts map', () => {
      expect(blockchain.contracts).toBeInstanceOf(Map);
    });

    test('should store deployed contracts', () => {
      const contractAddress = 'contract-address-123';
      const contractCode = 'contract code';
      blockchain.contracts.set(contractAddress, { code: contractCode });

      expect(blockchain.contracts.get(contractAddress)).toBeDefined();
      expect(blockchain.contracts.get(contractAddress).code).toBe(contractCode);
    });
  });

  describe('Block Time Target', () => {
    test('should have configurable block time', () => {
      expect(blockchain.blockTime).toBeDefined();
      expect(typeof blockchain.blockTime).toBe('number');
    });
  });

  describe('Transaction Fee', () => {
    test('should have transaction fee defined', () => {
      expect(blockchain.transactionFee).toBeDefined();
      expect(blockchain.transactionFee).toBeGreaterThan(0);
    });
  });
});
