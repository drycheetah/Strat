/**
 * Mock Blockchain for Testing
 * Lightweight blockchain simulator for development and testing
 */

const crypto = require('crypto');

class MockBlockchain {
  constructor() {
    this.blocks = [];
    this.pendingTransactions = [];
    this.difficulty = 2;
    this.miningReward = 50;
    this.accounts = new Map();
    this.utxos = new Map();
    this.contracts = new Map();
    this.currentTime = Date.now();

    // Create genesis block
    this.createGenesisBlock();
  }

  createGenesisBlock() {
    const genesisBlock = {
      index: 0,
      timestamp: this.currentTime,
      transactions: [],
      previousHash: '0',
      hash: this.calculateHash(0, this.currentTime, [], '0', 0),
      nonce: 0,
      difficulty: this.difficulty
    };

    this.blocks.push(genesisBlock);
  }

  calculateHash(index, timestamp, transactions, previousHash, nonce) {
    const data = index + timestamp + JSON.stringify(transactions) + previousHash + nonce;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  getLatestBlock() {
    return this.blocks[this.blocks.length - 1];
  }

  // Account Management

  createAccount(address, balance = 0) {
    if (this.accounts.has(address)) {
      throw new Error('Account already exists');
    }

    this.accounts.set(address, {
      address,
      balance,
      nonce: 0,
      createdAt: this.currentTime
    });

    // Create initial UTXO if balance > 0
    if (balance > 0) {
      const utxoId = this.generateId();
      this.utxos.set(utxoId, {
        id: utxoId,
        address,
        amount: balance,
        txId: 'genesis',
        index: 0
      });
    }

    return this.accounts.get(address);
  }

  getAccount(address) {
    return this.accounts.get(address) || null;
  }

  getBalance(address) {
    const account = this.accounts.get(address);
    if (!account) return 0;

    let balance = 0;
    for (const utxo of this.utxos.values()) {
      if (utxo.address === address) {
        balance += utxo.amount;
      }
    }

    return balance;
  }

  // Transaction Management

  addTransaction(transaction) {
    // Validate transaction
    if (!transaction.from || !transaction.to) {
      throw new Error('Transaction must include from and to addresses');
    }

    if (transaction.amount <= 0) {
      throw new Error('Transaction amount must be positive');
    }

    // Check balance
    const balance = this.getBalance(transaction.from);
    if (balance < transaction.amount) {
      throw new Error('Insufficient balance');
    }

    // Add to pending transactions
    const tx = {
      ...transaction,
      id: this.generateId(),
      timestamp: this.currentTime,
      status: 'pending'
    };

    this.pendingTransactions.push(tx);

    return tx;
  }

  // Mining

  minePendingTransactions(minerAddress) {
    if (!minerAddress) {
      throw new Error('Miner address required');
    }

    const block = {
      index: this.blocks.length,
      timestamp: this.currentTime,
      transactions: [...this.pendingTransactions],
      previousHash: this.getLatestBlock().hash,
      nonce: 0,
      difficulty: this.difficulty
    };

    // Mine block (simplified)
    while (true) {
      block.hash = this.calculateHash(
        block.index,
        block.timestamp,
        block.transactions,
        block.previousHash,
        block.nonce
      );

      if (block.hash.startsWith('0'.repeat(this.difficulty))) {
        break;
      }

      block.nonce++;
    }

    // Process transactions
    for (const tx of block.transactions) {
      this.processTransaction(tx);
    }

    // Add mining reward
    const rewardUtxo = {
      id: this.generateId(),
      address: minerAddress,
      amount: this.miningReward,
      txId: block.hash,
      index: 0
    };
    this.utxos.set(rewardUtxo.id, rewardUtxo);

    this.blocks.push(block);
    this.pendingTransactions = [];

    return block;
  }

  processTransaction(tx) {
    // Remove UTXOs for sender
    const toRemove = [];
    let collected = 0;

    for (const [id, utxo] of this.utxos.entries()) {
      if (utxo.address === tx.from && collected < tx.amount) {
        toRemove.push(id);
        collected += utxo.amount;
      }
    }

    toRemove.forEach(id => this.utxos.delete(id));

    // Create UTXO for recipient
    const recipientUtxo = {
      id: this.generateId(),
      address: tx.to,
      amount: tx.amount,
      txId: tx.id,
      index: 0
    };
    this.utxos.set(recipientUtxo.id, recipientUtxo);

    // Create change UTXO if necessary
    const change = collected - tx.amount;
    if (change > 0) {
      const changeUtxo = {
        id: this.generateId(),
        address: tx.from,
        amount: change,
        txId: tx.id,
        index: 1
      };
      this.utxos.set(changeUtxo.id, changeUtxo);
    }

    tx.status = 'confirmed';
  }

  // Smart Contracts

  deployContract(code, owner) {
    const contractAddress = this.generateAddress();

    const contract = {
      address: contractAddress,
      code,
      owner,
      state: {},
      createdAt: this.currentTime,
      balance: 0
    };

    this.contracts.set(contractAddress, contract);

    return contract;
  }

  callContract(contractAddress, method, params, caller) {
    const contract = this.contracts.get(contractAddress);

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Simple contract execution simulation
    const context = {
      contract: contract.state,
      caller,
      method,
      params,
      result: null
    };

    try {
      // In real implementation, would execute contract code
      // For now, just return success
      context.result = { success: true, method, params };
      return context.result;
    } catch (error) {
      throw new Error(`Contract execution failed: ${error.message}`);
    }
  }

  getContract(contractAddress) {
    return this.contracts.get(contractAddress);
  }

  // Blockchain Info

  getBlockByIndex(index) {
    return this.blocks[index] || null;
  }

  getBlockByHash(hash) {
    return this.blocks.find(block => block.hash === hash) || null;
  }

  getTransaction(txId) {
    for (const block of this.blocks) {
      const tx = block.transactions.find(t => t.id === txId);
      if (tx) return tx;
    }

    return this.pendingTransactions.find(t => t.id === txId) || null;
  }

  getBlockchainInfo() {
    return {
      height: this.blocks.length,
      difficulty: this.difficulty,
      pendingTransactions: this.pendingTransactions.length,
      totalAccounts: this.accounts.size,
      totalContracts: this.contracts.size,
      latestBlock: this.getLatestBlock()
    };
  }

  // Time Control (for testing)

  advanceTime(milliseconds) {
    this.currentTime += milliseconds;
  }

  setTime(timestamp) {
    this.currentTime = timestamp;
  }

  // Validation

  isChainValid() {
    for (let i = 1; i < this.blocks.length; i++) {
      const currentBlock = this.blocks[i];
      const previousBlock = this.blocks[i - 1];

      // Verify hash
      const calculatedHash = this.calculateHash(
        currentBlock.index,
        currentBlock.timestamp,
        currentBlock.transactions,
        currentBlock.previousHash,
        currentBlock.nonce
      );

      if (currentBlock.hash !== calculatedHash) {
        return false;
      }

      // Verify chain link
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }

      // Verify proof of work
      if (!currentBlock.hash.startsWith('0'.repeat(currentBlock.difficulty))) {
        return false;
      }
    }

    return true;
  }

