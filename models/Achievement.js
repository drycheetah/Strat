const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'first_transaction',
      'first_stake',
      'first_mining',
      'portfolio_milestone',
      'wallet_creator',
      'transaction_count',
      'staking_milestone',
      'trading_volume',
      'referral_milestone',
      'community_contributor'
    ],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  icon: {
    type: String, // URL to badge image
    default: null
  },
  badge: {
    name: String,
    color: String,
    rarity: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common'
    }
  },
  criteria: {
    type: String, // Description of how this achievement was earned
    required: true
  },
  points: {
    type: Number,
    default: 10,
    min: 0
  },
  rewards: {
    type: {
      type: String,
      enum: ['tokens', 'experience', 'badge', 'multiple'],
      default: 'badge'
    },
    amount: {
      type: Number,
      default: 0
    }
  },
  earnedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  visibility: {
    type: Boolean,
    default: true // Whether to show on profile
  },
  metadata: {
    transactionHash: String,
    blockNumber: Number,
    relatedData: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for user achievements
achievementSchema.index({ user: 1, earnedAt: -1 });
achievementSchema.index({ user: 1, type: 1 });
achievementSchema.index({ type: 1, earnedAt: -1 });

/**
 * Get all achievements for a user
 */
achievementSchema.statics.getUserAchievements = async function(userId) {
  return await this.find({ user: userId, visibility: true })
    .sort({ earnedAt: -1 })
    .lean();
};

/**
 * Get achievement by type
 */
achievementSchema.statics.getByType = async function(type) {
  return await this.findOne({ type }).lean();
};

/**
 * Get user achievement count
 */
achievementSchema.statics.getUserAchievementCount = async function(userId) {
  return await this.countDocuments({ user: userId, visibility: true });
};

/**
 * Get total points for user
 */
achievementSchema.statics.getUserTotalPoints = async function(userId) {
  const result = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), visibility: true } },
    { $group: { _id: null, totalPoints: { $sum: '$points' } } }
  ]);

  return result.length > 0 ? result[0].totalPoints : 0;
};

/**
 * Get leaderboard by points
 */
achievementSchema.statics.getPointsLeaderboard = async function(limit = 10) {
  return await this.aggregate([
    { $match: { visibility: true } },
    { $group: {
        _id: '$user',
        totalPoints: { $sum: '$points' },
        achievementCount: { $sum: 1 },
        lastAchievement: { $max: '$earnedAt' }
      }
    },
    { $sort: { totalPoints: -1 } },
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
        totalPoints: 1,
        achievementCount: 1,
        lastAchievement: 1
      }
    }
  ]);
};

/**
 * Check if user already has achievement
 */
achievementSchema.statics.hasUserAchievement = async function(userId, type) {
  return await this.findOne({ user: userId, type });
};

/**
 * Get achievement rarity distribution for user
 */
achievementSchema.statics.getUserAchievementBreakdown = async function(userId) {
  return await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), visibility: true } },
    { $group: {
        _id: '$badge.rarity',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Achievement', achievementSchema);
