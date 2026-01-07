const mongoose = require('mongoose');
const crypto = require('crypto');

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  referred: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  referralLink: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date
  },
  activatedAt: {
    type: Date
  },
  rewards: {
    referrerReward: {
      type: Number,
      default: 0
    },
    referredReward: {
      type: Number,
      default: 0
    },
    rewardType: {
      type: String,
      enum: ['tokens', 'discount', 'points', 'both'],
      default: 'tokens'
    },
    rewardAmount: {
      type: Number,
      default: 100 // Default reward in tokens or points
    },
    referredRewardAmount: {
      type: Number,
      default: 50 // Reward for referred user
    },
    claimed: {
      type: Boolean,
      default: false
    },
    claimedAt: {
      type: Date
    }
  },
  stats: {
    conversions: {
      type: Number,
      default: 0,
      min: 0
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0
    },
    signups: {
      type: Number,
      default: 0,
      min: 0
    },
    firstPurchase: {
      type: Boolean,
      default: false
    }
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    utm_source: String,
    utm_medium: String,
    utm_campaign: String
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
  }
}, {
  timestamps: true
});

// Index for queries
referralSchema.index({ referrer: 1, status: 1 });
referralSchema.index({ referred: 1, status: 1 });
referralSchema.index({ referrer: 1, createdAt: -1 });
referralSchema.index({ status: 1, createdAt: -1 });
referralSchema.index({ expiresAt: 1 });

/**
 * Generate unique referral code
 */
referralSchema.statics.generateReferralCode = function(userId) {
  const hash = crypto.createHash('md5').update(userId + Date.now() + Math.random()).digest('hex');
  return hash.substring(0, 12).toUpperCase();
};

/**
 * Create referral code for user
 */
referralSchema.statics.createReferralCode = async function(userId, baseUrl = 'https://strat.io') {
  let code;
  let exists = true;

  // Generate unique code
  while (exists) {
    code = this.generateReferralCode(userId);
    exists = await this.findOne({ referralCode: code });
  }

  const referralLink = `${baseUrl}/?ref=${code}`;

  const referral = new this({
    referrer: userId,
    referralCode: code,
    referralLink
  });

  await referral.save();
  return referral;
};

/**
 * Get referral by code
 */
referralSchema.statics.getReferralByCode = async function(code) {
  return await this.findOne({ referralCode: code })
    .populate('referrer', 'username email')
    .lean();
};

/**
 * Activate referral when referred user signs up
 */
referralSchema.methods.activate = async function(referredUserId) {
  this.referred = referredUserId;
  this.status = 'active';
  this.activatedAt = new Date();
  this.stats.signups += 1;
  await this.save();
  return this;
};

/**
 * Complete referral and claim rewards
 */
referralSchema.methods.complete = async function() {
  if (this.status !== 'active') {
    throw new Error('Referral must be active to complete');
  }

  this.status = 'completed';
  this.completedAt = new Date();
  this.stats.conversions += 1;
  this.stats.firstPurchase = true;

  // Mark rewards as claimable
  this.rewards.claimed = false;
  await this.save();
  return this;
};

/**
 * Claim rewards for referral
 */
referralSchema.methods.claimRewards = async function() {
  if (this.status !== 'completed') {
    throw new Error('Referral must be completed to claim rewards');
  }

  if (this.rewards.claimed) {
    throw new Error('Rewards already claimed');
  }

  this.rewards.claimed = true;
  this.rewards.claimedAt = new Date();
  await this.save();
  return this.rewards;
};

/**
 * Get referrer's statistics
 */
referralSchema.statics.getReferrerStats = async function(userId) {
  const referrals = await this.find({ referrer: userId });

  const stats = {
    totalReferrals: referrals.length,
    activeReferrals: referrals.filter(r => r.status === 'active').length,
    completedReferrals: referrals.filter(r => r.status === 'completed').length,
    pendingReferrals: referrals.filter(r => r.status === 'pending').length,
    totalClicks: referrals.reduce((sum, r) => sum + r.stats.clicks, 0),
    totalSignups: referrals.reduce((sum, r) => sum + r.stats.signups, 0),
    totalRewardsEarned: referrals.reduce((sum, r) => sum + r.rewards.referrerReward, 0),
    unclaimed: referrals.filter(r => r.status === 'completed' && !r.rewards.claimed).length
  };

  return stats;
};

/**
 * Get leaderboard by referral count
 */
referralSchema.statics.getReferralLeaderboard = async function(limit = 10) {
  return await this.aggregate([
    { $match: { status: { $in: ['active', 'completed'] } } },
    { $group: {
        _id: '$referrer',
        totalReferrals: { $sum: 1 },
        completedReferrals: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalRewards: { $sum: '$rewards.referrerReward' },
        lastReferral: { $max: '$createdAt' }
      }
    },
    { $sort: { completedReferrals: -1, totalReferrals: -1 } },
    { $limit: limit },
    { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: '$userInfo' },
    { $project: {
        _id: 1,
        username: '$userInfo.username',
        email: '$userInfo.email',
        totalReferrals: 1,
        completedReferrals: 1,
        totalRewards: 1,
        lastReferral: 1
      }
    }
  ]);
};

/**
 * Track referral click
 */
referralSchema.methods.trackClick = async function(ipAddress, userAgent) {
  this.stats.clicks += 1;
  this.metadata.ipAddress = ipAddress;
  this.metadata.userAgent = userAgent;
  await this.save();
  return this.stats;
};

module.exports = mongoose.model('Referral', referralSchema);
