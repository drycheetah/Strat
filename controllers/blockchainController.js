const BlockModel = require('../models/Block');
const Wallet = require('../models/Wallet');
const logger = require('../utils/logger');

/**
 * Get blockchain statistics
 */
const getStats = async (req, res) => {
  try {
    const blockchain = req.blockchain;

    const blockCount = await BlockModel.countDocuments();
    const latestBlock = await BlockModel.findOne().sort({ index: -1 });

    let totalSupply = 0;
    for (let [key, utxo] of blockchain.utxos) {
      totalSupply += utxo.amount;
    }

    const pendingTxCount = blockchain.pendingTransactions.length;

    // Calculate hash rate from last block
    let hashRate = 0;
    if (latestBlock && blockCount > 1) {
      const previousBlock = await BlockModel.findOne({ index: latestBlock.index - 1 });
      if (previousBlock) {
        const timeDiff = (latestBlock.timestamp - previousBlock.timestamp) / 1000;
        if (timeDiff > 0) {
          hashRate = Math.round(latestBlock.nonce / timeDiff);
        }
      }
    }

    res.json({
      success: true,
      stats: {
        blockHeight: blockCount,
        latestBlockHash: latestBlock?.hash || null,
        difficulty: blockchain.difficulty,
        miningReward: blockchain.miningReward,
        transactionFee: blockchain.transactionFee,
        pendingTransactions: pendingTxCount,
        totalSupply,
        hashRate,
        networkHashrate: hashRate,
        averageBlockTime: blockchain.blockTime
      }
    });
  } catch (error) {
    logger.error(`Get stats error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message
    });
  }
};

/**
 * Get all blocks (paginated)
 */
const getBlocks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const blocks = await BlockModel.find()
      .sort({ index: -1 })
      .skip(skip)
      .limit(limit)
      .select('-transactions.inputs.signature');

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
    logger.error(`Get blocks error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get blocks',
      message: error.message
    });
  }
};

/**
 * Get specific block by index or hash
 */
const getBlock = async (req, res) => {
  try {
    const { id } = req.params;

    let block;
    if (/^\d+$/.test(id)) {
      // Query by index
      block = await BlockModel.findOne({ index: parseInt(id) });
    } else {
      // Query by hash
      block = await BlockModel.findOne({ hash: id });
    }

    if (!block) {
      return res.status(404).json({
        error: 'Block not found'
      });
    }

    res.json({
      success: true,
      block
    });
  } catch (error) {
    logger.error(`Get block error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get block',
      message: error.message
    });
  }
};

/**
 * Get latest block
 */
const getLatestBlock = async (req, res) => {
  try {
    const block = await BlockModel.findOne().sort({ index: -1 });

    if (!block) {
      return res.status(404).json({
        error: 'No blocks found'
      });
    }

    res.json({
      success: true,
      block
    });
  } catch (error) {
    logger.error(`Get latest block error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get latest block',
      message: error.message
    });
  }
};

/**
 * Mine new block (authenticated users only)
 */
