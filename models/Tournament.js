const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  tournamentId: {
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
  description: String,
  organizer: {
    type: String,
    required: true,
    index: true
  },
  format: {
    type: String,
    enum: ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS', 'BATTLE_ROYALE', 'LEAGUE'],
    default: 'SINGLE_ELIMINATION'
  },
  maxParticipants: {
    type: Number,
    required: true
  },
  minParticipants: {
    type: Number,
    default: 2
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  participants: [{
    address: {
      type: String,
      required: true
    },
    username: String,
    seed: Number,
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    score: {
      type: Number,
      default: 0
    },
    eliminated: {
      type: Boolean,
      default: false
    },
    finalRank: Number,
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  entryFee: {
    type: Number,
    required: true
  },
  prizePool: {
    total: {
      type: Number,
      default: 0
    },
    distribution: [{
      rank: Number,
      percentage: Number,
      amount: Number
    }]
  },
  rounds: [{
    roundNumber: Number,
    name: String,
    matches: [{
      matchNumber: Number,
      sessionId: String,
      player1: String,
      player2: String,
      winner: String,
      score: String,
      completedAt: Date
    }],
    startedAt: Date,
    completedAt: Date
  }],
  currentRound: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['REGISTRATION', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'REGISTRATION',
    index: true
  },
  schedule: {
    registrationStart: {
      type: Date,
      required: true
    },
    registrationEnd: {
      type: Date,
      required: true
    },
    tournamentStart: {
      type: Date,
      required: true
    },
    tournamentEnd: Date
  },
  rules: {
    type: String,
    required: true
  },
  requirements: {
    minLevel: Number,
    minRating: Number,
    requiredAssets: [String],
    requiredAchievements: [String]
  },
  rewards: {
    nfts: [{
      rank: Number,
      nftId: String,
      name: String,
      rarity: String
    }],
    achievements: [{
      achievementId: String,
      name: String,
      forRank: Number
    }],
    titles: [{
      rank: Number,
      title: String
    }]
  },
  sponsors: [{
    name: String,
    address: String,
    contribution: Number,
    logo: String
  }],
  streaming: {
    enabled: Boolean,
    platforms: [{
      name: String,
      url: String
    }],
    officialChannel: String
  },
  statistics: {
    totalMatches: {
      type: Number,
      default: 0
    },
    completedMatches: {
      type: Number,
      default: 0
    },
    totalPrizePaid: {
      type: Number,
      default: 0
    },
    totalViewers: {
      type: Number,
      default: 0
    }
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

tournamentSchema.index({ gameId: 1, status: 1, 'schedule.registrationStart': -1 });
tournamentSchema.index({ 'participants.address': 1 });

module.exports = mongoose.model('Tournament', tournamentSchema);
