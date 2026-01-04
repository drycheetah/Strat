const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  hash: { type: String, required: true, index: true },
  inputs: [{
    txHash: String,
    outputIndex: Number,
    signature: String
  }],
  outputs: [{
    address: String,
    amount: Number
  }],
  timestamp: { type: Number, default: Date.now },
  isCoinbase: { type: Boolean, default: false },
  isContractDeploy: { type: Boolean, default: false },
  isContractCall: { type: Boolean, default: false },
  contractCode: String,
  contractAddress: String,
  from: String,
  methodName: String,
  params: mongoose.Schema.Types.Mixed,
  gasLimit: Number,
  gasPrice: Number,
  gasUsed: Number
}, { _id: false });

const blockSchema = new mongoose.Schema({
  index: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  timestamp: {
    type: Number,
    required: true,
    index: true
  },
  transactions: [transactionSchema],
  previousHash: {
    type: String,
    required: true
  },
  hash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  nonce: {
    type: Number,
    required: true
  },
  difficulty: {
    type: Number,
    required: true
  },
  merkleRoot: {
    type: String,
    required: true
  },
  miner: {
    type: String,
    index: true
  },
  reward: Number,
  totalFees: Number,
  size: Number,
  transactionCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
blockSchema.index({ index: -1 });
blockSchema.index({ hash: 1 });
blockSchema.index({ timestamp: -1 });
blockSchema.index({ 'transactions.hash': 1 });

module.exports = mongoose.model('Block', blockSchema);
