/**
 * Blockchain Explorer Controller
 * Provides comprehensive endpoints for exploring the blockchain
 */

const BlockModel = require('../models/Block');
const Wallet = require('../models/Wallet');

/**
 * Get blockchain statistics
 */
exports.getStats = async (req, res) => {
  try {
    const blockchain = req.blockchain;
    const blocks = await BlockModel.countDocuments();
    const wallets = await Wallet.countDocuments();

    // Calculate total supply from UTXOs
    let circulatingSupply = 0;
    for (let [key, utxo] of blockchain.utxos) {
      circulatingSupply += utxo.amount;
    }

    // Get latest blocks for hashrate calculation
    const recentBlocks = await BlockModel.find()
      .sort({ index: -1 })
      .limit(100);

    let avgBlockTime = 0;
    if (recentBlocks.length > 1) {
      const timeSpan = recentBlocks[0].timestamp - recentBlocks[recentBlocks.length - 1].timestamp;
      avgBlockTime = timeSpan / recentBlocks.length;
    }

    // Calculate network hashrate (estimated)
    const difficulty = blockchain.difficulty;
    const hashrate = Math.pow(2, difficulty) / (avgBlockTime / 1000); // Hashes per second

    // Get mempool stats
    const mempoolStats = blockchain.mempool.getStats();

    res.json({
      success: true,
      stats: {
        blocks,
        wallets,
        circulatingSupply,
        difficulty,
        avgBlockTime,
        hashrate: hashrate.toFixed(2),
        mempoolSize: mempoolStats.count,
        mempoolBytes: mempoolStats.totalSize,
        pendingTransactions: blockchain.pendingTransactions.length,
        utxos: blockchain.utxos.size,
        contracts: blockchain.contracts.size,
        targetBlockTime: blockchain.blockTime
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get blockchain stats',
      message: error.message
    });
  }
};

/**
 * Search blockchain (blocks, transactions, addresses)
 */
exports.search = async (req, res) => {
  try {
    const { query } = req.params;
    const results = {
      blocks: [],
      transactions: [],
      addresses: []
    };

    // Check if it's a block index
    if (/^\d+$/.test(query)) {
      const blockIndex = parseInt(query);
      const block = await BlockModel.findOne({ index: blockIndex });
      if (block) {
        results.blocks.push({
          index: block.index,
          hash: block.hash,
          timestamp: block.timestamp,
          miner: block.miner,
          transactionCount: block.transactionCount
        });
      }
    }

    // Check if it's a block hash
    const blockByHash = await BlockModel.findOne({ hash: query });
    if (blockByHash && !results.blocks.find(b => b.index === blockByHash.index)) {
      results.blocks.push({
        index: blockByHash.index,
        hash: blockByHash.hash,
        timestamp: blockByHash.timestamp,
        miner: blockByHash.miner,
        transactionCount: blockByHash.transactionCount
      });
    }

    // Search for transactions
    const blocks = await BlockModel.find({
      'transactions.hash': query
    }).limit(10);

    for (let block of blocks) {
      const tx = block.transactions.find(t => t.hash === query);
      if (tx) {
        results.transactions.push({
          hash: tx.hash,
          blockIndex: block.index,
          timestamp: tx.timestamp || block.timestamp,
          from: tx.from || 'Multiple',
          to: tx.to || 'Multiple',
          isCoinbase: tx.isCoinbase
        });
      }
    }

    // Check if it's an address
    const wallet = await Wallet.findOne({ address: query });
    if (wallet) {
      const balance = req.blockchain.getBalance(query);
      results.addresses.push({
        address: wallet.address,
        balance,
        type: 'wallet'
      });
    }

    // Check UTXOs for address
    let addressBalance = 0;
    for (let [key, utxo] of req.blockchain.utxos) {
      if (utxo.address === query) {
        addressBalance += utxo.amount;
      }
    }

    if (addressBalance > 0 && !results.addresses.find(a => a.address === query)) {
      results.addresses.push({
        address: query,
        balance: addressBalance,
        type: 'address'
      });
    }

    const totalResults = results.blocks.length + results.transactions.length + results.addresses.length;

    res.json({
      success: true,
      query,
      totalResults,
      results
    });
  } catch (error) {
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
};

/**
 * Get block details by index or hash
 */
exports.getBlock = async (req, res) => {
  try {
    const { identifier } = req.params;
    let block;

    // Check if identifier is a number (block index)
    if (/^\d+$/.test(identifier)) {
      block = await BlockModel.findOne({ index: parseInt(identifier) });
    } else {
      // Treat as block hash
      block = await BlockModel.findOne({ hash: identifier });
    }

    if (!block) {
      return res.status(404).json({
        error: 'Block not found'
      });
    }

    // Enrich transaction data
    const enrichedTransactions = block.transactions.map(tx => {
      let from = 'Unknown';
      let to = 'Unknown';
      let amount = 0;

      if (tx.inputs && tx.inputs.length > 0) {
        from = tx.inputs[0].address || 'Multiple';
      }
      if (tx.outputs && tx.outputs.length > 0) {
        to = tx.outputs[0].address || 'Multiple';
        amount = tx.outputs[0].amount;
      }

      return {
        hash: tx.hash,
        from,
        to,
        amount,
        isCoinbase: tx.isCoinbase,
        isContractDeploy: tx.isContractDeploy,
        isContractCall: tx.isContractCall
      };
    });

    res.json({
      success: true,
      block: {
        index: block.index,
        hash: block.hash,
        previousHash: block.previousHash,
        timestamp: block.timestamp,
        nonce: block.nonce,
        difficulty: block.difficulty,
        merkleRoot: block.merkleRoot,
        miner: block.miner,
        reward: block.reward,
        totalFees: block.totalFees,
        transactionCount: block.transactionCount,
        transactions: enrichedTransactions,
        size: JSON.stringify(block).length
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get block',
      message: error.message
    });
  }
};

/**
 * Get transaction details
 */
exports.getTransaction = async (req, res) => {
  try {
    const { txHash } = req.params;

    // Check mempool first
    const mempoolTx = req.blockchain.mempool.getTransaction(txHash);
    if (mempoolTx) {
      const entry = req.blockchain.mempool.transactions.get(txHash);
      return res.json({
        success: true,
        transaction: mempoolTx,
        status: 'pending',
        priority: entry.priority,
        feeRate: entry.feeRate,
        position: req.blockchain.mempool.getTransactionPosition(txHash)
      });
    }

    // Search in blocks
    const block = await BlockModel.findOne({
      'transactions.hash': txHash
    });

    if (!block) {
      return res.status(404).json({
        error: 'Transaction not found'
      });
    }

    const tx = block.transactions.find(t => t.hash === txHash);

    res.json({
      success: true,
      transaction: tx,
      status: 'confirmed',
      blockIndex: block.index,
      blockHash: block.hash,
      confirmations: req.blockchain.chain.length - block.index,
      timestamp: tx.timestamp || block.timestamp
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get transaction',
      message: error.message
    });
  }
};

/**
 * Get address details and transaction history
 */
exports.getAddress = async (req, res) => {
  try {
    const { address } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Get balance
    const balance = req.blockchain.getBalance(address);

    // Get UTXOs
    const utxos = req.blockchain.getUTXOsForAddress(address);

    // Find transactions involving this address
    const blocks = await BlockModel.find({
      $or: [
        { 'transactions.inputs.address': address },
        { 'transactions.outputs.address': address },
        { 'transactions.from': address },
        { 'transactions.to': address },
        { miner: address }
      ]
    }).sort({ index: -1 });

    const transactions = [];
    let totalReceived = 0;
    let totalSent = 0;

    for (let block of blocks) {
      for (let tx of block.transactions) {
        let isInvolved = false;
        let type = 'unknown';
        let amount = 0;

        // Check if address is in inputs (sender)
        if (tx.inputs) {
          for (let input of tx.inputs) {
            if (input.address === address) {
              isInvolved = true;
              type = 'sent';
            }
          }
        }

        // Check if address is in outputs (receiver)
        if (tx.outputs) {
          for (let output of tx.outputs) {
            if (output.address === address) {
              isInvolved = true;
              if (type !== 'sent') type = 'received';
              amount += output.amount;
              totalReceived += output.amount;
            }
          }
        }

        // Check if address is miner (mining reward)
        if (tx.isCoinbase && tx.outputs && tx.outputs[0].address === address) {
          isInvolved = true;
          type = 'mining';
          amount = tx.outputs[0].amount;
        }

        if (type === 'sent') {
          const inputSum = tx.inputs.reduce((sum, input) => {
            if (input.address === address) {
              const utxoKey = `${input.txHash}:${input.outputIndex}`;
              // Find UTXO amount from previous transaction
              // For simplicity, we'll estimate
              return sum + (tx.outputs.reduce((s, o) => s + o.amount, 0) / tx.inputs.length);
            }
            return sum;
          }, 0);
          totalSent += inputSum;
        }

        if (isInvolved) {
          transactions.push({
            hash: tx.hash,
            blockIndex: block.index,
            timestamp: tx.timestamp || block.timestamp,
            type,
            amount,
            confirmations: req.blockchain.chain.length - block.index
          });
        }
      }
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    res.json({
      success: true,
      address,
      balance,
      utxoCount: utxos.length,
      transactionCount: transactions.length,
      totalReceived,
      totalSent,
      transactions: paginatedTransactions,
      pagination: {
        page,
        limit,
        total: transactions.length,
        pages: Math.ceil(transactions.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get address details',
      message: error.message
    });
  }
};

/**
 * Get recent blocks
 */
exports.getRecentBlocks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const blocks = await BlockModel.find()
      .sort({ index: -1 })
      .skip(skip)
      .limit(limit)
      .select('index hash timestamp miner reward transactionCount difficulty');

    const total = await BlockModel.countDocuments();

    res.json({
      success: true,
      blocks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get recent blocks',
      message: error.message
    });
  }
};

/**
 * Get rich list (top addresses by balance)
 */
exports.getRichList = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    // Calculate balances from UTXOs
    const balances = new Map();

    for (let [key, utxo] of req.blockchain.utxos) {
      if (utxo.address === 'GENESIS' || utxo.address === 'CONTRACT') {
        continue;
      }

      const current = balances.get(utxo.address) || 0;
      balances.set(utxo.address, current + utxo.amount);
    }

    // Sort by balance
    const sorted = Array.from(balances.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const richList = sorted.map(([address, balance], index) => ({
      rank: index + 1,
      address,
      balance,
      percentage: (balance / req.blockchain.getBalance('GENESIS') * 100).toFixed(2)
    }));

    res.json({
      success: true,
      richList,
      totalAddresses: balances.size
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get rich list',
      message: error.message
    });
  }
};

/**
 * Get mining statistics
 */
exports.getMiningStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    const blocks = await BlockModel.find({
      timestamp: { $gte: startTime }
    }).sort({ index: -1 });

    // Calculate stats per miner
    const minerStats = new Map();

    for (let block of blocks) {
      const miner = block.miner;
      const stats = minerStats.get(miner) || {
        address: miner,
        blocks: 0,
        totalReward: 0,
        totalFees: 0
      };

      stats.blocks++;
      stats.totalReward += block.reward || 0;
      stats.totalFees += block.totalFees || 0;

      minerStats.set(miner, stats);
    }

    // Sort by blocks mined
    const sortedMiners = Array.from(minerStats.values())
      .sort((a, b) => b.blocks - a.blocks);

    // Calculate network stats
    const totalBlocks = blocks.length;
    const totalRewards = blocks.reduce((sum, b) => sum + (b.reward || 0), 0);
    const avgBlockTime = blocks.length > 1
      ? (blocks[0].timestamp - blocks[blocks.length - 1].timestamp) / blocks.length
      : 0;

    res.json({
      success: true,
      period: `${days} days`,
      totalBlocks,
      totalRewards,
      avgBlockTime,
      uniqueMiners: minerStats.size,
      miners: sortedMiners
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get mining stats',
      message: error.message
    });
  }
};

/**
 * Get blockchain charts data
 */
exports.getCharts = async (req, res) => {
  try {
    const { type } = req.params; // difficulty, hashrate, transactions, supply
    const days = parseInt(req.query.days) || 30;
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    const blocks = await BlockModel.find({
      timestamp: { $gte: startTime }
    }).sort({ index: 1 });

    const dataPoints = [];

    if (type === 'difficulty') {
      // Group by day
      const dayGroups = new Map();
      for (let block of blocks) {
        const day = new Date(block.timestamp).toISOString().split('T')[0];
        if (!dayGroups.has(day)) {
          dayGroups.set(day, []);
        }
        dayGroups.get(day).push(block.difficulty);
      }

      for (let [day, difficulties] of dayGroups) {
        const avgDifficulty = difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
        dataPoints.push({
          date: day,
          value: avgDifficulty
        });
      }
    } else if (type === 'transactions') {
      const dayGroups = new Map();
      for (let block of blocks) {
        const day = new Date(block.timestamp).toISOString().split('T')[0];
        const count = dayGroups.get(day) || 0;
        dayGroups.set(day, count + (block.transactionCount || 0));
      }

      for (let [day, count] of dayGroups) {
        dataPoints.push({
          date: day,
          value: count
        });
      }
    }

    res.json({
      success: true,
      type,
      period: `${days} days`,
      dataPoints
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get chart data',
      message: error.message
    });
  }
};
