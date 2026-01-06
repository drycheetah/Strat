/**
 * Transaction Mempool with Fee Prioritization
 * Manages pending transactions before they're included in blocks
 */

class Mempool {
  constructor() {
    this.transactions = new Map(); // txHash -> transaction
    this.spentUTXOs = new Set(); // Track spent UTXOs to prevent double-spending
    this.maxSize = parseInt(process.env.MEMPOOL_MAX_SIZE) || 10000;
    this.minFeeRate = parseFloat(process.env.MIN_FEE_RATE) || 0.001; // Min fee per byte
  }

  /**
   * Calculate transaction fee rate (fee per byte)
   */
  calculateFeeRate(transaction, inputSum, outputSum) {
    const fee = inputSum - outputSum;
    const txSize = JSON.stringify(transaction).length;
    return fee / txSize;
  }

  /**
   * Calculate transaction priority score
   * Higher priority = higher fee rate + older timestamp
   */
  calculatePriority(transaction, inputSum, outputSum) {
    const feeRate = this.calculateFeeRate(transaction, inputSum, outputSum);
    const age = Date.now() - transaction.timestamp;
    const ageScore = Math.min(age / (1000 * 60 * 60), 10); // Max 10 points for age (1 hour = max)
    return feeRate * 1000 + ageScore;
  }

  /**
   * Add transaction to mempool
   */
  addTransaction(transaction, blockchain) {
    // Check if transaction already exists
    if (this.transactions.has(transaction.hash)) {
      return { success: false, error: 'Transaction already in mempool' };
    }

    // Skip validation for special transaction types
    if (transaction.isCoinbase || transaction.isContractDeploy || transaction.isContractCall) {
      this.transactions.set(transaction.hash, {
        tx: transaction,
        addedAt: Date.now(),
        priority: 1000000 // High priority for special transactions
      });
      return { success: true };
    }

    // Check mempool size limit
    if (this.transactions.size >= this.maxSize) {
      // Try to evict lowest priority transaction
      const lowestPriority = this.getLowestPriorityTransaction();
      if (!lowestPriority) {
        return { success: false, error: 'Mempool is full' };
      }
      this.removeTransaction(lowestPriority.hash);
    }

    // Verify UTXOs are available
    for (let input of transaction.inputs) {
      const utxoKey = `${input.txHash}:${input.outputIndex}`;

      // Check if UTXO exists in blockchain
      const utxo = blockchain.utxos.get(utxoKey);
      if (!utxo) {
        return { success: false, error: `UTXO not found: ${utxoKey}` };
      }

      // Check if UTXO is already spent in mempool
      if (this.spentUTXOs.has(utxoKey)) {
        return { success: false, error: `UTXO already spent: ${utxoKey}` };
      }
    }

    // Calculate input and output sums
    const inputSum = blockchain.calculateInputSum(transaction);
    const outputSum = blockchain.calculateOutputSum(transaction);

    // Verify sufficient funds
    if (inputSum < outputSum) {
      return { success: false, error: 'Insufficient funds' };
    }

    // Calculate fee rate
    const feeRate = this.calculateFeeRate(transaction, inputSum, outputSum);
    if (feeRate < this.minFeeRate) {
      return {
        success: false,
        error: `Fee rate too low. Minimum: ${this.minFeeRate}, provided: ${feeRate.toFixed(6)}`
      };
    }

    // Calculate priority
    const priority = this.calculatePriority(transaction, inputSum, outputSum);

    // Mark UTXOs as spent
    for (let input of transaction.inputs) {
      const utxoKey = `${input.txHash}:${input.outputIndex}`;
      this.spentUTXOs.add(utxoKey);
    }

    // Add to mempool
    this.transactions.set(transaction.hash, {
      tx: transaction,
      addedAt: Date.now(),
      priority,
      feeRate,
      inputSum,
      outputSum
    });

    return {
      success: true,
      priority,
      feeRate,
      position: this.getTransactionPosition(transaction.hash)
    };
  }

  /**
   * Remove transaction from mempool
   */
  removeTransaction(txHash) {
    const entry = this.transactions.get(txHash);
    if (!entry) return false;

    // Free up spent UTXOs
    if (!entry.tx.isCoinbase && !entry.tx.isContractDeploy && !entry.tx.isContractCall) {
      for (let input of entry.tx.inputs) {
        const utxoKey = `${input.txHash}:${input.outputIndex}`;
        this.spentUTXOs.delete(utxoKey);
      }
    }

    this.transactions.delete(txHash);
    return true;
  }

  /**
   * Get transaction by hash
   */
  getTransaction(txHash) {
    const entry = this.transactions.get(txHash);
    return entry ? entry.tx : null;
  }

