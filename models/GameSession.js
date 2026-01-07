const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  sessionId: {
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
  players: [{
    address: {
      type: String,
      required: true
    },
    username: String,
    team: String,
    score: {
      type: Number,
      default: 0
    },
    kills: {
      type: Number,
      default: 0
    },
    deaths: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 1
    },
    experience: {
      type: Number,
      default: 0
    },
    rewards: {
      type: Number,
      default: 0
    },
    nftsEarned: [{
      nftId: String,
      name: String,
      rarity: String
    }],
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date
  }],
  status: {
    type: String,
    enum: ['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ABANDONED'],
    default: 'WAITING',
    index: true
  },
  gameState: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  winner: {
    address: String,
    username: String,
    score: Number
  },
  prizePool: {
    type: Number,
    default: 0
  },
  entryFees: {
    type: Number,
    default: 0
  },
  totalRewards: {
    type: Number,
    default: 0
  },
  tournament: {
    tournamentId: String,
    round: Number,
    matchNumber: Number
  },
  replay: {
    enabled: {
      type: Boolean,
      default: true
    },
    replayId: String,
    duration: Number,
    fileSize: Number
  },
  antiCheat: {
    checks: [{
      timestamp: Date,
      checkType: String,
      result: String,
      details: mongoose.Schema.Types.Mixed
    }],
    violations: [{
      playerId: String,
      timestamp: Date,
      violationType: String,
      severity: String,
      action: String
    }]
  },
  rng: {
    seed: String,
    algorithm: {
      type: String,
      default: 'PROVABLY_FAIR'
    },
    verificationHash: String
  },
  startedAt: Date,
  endedAt: Date,
  duration: Number,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

gameSessionSchema.index({ gameId: 1, status: 1, createdAt: -1 });
gameSessionSchema.index({ 'players.address': 1, createdAt: -1 });
gameSessionSchema.index({ 'tournament.tournamentId': 1 });

module.exports = mongoose.model('GameSession', gameSessionSchema);