const mineBlock = async (req, res) => {
  try {
    const blockchain = req.blockchain;

    // Get user's primary wallet
    const wallet = await Wallet.findById(req.user.primaryWallet);
    if (!wallet) {
      return res.status(400).json({
        error: 'No wallet found',
        message: 'Please create a wallet first'
      });
    }

    logger.info(`Mining started by user ${req.user.email} to wallet ${wallet.address}`);

    // Mine block in background (this can take time)
    setImmediate(async () => {
      try {
        const block = blockchain.minePendingTransactions(wallet.address);

        // Save block to database
        const blockDoc = new BlockModel({
          index: block.index,
          timestamp: block.timestamp,
          transactions: block.transactions,
          previousHash: block.previousHash,
          hash: block.hash,
          nonce: block.nonce,
          difficulty: block.difficulty,
          merkleRoot: block.merkleRoot,
          miner: wallet.address,
          reward: blockchain.miningReward,
          totalFees: block.transactions.reduce((sum, tx) => {
            if (!tx.isCoinbase && !tx.isContractDeploy && !tx.isContractCall) {
              const inputSum = blockchain.calculateInputSum(tx);
              const outputSum = blockchain.calculateOutputSum(tx);
              return sum + (inputSum - outputSum);
            }
            return sum;
          }, 0),
          transactionCount: block.transactions.length
        });

        await blockDoc.save();

        // Update wallet balance
        await wallet.updateBalance(blockchain);

        // Broadcast to P2P network
        if (req.p2pServer) {
          req.p2pServer.broadcastNewBlock(block);
        }

        // Emit WebSocket event
        if (req.io) {
          req.io.emit('new_block', {
            block: blockDoc,
            miner: wallet.address
          });
        }

        logger.info(`Block ${block.index} mined successfully by ${wallet.address}`);
      } catch (error) {
        logger.error(`Mining error: ${error.message}`);
      }
    });

    res.json({
      success: true,
      message: 'Mining started',
      minerAddress: wallet.address,
      pendingTransactions: blockchain.pendingTransactions.length
    });
  } catch (error) {
    logger.error(`Mine block error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to start mining',
      message: error.message
    });
  }
};

/**
 * Validate blockchain integrity
 */
const validateChain = async (req, res) => {
  try {
    const blockchain = req.blockchain;
    const isValid = blockchain.isChainValid();

    const blockCount = await BlockModel.countDocuments();

    res.json({
      success: true,
      valid: isValid,
      message: isValid ? 'Blockchain is valid' : 'Blockchain integrity compromised',
      blockCount,
      chainLength: blockchain.chain.length
    });
  } catch (error) {
    logger.error(`Validate chain error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to validate chain',
      message: error.message
    });
  }
};

/**
 * Get address information
 */
const getAddress = async (req, res) => {
  try {
    const { address } = req.params;
    const blockchain = req.blockchain;

    const balance = blockchain.getBalance(address);
    const utxos = blockchain.getUTXOsForAddress(address);

    // Get transaction history from blocks
    const blocks = await BlockModel.find({
      'transactions.outputs.address': address
    }).select('index timestamp transactions hash');

    const transactions = [];
    for (let block of blocks) {
      for (let tx of block.transactions) {
        let isRelevant = false;
        let type = null;
        let amount = 0;

        if (tx.isCoinbase && tx.outputs[0].address === address) {
          isRelevant = true;
          type = 'mining_reward';
          amount = tx.outputs[0].amount;
        } else {
          // Check outputs
          for (let output of tx.outputs) {
            if (output.address === address) {
              isRelevant = true;
              type = type === 'sent' ? 'sent' : 'received';
              amount += output.amount;
            }
          }
        }

        if (isRelevant) {
          transactions.push({
            hash: tx.hash,
            type,
            amount,
            timestamp: block.timestamp,
            blockIndex: block.index,
            blockHash: block.hash,
            confirmations: (await BlockModel.countDocuments()) - block.index
          });
        }
      }
    }

    res.json({
      success: true,
      address,
      balance,
      utxoCount: utxos.length,
      transactionCount: transactions.length,
      transactions: transactions.sort((a, b) => b.timestamp - a.timestamp)
    });
  } catch (error) {
    logger.error(`Get address error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get address information',
      message: error.message
    });
  }
};

/**
 * Search for transaction by hash
 */
const getTransaction = async (req, res) => {
  try {
    const { hash } = req.params;

    const block = await BlockModel.findOne({
      'transactions.hash': hash
    });

    if (!block) {
      return res.status(404).json({
        error: 'Transaction not found'
      });
    }

    const transaction = block.transactions.find(tx => tx.hash === hash);
    const blockCount = await BlockModel.countDocuments();

    res.json({
      success: true,
      transaction,
      block: {
        index: block.index,
        hash: block.hash,
        timestamp: block.timestamp,
        confirmations: blockCount - block.index
      }
    });
  } catch (error) {
    logger.error(`Get transaction error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get transaction',
      message: error.message
    });
  }
};

/**
 * Get pending transactions
 */
const getPendingTransactions = async (req, res) => {
  try {
    const blockchain = req.blockchain;

    res.json({
      success: true,
      transactions: blockchain.pendingTransactions,
      count: blockchain.pendingTransactions.length
    });
  } catch (error) {
    logger.error(`Get pending transactions error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get pending transactions',
      message: error.message
    });
  }
};

module.exports = {
  getStats,
  getBlocks,
  getBlock,
  getLatestBlock,
  mineBlock,
  validateChain,
  getAddress,
  getTransaction,
  getPendingTransactions
};