  // Reset

  reset() {
    this.blocks = [];
    this.pendingTransactions = [];
    this.accounts.clear();
    this.utxos.clear();
    this.contracts.clear();
    this.currentTime = Date.now();
    this.createGenesisBlock();
  }

  // Snapshot/Restore

  snapshot() {
    return {
      blocks: JSON.parse(JSON.stringify(this.blocks)),
      pendingTransactions: JSON.parse(JSON.stringify(this.pendingTransactions)),
      accounts: Array.from(this.accounts.entries()),
      utxos: Array.from(this.utxos.entries()),
      contracts: Array.from(this.contracts.entries()),
      currentTime: this.currentTime
    };
  }

  restore(snapshot) {
    this.blocks = snapshot.blocks;
    this.pendingTransactions = snapshot.pendingTransactions;
    this.accounts = new Map(snapshot.accounts);
    this.utxos = new Map(snapshot.utxos);
    this.contracts = new Map(snapshot.contracts);
    this.currentTime = snapshot.currentTime;
  }

  // Utility Methods

  generateId() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateAddress() {
    return '0x' + crypto.randomBytes(20).toString('hex');
  }

  // Statistics

  getStatistics() {
    return {
      totalBlocks: this.blocks.length,
      totalTransactions: this.blocks.reduce((sum, block) => sum + block.transactions.length, 0),
      pendingTransactions: this.pendingTransactions.length,
      totalAccounts: this.accounts.size,
      totalContracts: this.contracts.size,
      totalUTXOs: this.utxos.size,
      chainValid: this.isChainValid()
    };
  }
}

module.exports = MockBlockchain;
