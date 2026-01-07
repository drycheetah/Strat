/**
 * Staking Controller
 * Handles staking operations for STRAT tokens
 */

const Stake = require('../models/Stake');
const Wallet = require('../models/Wallet');
const { Transaction } = require('../src/transaction');

// Minimum stake amount
const MIN_STAKE_AMOUNT = 1;

// Lock period tiers (in blocks)
const LOCK_PERIODS = {
  short: { blocks: 1000, apy: 3.0 },   // ~1.9 days
  medium: { blocks: 5000, apy: 5.0 },  // ~9.5 days
  long: { blocks: 10000, apy: 8.0 },   // ~19 days
  extended: { blocks: 25000, apy: 12.0 } // ~47.6 days
};

/**
 * Create a new stake
 */
exports.createStake = async (req, res) => {
  try {
    const { address, amount, lockPeriod } = req.body;

    if (!address || !amount || !lockPeriod) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide address, amount, and lockPeriod'
      });
    }

    // Validate amount
    if (amount < MIN_STAKE_AMOUNT) {
      return res.status(400).json({
        error: 'Amount too low',
        message: `Minimum stake amount is ${MIN_STAKE_AMOUNT} STRAT`
      });
    }

    // Validate lock period
    if (!LOCK_PERIODS[lockPeriod]) {
      return res.status(400).json({
        error: 'Invalid lock period',
        message: `Valid lock periods: ${Object.keys(LOCK_PERIODS).join(', ')}`
      });
    }

    // Get wallet
    const wallet = await Wallet.findOne({ address });
    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Check balance
    const balance = req.blockchain.getBalance(address);
    if (balance < amount) {
      return res.status(400).json({
        error: 'Insufficient balance',
        balance,
        requested: amount
      });
    }

    const lockConfig = LOCK_PERIODS[lockPeriod];
    const currentBlock = req.blockchain.chain.length;
    const unlockBlock = currentBlock + lockConfig.blocks;

    // Create stake
    const stake = new Stake({
      address,
      amount,
      startBlock: currentBlock,
      lockPeriod: lockConfig.blocks,
      unlockBlock,
      apy: lockConfig.apy,
      status: 'active',
      lastRewardBlock: currentBlock
    });

    await stake.save();

    // Lock tokens by updating wallet
    wallet.stakedBalance = (wallet.stakedBalance || 0) + amount;
    await wallet.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.to(`address:${address}`).emit('stake_created', {
        address,
        amount,
        unlockBlock,
        apy: lockConfig.apy
      });
    }

    res.json({
      success: true,
      message: 'Stake created successfully',
      stake: {
        id: stake._id,
        amount: stake.amount,
        apy: stake.apy,
        unlockBlock: stake.unlockBlock,
        estimatedReward: (amount * (lockConfig.apy / 100) * (lockConfig.blocks / 5256000)).toFixed(4)
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to create stake',
      message: error.message
    });
  }
};

/**
 * Get stakes for an address
 */
exports.getAddressStakes = async (req, res) => {
  try {
    const { address } = req.params;
    const status = req.query.status || 'all';

    let query = { address };
    if (status !== 'all') {
      query.status = status;
    }

    const stakes = await Stake.find(query).sort({ createdAt: -1 });
    const currentBlock = req.blockchain.chain.length;

    const enriched = stakes.map(stake => ({
      id: stake._id,
      amount: stake.amount,
      apy: stake.apy,
      status: stake.status,
      startBlock: stake.startBlock,
      unlockBlock: stake.unlockBlock,
      currentBlock,
      blocksRemaining: Math.max(0, stake.unlockBlock - currentBlock),
      canUnlock: stake.canUnlock(currentBlock),
      pendingRewards: stake.calculateRewards(currentBlock),
      totalRewards: stake.rewardsEarned + stake.calculateRewards(currentBlock),
      createdAt: stake.createdAt
    }));

    // Get stats
    const stats = await Stake.getAddressStats(address, currentBlock);

    res.json({
      success: true,
      address,
      stats,
      stakes: enriched
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get stakes',
      message: error.message
    });
  }
};

/**
 * Unlock a stake
 */
exports.unlockStake = async (req, res) => {
  try {
    const { stakeId } = req.params;

    const stake = await Stake.findById(stakeId);
    if (!stake) {
      return res.status(404).json({
        error: 'Stake not found'
      });
    }

    if (stake.status !== 'active') {
      return res.status(400).json({
        error: 'Stake is not active',
        status: stake.status
      });
    }

    const currentBlock = req.blockchain.chain.length;
    if (!stake.canUnlock(currentBlock)) {
      return res.status(400).json({
        error: 'Stake is still locked',
        unlockBlock: stake.unlockBlock,
        currentBlock,
        blocksRemaining: stake.unlockBlock - currentBlock
      });
    }

    // Calculate final rewards
    const pendingRewards = stake.calculateRewards(currentBlock);
    stake.rewardsEarned += pendingRewards;
    stake.status = 'unlocked';
    stake.unlockedAt = new Date();

    await stake.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.to(`address:${stake.address}`).emit('stake_unlocked', {
        stakeId: stake._id,
        amount: stake.amount,
        rewards: stake.rewardsEarned
      });
    }

    res.json({
      success: true,
      message: 'Stake unlocked successfully',
      stake: {
        id: stake._id,
        amount: stake.amount,
        rewards: stake.rewardsEarned,
        totalReturn: stake.amount + stake.rewardsEarned
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to unlock stake',
      message: error.message
    });
  }
};

