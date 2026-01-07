const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  leaderboardId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  gameId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['GLOBAL', 'DAILY', 'WEEKLY', 'MONTHLY', 'SEASONAL', 'TOURNAMENT', 'CUSTOM'],
    default: 'GLOBAL'
  },
  metric: {
    type: String,
    required: true,
    enum: ['SCORE', 'WINS', 'KILLS', 'EARNINGS', 'LEVEL', 'RATING', 'CUSTOM']
  },
  entries: [{
    rank: Number,
    previousRank: Number,
    address: {
      type: String,
      required: true
    },
    username: String,
    value: {
      type: Number,
      required: true
    },
    gamesPlayed: {
      type: Number,
      default: 0
    },
    winRate: Number,
    streak: {
      current: {
        type: Number,
        default: 0
      },
      best: {
        type: Number,
        default: 0
      }
    },
    avatar: String,
    badge: String,
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  period: {
    start: Date,
    end: Date
  },
  rewards: {
    enabled: {
      type: Boolean,
      default: true
    },
    distribution: [{
      minRank: Number,
      maxRank: Number,
      reward: Number,
      nfts: [{
        nftId: String,
        name: String,
        rarity: String
      }],
      achievements: [String],
      title: String
    }]
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'],
    default: 'ACTIVE',
    index: true
  },
  lastUpdate: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

leaderboardSchema.index({ gameId: 1, type: 1, status: 1 });
leaderboardSchema.index({ 'entries.address': 1 });
leaderboardSchema.index({ 'entries.rank': 1 });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