  /**
   * Get transactions sorted by priority (highest first)
   */
  getTransactionsByPriority(limit = null) {
    const sorted = Array.from(this.transactions.entries())
      .sort((a, b) => b[1].priority - a[1].priority)
      .map(([hash, entry]) => entry.tx);

    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get transaction position in priority queue
   */
  getTransactionPosition(txHash) {
    const sorted = Array.from(this.transactions.entries())
      .sort((a, b) => b[1].priority - a[1].priority);

    return sorted.findIndex(([hash]) => hash === txHash) + 1;
  }

  /**
   * Get lowest priority transaction
   */
  getLowestPriorityTransaction() {
    if (this.transactions.size === 0) return null;

    let lowest = null;
    let lowestPriority = Infinity;

    for (let [hash, entry] of this.transactions) {
      if (entry.priority < lowestPriority) {
        lowestPriority = entry.priority;
        lowest = entry.tx;
      }
    }

    return lowest;
  }

  /**
   * Get mempool statistics
   */
  getStats() {
    let totalFees = 0;
    let totalSize = 0;
    const transactions = Array.from(this.transactions.values());

    for (let entry of transactions) {
      if (entry.inputSum && entry.outputSum) {
        totalFees += entry.inputSum - entry.outputSum;
      }
      totalSize += JSON.stringify(entry.tx).length;
    }

    const avgFeeRate = transactions.length > 0
      ? totalFees / totalSize
      : 0;

    return {
      count: this.transactions.size,
      totalFees,
      totalSize,
      avgFeeRate,
      maxSize: this.maxSize,
      utilization: (this.transactions.size / this.maxSize * 100).toFixed(2) + '%'
    };
  }

  /**
   * Clear all transactions
   */
  clear() {
    this.transactions.clear();
    this.spentUTXOs.clear();
  }

  /**
   * Remove transactions that are now invalid (UTXOs spent in blockchain)
   */
  cleanupInvalidTransactions(blockchain) {
    const toRemove = [];

    for (let [hash, entry] of this.transactions) {
      const tx = entry.tx;

      // Skip special transactions
      if (tx.isCoinbase || tx.isContractDeploy || tx.isContractCall) {
        continue;
      }

      // Check if any UTXOs no longer exist in blockchain
      for (let input of tx.inputs) {
        const utxoKey = `${input.txHash}:${input.outputIndex}`;
        if (!blockchain.utxos.has(utxoKey)) {
          toRemove.push(hash);
          break;
        }
      }
    }

    // Remove invalid transactions
    for (let hash of toRemove) {
      this.removeTransaction(hash);
    }

    return toRemove.length;
  }

  /**
   * Get transactions for mining (highest priority first)
   */
  getTransactionsForMining(maxCount = 100, maxSize = 1000000) {
    const sorted = this.getTransactionsByPriority();
    const selected = [];
    let currentSize = 0;

    for (let tx of sorted) {
      const txSize = JSON.stringify(tx).length;

      if (selected.length >= maxCount || currentSize + txSize > maxSize) {
        break;
      }

      selected.push(tx);
      currentSize += txSize;
    }

    return selected;
  }

  /**
   * Replace transaction with higher fee (RBF - Replace-By-Fee)
   */
  replaceTransaction(oldTxHash, newTransaction, blockchain) {
    const oldEntry = this.transactions.get(oldTxHash);
    if (!oldEntry) {
      return { success: false, error: 'Original transaction not found' };
    }

    // Verify new transaction has same inputs
    const oldInputs = new Set(
      oldEntry.tx.inputs.map(i => `${i.txHash}:${i.outputIndex}`)
    );
    const newInputs = new Set(
      newTransaction.inputs.map(i => `${i.txHash}:${i.outputIndex}`)
    );

    if (oldInputs.size !== newInputs.size ||
        ![...oldInputs].every(i => newInputs.has(i))) {
      return { success: false, error: 'New transaction must use same inputs' };
    }

    // Calculate fee rates
    const oldInputSum = oldEntry.inputSum;
    const oldOutputSum = oldEntry.outputSum;
    const oldFeeRate = this.calculateFeeRate(oldEntry.tx, oldInputSum, oldOutputSum);

    const newInputSum = blockchain.calculateInputSum(newTransaction);
    const newOutputSum = blockchain.calculateOutputSum(newTransaction);
    const newFeeRate = this.calculateFeeRate(newTransaction, newInputSum, newOutputSum);

    // Verify new fee is higher
    if (newFeeRate <= oldFeeRate * 1.1) { // Must be at least 10% higher
      return {
        success: false,
        error: `New fee rate must be at least 10% higher. Old: ${oldFeeRate.toFixed(6)}, New: ${newFeeRate.toFixed(6)}`
      };
    }

    // Remove old transaction
    this.removeTransaction(oldTxHash);

    // Add new transaction
    return this.addTransaction(newTransaction, blockchain);
  }
}

module.exports = Mempool;
