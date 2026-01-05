const mongoose = require('mongoose');

const bridgeTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  walletAddress: {
    type: String,
    required: true
  },
  solanaSignature: {
    type: String,
    required: true,
    unique: true
  },
  solAmount: {
    type: Number,
    required: true
  },
  stratAmount: {
    type: Number,
    required: true
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes
bridgeTransactionSchema.index({ user: 1, createdAt: -1 });
bridgeTransactionSchema.index({ solanaSignature: 1 }, { unique: true });

module.exports = mongoose.model('BridgeTransaction', bridgeTransactionSchema);
