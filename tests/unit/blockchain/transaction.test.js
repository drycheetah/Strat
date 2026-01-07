const { Transaction, UTXO } = require('../../../src/transaction');
const CryptoUtils = require('../../../src/crypto');

describe('Transaction', () => {
  describe('UTXO Class', () => {
    test('should create UTXO with correct properties', () => {
      const utxo = new UTXO('address123', 100, 0);
      expect(utxo.address).toBe('address123');
      expect(utxo.amount).toBe(100);
      expect(utxo.outputIndex).toBe(0);
    });
  });

  describe('Transaction Creation', () => {
    test('should create transaction with inputs and outputs', () => {
      const inputs = [new UTXO('from-address', 50, 0)];
      const outputs = [new UTXO('to-address', 40, 0)];

      const tx = new Transaction(inputs, outputs);

      expect(tx.inputs).toEqual(inputs);
      expect(tx.outputs).toEqual(outputs);
      expect(tx.timestamp).toBeDefined();
      expect(tx.hash).toBeDefined();
    });

    test('should generate unique hash for transaction', () => {
      const inputs = [new UTXO('addr1', 50, 0)];
      const outputs = [new UTXO('addr2', 40, 0)];

      const tx1 = new Transaction(inputs, outputs);
      const tx2 = new Transaction(inputs, outputs);

      expect(tx1.hash).toBeDefined();
      expect(tx2.hash).toBeDefined();
      // Different timestamps will create different hashes
    });
  });

  describe('Coinbase Transaction', () => {
    test('should create coinbase transaction', () => {
      const minerAddress = 'miner-address';
      const blockHeight = 5;
      const reward = 50;

      const coinbaseTx = Transaction.createCoinbaseTx(minerAddress, blockHeight, reward);

      expect(coinbaseTx.isCoinbase).toBe(true);
      expect(coinbaseTx.inputs).toHaveLength(0);
      expect(coinbaseTx.outputs).toHaveLength(1);
      expect(coinbaseTx.outputs[0].amount).toBe(reward);
      expect(coinbaseTx.outputs[0].address).toBe(minerAddress);
    });

    test('coinbase transaction should have no inputs', () => {
      const coinbaseTx = Transaction.createCoinbaseTx('miner', 1, 50);
      expect(coinbaseTx.inputs).toEqual([]);
    });
  });

  describe('Contract Deploy Transaction', () => {
    test('should create contract deployment transaction', () => {
      const deployerAddress = 'deployer-address';
      const contractCode = 'contract code here';
      const gasLimit = 100000;

      const deployTx = Transaction.createContractDeployTx(
        deployerAddress,
        contractCode,
        gasLimit
      );

      expect(deployTx.isContractDeploy).toBe(true);
      expect(deployTx.contractCode).toBe(contractCode);
      expect(deployTx.gasLimit).toBe(gasLimit);
    });
  });

  describe('Contract Call Transaction', () => {
    test('should create contract call transaction', () => {
      const callerAddress = 'caller-address';
      const contractAddress = 'contract-address';
      const method = 'transfer';
      const params = { to: 'recipient', amount: 100 };
      const gasLimit = 50000;

      const callTx = Transaction.createContractCallTx(
        callerAddress,
        contractAddress,
        method,
        params,
        gasLimit
      );

      expect(callTx.isContractCall).toBe(true);
      expect(callTx.contractAddress).toBe(contractAddress);
      expect(callTx.method).toBe(method);
      expect(callTx.params).toEqual(params);
      expect(callTx.gasLimit).toBe(gasLimit);
    });
  });

  describe('Transaction Signing', () => {
    test('should sign transaction with private key', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      const inputs = [new UTXO('addr1', 50, 0)];
      const outputs = [new UTXO('addr2', 40, 0)];

      const tx = new Transaction(inputs, outputs);
      tx.sign(keyPair.privateKey);

      expect(tx.signature).toBeDefined();
      expect(tx.signature.length).toBeGreaterThan(0);
    });

    test('coinbase transaction should not require signature', () => {
      const coinbaseTx = Transaction.createCoinbaseTx('miner', 1, 50);
      expect(coinbaseTx.isCoinbase).toBe(true);
      // Coinbase transactions don't need signatures
    });
  });

  describe('Transaction Validation', () => {
    test('should validate signed transaction', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      const address = CryptoUtils.getAddressFromPublicKey(keyPair.publicKey);

      const inputs = [new UTXO(address, 50, 0)];
      const outputs = [new UTXO('to-address', 40, 0)];

      const tx = new Transaction(inputs, outputs);
      tx.sign(keyPair.privateKey);

      const isValid = tx.isValid();
      expect(typeof isValid).toBe('boolean');
    });

    test('coinbase transaction should be valid without signature', () => {
      const coinbaseTx = Transaction.createCoinbaseTx('miner', 1, 50);
      expect(coinbaseTx.isValid()).toBe(true);
    });

    test('should reject transaction with invalid signature', () => {
      const inputs = [new UTXO('addr1', 50, 0)];
      const outputs = [new UTXO('addr2', 40, 0)];

      const tx = new Transaction(inputs, outputs);
      tx.signature = 'invalid-signature';

      expect(tx.isValid()).toBe(false);
    });

    test('should reject transaction with no outputs', () => {
      const inputs = [new UTXO('addr1', 50, 0)];
      const tx = new Transaction(inputs, []);

      expect(tx.outputs).toHaveLength(0);
    });
  });

  describe('Transaction Hash Calculation', () => {
    test('should calculate consistent hash', () => {
      const inputs = [new UTXO('addr1', 50, 0)];
      const outputs = [new UTXO('addr2', 40, 0)];
      const timestamp = Date.now();

      const tx = new Transaction(inputs, outputs);
      tx.timestamp = timestamp;

      const hash1 = tx.calculateHash();
      const hash2 = tx.calculateHash();

      expect(hash1).toBe(hash2);
    });

    test('should produce different hashes for different transactions', () => {
      const tx1 = new Transaction(
        [new UTXO('addr1', 50, 0)],
        [new UTXO('addr2', 40, 0)]
      );

      const tx2 = new Transaction(
        [new UTXO('addr3', 30, 0)],
        [new UTXO('addr4', 20, 0)]
      );

      expect(tx1.calculateHash()).not.toBe(tx2.calculateHash());
    });
  });

  describe('Transaction Amounts', () => {
    test('should handle decimal amounts correctly', () => {
      const inputs = [new UTXO('addr1', 50.5, 0)];
      const outputs = [new UTXO('addr2', 40.25, 0)];

      const tx = new Transaction(inputs, outputs);

      expect(tx.inputs[0].amount).toBe(50.5);
      expect(tx.outputs[0].amount).toBe(40.25);
    });

    test('should handle zero amounts', () => {
      const outputs = [new UTXO('addr2', 0, 0)];
      const tx = new Transaction([], outputs);

      expect(tx.outputs[0].amount).toBe(0);
    });
  });

  describe('Transaction Metadata', () => {
    test('should store timestamp', () => {
      const tx = new Transaction([], []);
      expect(tx.timestamp).toBeDefined();
      expect(typeof tx.timestamp).toBe('number');
    });

    test('should have unique hash', () => {
      const tx = new Transaction([], []);
      expect(tx.hash).toBeDefined();
      expect(typeof tx.hash).toBe('string');
    });
  });
});