/**
 * Withdraw an unlocked stake
 */
exports.withdrawStake = async (req, res) => {
  try {
    const { stakeId } = req.params;

    const stake = await Stake.findById(stakeId);
    if (!stake) {
      return res.status(404).json({
        error: 'Stake not found'
      });
    }

    if (stake.status !== 'unlocked') {
      return res.status(400).json({
        error: 'Stake must be unlocked before withdrawal',
        status: stake.status
      });
    }

    // Get wallet
    const wallet = await Wallet.findOne({ address: stake.address });
    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Return staked tokens + rewards
    const totalReturn = stake.amount + stake.rewardsEarned;
    wallet.stakedBalance = Math.max(0, (wallet.stakedBalance || 0) - stake.amount);
    wallet.balance += totalReturn;

    await wallet.save();

    // Mark stake as withdrawn
    stake.status = 'withdrawn';
    stake.withdrawnAt = new Date();
    await stake.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.to(`address:${stake.address}`).emit('stake_withdrawn', {
        stakeId: stake._id,
        totalReturn
      });

      req.io.to(`address:${stake.address}`).emit('address_balance', {
        address: stake.address,
        balance: wallet.balance
      });
    }

    res.json({
      success: true,
      message: 'Stake withdrawn successfully',
      withdrawal: {
        principal: stake.amount,
        rewards: stake.rewardsEarned,
        total: totalReturn,
        newBalance: wallet.balance
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to withdraw stake',
      message: error.message
    });
  }
};

/**
 * Claim rewards without withdrawing stake
 */
exports.claimRewards = async (req, res) => {
  try {
    const { stakeId } = req.params;

    const stake = await Stake.findById(stakeId);
    if (!stake) {
      return res.status(404).json({
        error: 'Stake not found'
      });
    }

    if (stake.status !== 'active') {
      return res.status(400).json({
        error: 'Stake is not active',
        status: stake.status
      });
    }

    const currentBlock = req.blockchain.chain.length;
    const pendingRewards = stake.calculateRewards(currentBlock);

    if (pendingRewards <= 0) {
      return res.status(400).json({
        error: 'No rewards to claim',
        pendingRewards: 0
      });
    }

    // Get wallet
    const wallet = await Wallet.findOne({ address: stake.address });
    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Credit rewards to wallet
    wallet.balance += pendingRewards;
    await wallet.save();

    // Update stake
    stake.rewardsEarned += pendingRewards;
    stake.lastRewardBlock = currentBlock;
    await stake.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.to(`address:${stake.address}`).emit('rewards_claimed', {
        stakeId: stake._id,
        amount: pendingRewards
      });

      req.io.to(`address:${stake.address}`).emit('address_balance', {
        address: stake.address,
        balance: wallet.balance
      });
    }

    res.json({
      success: true,
      message: 'Rewards claimed successfully',
      rewards: pendingRewards,
      newBalance: wallet.balance
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to claim rewards',
      message: error.message
    });
  }
};

/**
 * Get global staking statistics
 */
exports.getGlobalStats = async (req, res) => {
  try {
    const currentBlock = req.blockchain.chain.length;
    const stats = await Stake.getGlobalStats(currentBlock);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get global stats',
      message: error.message
    });
  }
};

/**
 * Get staking info (lock periods and APYs)
 */
exports.getStakingInfo = (req, res) => {
  res.json({
    success: true,
    minStakeAmount: MIN_STAKE_AMOUNT,
    lockPeriods: Object.entries(LOCK_PERIODS).map(([name, config]) => ({
      name,
      blocks: config.blocks,
      apy: config.apy,
      estimatedDays: (config.blocks / 525.6).toFixed(1) // Assuming ~10 blocks/min
    }))
  });
};

/**
 * Get top stakers leaderboard
 */
exports.getTopStakers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Aggregate stakes by address to get total staked and rewards per address
    const topStakers = await Stake.aggregate([
      {
        $match: {
          status: { $in: ['active', 'unlocked'] }
        }
      },
      {
        $group: {
          _id: '$address',
          totalStaked: { $sum: '$amount' },
          totalRewards: { $sum: '$rewards' },
          stakeCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalStaked: -1 }
      },
      {
        $limit: limit
      },
      {
        $project: {
          _id: 0,
          address: '$_id',
          staked: '$totalStaked',
          rewards: '$totalRewards',
          stakeCount: 1
        }
      }
    ]);

    res.json({
      success: true,
      stakers: topStakers,
      count: topStakers.length
    });
  } catch (error) {
    console.error('Get top stakers error:', error);
    res.status(500).json({
      error: 'Failed to get top stakers',
      message: error.message
    });
  }
};
