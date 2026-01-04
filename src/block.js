const CryptoUtils = require('./crypto');

class Block {
  constructor(index, transactions, previousHash = '', timestamp = Date.now()) {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.difficulty = 0;
    this.hash = '';
    this.merkleRoot = this.calculateMerkleRoot();
  }

  calculateHash() {
    const data = {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions.map(tx => tx.hash),
      previousHash: this.previousHash,
      nonce: this.nonce,
      merkleRoot: this.merkleRoot
    };
    return CryptoUtils.hash(data);
  }

  calculateMerkleRoot() {
    if (this.transactions.length === 0) return '';

    let hashes = this.transactions.map(tx => tx.hash);

    while (hashes.length > 1) {
      if (hashes.length % 2 !== 0) {
        hashes.push(hashes[hashes.length - 1]);
      }

      const newHashes = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const combined = hashes[i] + hashes[i + 1];
        newHashes.push(CryptoUtils.hash(combined));
      }
      hashes = newHashes;
    }

    return hashes[0];
  }

  mineBlock(difficulty) {
    this.difficulty = difficulty;
    const target = '0'.repeat(difficulty);

    console.log(`Mining block ${this.index} with difficulty ${difficulty}...`);
    const startTime = Date.now();

    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();

      if (this.nonce % 100000 === 0) {
        process.stdout.write(`\rNonce: ${this.nonce}, Hash: ${this.hash.substring(0, 20)}...`);
      }
    }

    const endTime = Date.now();
    console.log(`\nBlock mined! Hash: ${this.hash}`);
    console.log(`Time taken: ${((endTime - startTime) / 1000).toFixed(2)}s, Nonce: ${this.nonce}`);
  }

  hasValidTransactions(blockchain) {
    for (let tx of this.transactions) {
      if (tx.isCoinbase) continue;

      if (!blockchain.isValidTransaction(tx)) {
        return false;
      }
    }
    return true;
  }
}

module.exports = Block;
