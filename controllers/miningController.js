const Wallet = require('../models/Wallet');
const BlockModel = require('../models/Block');
const { Transaction } = require('../src/transaction');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Helper function to calculate merkle root
function calculateMerkleRoot(transactions) {
  if (transactions.length === 0) return '';

  let hashes = transactions.map(tx =>
    tx.hash || crypto.createHash('sha256').update(JSON.stringify(tx)).digest('hex')
  );

  while (hashes.length > 1) {
    if (hashes.length % 2 !== 0) {
      hashes.push(hashes[hashes.length - 1]);
    }

    const newHashes = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const combined = hashes[i] + hashes[i + 1];
      newHashes.push(crypto.createHash('sha256').update(combined).digest('hex'));
    }
    hashes = newHashes;
  }

  return hashes[0];
}

/**
 * Get mining work for standalone miners
 */
exports.getMiningWork = async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        error: 'Miner address required',
        message: 'Please provide your wallet address in the query parameter: ?address=YOUR_ADDRESS'
      });
    }

    const blockchain = req.blockchain;

    // Get the latest block
    const latestBlock = blockchain.chain[blockchain.chain.length - 1];

    // Get pending transactions
    const pendingTxs = blockchain.pendingTransactions.slice(0, 10);

    // Prepare mining work
    const block = {
      index: blockchain.chain.length,
      timestamp: Date.now(),
      transactions: pendingTxs,
      previousHash: latestBlock.hash,
      difficulty: blockchain.difficulty,
      merkleRoot: calculateMerkleRoot(pendingTxs),
      miner: address
    };

    res.json({
      success: true,
      block,
      difficulty: blockchain.difficulty,
      reward: blockchain.miningReward,
      pendingTransactions: blockchain.pendingTransactions.length,
      message: 'Start mining with the provided block data'
    });

  } catch (error) {
    logger.error(`Get mining work error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get mining work',
      message: error.message
    });
  }
};

/**
 * Submit a mined block
 */
exports.submitBlock = async (req, res) => {
  try {
    const { minerAddress, nonce, hash, block: minedBlock } = req.body;

    if (!minerAddress || nonce === undefined || !hash) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide minerAddress, nonce, hash, and block'
      });
    }

    const blockchain = req.blockchain;

    // Verify the hash meets difficulty requirement
    const prefix = '0'.repeat(blockchain.difficulty);
    if (!hash.startsWith(prefix)) {
      return res.status(400).json({
        error: 'Invalid proof of work',
        message: `Hash must start with ${blockchain.difficulty} zeros`
      });
    }

    // Verify hash calculation
    const dataToHash = minedBlock.index + minedBlock.timestamp +
                      JSON.stringify(minedBlock.transactions) +
                      minedBlock.previousHash + nonce +
                      minedBlock.difficulty + minedBlock.merkleRoot;
    const calculatedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    if (calculatedHash !== hash) {
      return res.status(400).json({
        error: 'Invalid hash',
        message: 'Hash does not match block data'
      });
    }

    // Get or create miner wallet
    let wallet = await Wallet.findOne({ address: minerAddress });
    if (!wallet) {
      // Create wallet for new miner
      wallet = new Wallet({
        address: minerAddress,
        balance: 0,
        publicKey: minerAddress, // External miners manage their own keys
        encryptedPrivateKey: 'EXTERNAL_MINER' // Placeholder
      });
      await wallet.save();
    }

    // Create the block object
    const block = {
      index: minedBlock.index,
      timestamp: minedBlock.timestamp,
      transactions: minedBlock.transactions || [],
      previousHash: minedBlock.previousHash,
      hash: hash,
      nonce: nonce,
      difficulty: minedBlock.difficulty,
      merkleRoot: minedBlock.merkleRoot
    };

    // Check if block already exists (race condition protection)
    const existingBlock = await BlockModel.findOne({ index: block.index });
    if (existingBlock) {
      return res.status(409).json({
        error: 'Block already mined',
        message: `Block #${block.index} was already mined by another miner`,
        currentBlock: blockchain.chain.length
      });
    }

    // Check if this block is still valid (blockchain may have advanced)
    if (block.index !== blockchain.chain.length) {
      return res.status(410).json({
        error: 'Stale block',
        message: `Block #${block.index} is outdated. Current block: #${blockchain.chain.length}`,
        currentBlock: blockchain.chain.length
      });
    }

    // Save block to database first (atomic operation)
    try {
      const blockDoc = new BlockModel({
        index: block.index,
        timestamp: block.timestamp,
        transactions: block.transactions,
        previousHash: block.previousHash,
        hash: block.hash,
        nonce: block.nonce,
        difficulty: block.difficulty,
        merkleRoot: block.merkleRoot,
        miner: minerAddress,
        reward: blockchain.miningReward,
        totalFees: 0,
        transactionCount: block.transactions.length
      });
      await blockDoc.save();
    } catch (dbError) {
      // Another miner beat us to it
      if (dbError.code === 11000) {
        return res.status(409).json({
          error: 'Block already mined',
          message: `Block #${block.index} was already mined by another miner`,
          currentBlock: blockchain.chain.length
        });
      }
      throw dbError;
    }

    // Now update blockchain in memory
    blockchain.chain.push(block);

    // Update UTXOs
    blockchain.updateUTXOs(block);

    // Clear pending transactions that were included
    blockchain.pendingTransactions = [];

    // Update miner's wallet balance
    wallet.balance += blockchain.miningReward;
    await wallet.save();

    logger.info(`Block #${block.index} mined by external miner ${minerAddress}`);

    res.json({
      success: true,
      message: 'Block accepted!',
      block: {
        index: block.index,
        hash: block.hash,
        nonce: block.nonce
      },
      reward: blockchain.miningReward,
      newBalance: wallet.balance
    });

  } catch (error) {
    logger.error(`Submit block error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to submit block',
      message: error.message
    });
  }
};

/**
 * Get mining statistics
 */
exports.getMiningStats = async (req, res) => {
  try {
    const blockchain = req.blockchain;

    // Get total blocks mined in last 24 hours
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recentBlocks = await BlockModel.countDocuments({
      timestamp: { $gte: last24h }
    });

    // Calculate average block time
    const lastBlocks = await BlockModel.find()
      .sort({ index: -1 })
      .limit(100);

    let avgBlockTime = 0;
    if (lastBlocks.length > 1) {
      const timeDiff = lastBlocks[0].timestamp - lastBlocks[lastBlocks.length - 1].timestamp;
      avgBlockTime = Math.floor(timeDiff / lastBlocks.length / 1000); // in seconds
    }

    // Get network hashrate estimate
    // Hashrate = Difficulty * 2^32 / BlockTime
    const networkHashrate = Math.floor(
      (Math.pow(2, blockchain.difficulty) * 1000) / (avgBlockTime || 1)
    );

    res.json({
      success: true,
      stats: {
        difficulty: blockchain.difficulty,
        blockHeight: blockchain.chain.length,
        pendingTransactions: blockchain.pendingTransactions.length,
        miningReward: blockchain.miningReward,
        blocks24h: recentBlocks,
        avgBlockTime: avgBlockTime,
        networkHashrate: networkHashrate
      }
    });

  } catch (error) {
    logger.error(`Get mining stats error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get mining stats',
      message: error.message
    });
  }
};

/**
 * Get miner's earnings
 */
exports.getMinerEarnings = async (req, res) => {
  try {
    const { address } = req.params;

    // Get all blocks mined by this address
    const blocks = await BlockModel.find({ miner: address })
      .sort({ index: -1 })
      .limit(100);

    const totalBlocks = await BlockModel.countDocuments({ miner: address });

    const totalEarnings = blocks.reduce((sum, block) => sum + block.reward, 0);

    // Get current wallet balance
    const wallet = await Wallet.findOne({ address });

    res.json({
      success: true,
      earnings: {
        totalBlocks,
        totalEarnings,
        currentBalance: wallet ? wallet.balance : 0,
        recentBlocks: blocks.slice(0, 10).map(b => ({
          index: b.index,
          timestamp: b.timestamp,
          reward: b.reward,
          hash: b.hash
        }))
      }
    });

  } catch (error) {
    logger.error(`Get miner earnings error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get earnings',
      message: error.message
    });
  }
};

module.exports = {
  getMiningWork: exports.getMiningWork,
  submitBlock: exports.submitBlock,
  getMiningStats: exports.getMiningStats,
  getMinerEarnings: exports.getMinerEarnings
};
