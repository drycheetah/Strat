const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['CARD', 'RPG', 'RACING', 'CASINO', 'STRATEGY', 'CUSTOM']
  },
  description: {
    type: String,
    required: true
  },
  developer: {
    type: String,
    required: true,
    index: true
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  minPlayers: {
    type: Number,
    default: 1
  },
  maxPlayers: {
    type: Number,
    default: 1
  },
  entryFee: {
    type: Number,
    default: 0
  },
  prizePool: {
    type: Number,
    default: 0
  },
  rewardToken: {
    type: String,
    default: 'STRAT'
  },
  playToEarn: {
    enabled: {
      type: Boolean,
      default: true
    },
    rewardPerGame: {
      type: Number,
      default: 0
    },
    rewardPerWin: {
      type: Number,
      default: 0
    },
    rewardPerKill: {
      type: Number,
      default: 0
    },
    rewardPerLevel: {
      type: Number,
      default: 0
    }
  },
  nftIntegration: {
    enabled: {
      type: Boolean,
      default: true
    },
    assetTypes: [{
      type: String
    }],
    marketplace: {
      type: Boolean,
      default: true
    }
  },
  gameContract: {
    address: String,
    abi: String
  },
  metadata: {
    genre: String,
    rating: {
      type: Number,
      default: 0
    },
    totalPlays: {
      type: Number,
      default: 0
    },
    totalPlayers: {
      type: Number,
      default: 0
    },
    coverImage: String,
    screenshots: [String],
    trailer: String
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'BETA'],
    default: 'ACTIVE'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

gameSchema.index({ type: 1, status: 1 });
gameSchema.index({ developer: 1, createdAt: -1 });

module.exports = mongoose.model('Game', gameSchema);
