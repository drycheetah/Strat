/**
 * Mempool Controller
 * Handles API endpoints for mempool operations
 */

const { Transaction } = require('../src/transaction');

/**
 * Get mempool statistics
 */
exports.getMempoolStats = async (req, res) => {
  try {
    const stats = req.blockchain.mempool.getStats();

    res.json({
      success: true,
      stats: {
        ...stats,
        transactions: Array.from(req.blockchain.mempool.transactions.entries()).map(([hash, entry]) => ({
          hash,
          priority: entry.priority,
          feeRate: entry.feeRate,
          addedAt: entry.addedAt,
          age: Date.now() - entry.addedAt
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get mempool stats',
      message: error.message
    });
  }
};

/**
 * Get transaction from mempool
 */
exports.getMempoolTransaction = async (req, res) => {
  try {
    const { txHash } = req.params;
    const tx = req.blockchain.mempool.getTransaction(txHash);

    if (!tx) {
      return res.status(404).json({
        error: 'Transaction not found in mempool'
      });
    }

    const entry = req.blockchain.mempool.transactions.get(txHash);
    const position = req.blockchain.mempool.getTransactionPosition(txHash);

    res.json({
      success: true,
      transaction: tx,
      priority: entry.priority,
      feeRate: entry.feeRate,
      position,
      addedAt: entry.addedAt
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get transaction',
      message: error.message
    });
  }
};

/**
 * Get transactions by priority
 */
exports.getTransactionsByPriority = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const transactions = req.blockchain.mempool.getTransactionsByPriority(limit);

    const enriched = transactions.map(tx => {
      const entry = req.blockchain.mempool.transactions.get(tx.hash);
      return {
        hash: tx.hash,
        from: tx.from || tx.inputs.map(i => i.address).join(', '),
        to: tx.to || tx.outputs.map(o => o.address).join(', '),
        priority: entry.priority,
        feeRate: entry.feeRate,
        addedAt: entry.addedAt,
        age: Date.now() - entry.addedAt
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      transactions: enriched
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get transactions',
      message: error.message
    });
  }
};

/**
 * Replace transaction (RBF - Replace By Fee)
 */
exports.replaceTransaction = async (req, res) => {
  try {
    const { oldTxHash } = req.params;
    const { transaction } = req.body;

    // Create transaction object
    const tx = new Transaction(
      transaction.from,
      transaction.to,
      transaction.amount,
      transaction.privateKey
    );

    // Set inputs and outputs
    tx.inputs = transaction.inputs;
    tx.outputs = transaction.outputs;
    tx.hash = transaction.hash;
    tx.signature = transaction.signature;

    const result = req.blockchain.mempool.replaceTransaction(
      oldTxHash,
      tx,
      req.blockchain
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Transaction replaced successfully',
      newTxHash: tx.hash,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to replace transaction',
      message: error.message
    });
  }
};

/**
 * Remove transaction from mempool
 */
exports.removeTransaction = async (req, res) => {
  try {
    const { txHash } = req.params;
    const removed = req.blockchain.mempool.removeTransaction(txHash);

    if (!removed) {
      return res.status(404).json({
        error: 'Transaction not found in mempool'
      });
    }

    res.json({
      success: true,
      message: 'Transaction removed from mempool'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to remove transaction',
      message: error.message
    });
  }
};

/**
 * Get recommended fee rate
 */
exports.getRecommendedFeeRate = async (req, res) => {
  try {
    const priority = req.query.priority || 'medium'; // low, medium, high

    const transactions = req.blockchain.mempool.getTransactionsByPriority();
    const feeRates = transactions
      .map(tx => {
        const entry = req.blockchain.mempool.transactions.get(tx.hash);
        return entry.feeRate || 0;
      })
      .filter(rate => rate > 0)
      .sort((a, b) => b - a);

    let recommendedRate = req.blockchain.mempool.minFeeRate;

    if (feeRates.length > 0) {
      if (priority === 'high') {
        recommendedRate = feeRates[0] * 1.5; // 50% higher than highest
      } else if (priority === 'medium') {
        const medianIndex = Math.floor(feeRates.length / 2);
        recommendedRate = feeRates[medianIndex] || req.blockchain.mempool.minFeeRate;
      } else {
        recommendedRate = Math.min(...feeRates) || req.blockchain.mempool.minFeeRate;
      }
    }

    res.json({
      success: true,
      priority,
      recommendedFeeRate: recommendedRate,
      minFeeRate: req.blockchain.mempool.minFeeRate,
      currentFeeRates: {
        high: feeRates[0] || 0,
        medium: feeRates[Math.floor(feeRates.length / 2)] || 0,
        low: feeRates[feeRates.length - 1] || 0
      },
      mempoolUtilization: req.blockchain.mempool.getStats().utilization
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get recommended fee rate',
      message: error.message
    });
  }
};
