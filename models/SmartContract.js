const mongoose = require('mongoose');

const smartContractSchema = new mongoose.Schema({
  // Contract identifiers
  address: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  // Deployment information
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deployerAddress: {
    type: String,
    required: true,
    index: true
  },
  deploymentTxHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Contract code and ABI
  bytecode: {
    type: String,
    required: true
  },
  abi: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  sourceCode: {
    type: String
  },

  // Deployment details
  deployedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  deploymentBlockNumber: {
    type: Number,
    required: true
  },
  gasUsed: {
    type: Number,
    required: true
  },
  gasPrice: {
    type: Number,
    required: true
  },
  transactionFee: {
    type: Number,
    required: true
  },

  // Contract verification
  verified: {
    type: Boolean,
    default: false,
    index: true
  },
  verificationDate: Date,
  verificationCompiler: String,
  verificationOptimized: Boolean,

  // Contract metadata
  description: {
    type: String,
    maxlength: 500
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },

  // Contract state
  balance: {
    type: Number,
    default: 0
  },
  state: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Statistics
  interactionCount: {
    type: Number,
    default: 0
  },
  lastInteraction: Date,
  creatorBalance: Number,

  // Relationships
  deploymentWallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet'
  },

  // Network information
  network: {
    type: String,
    default: 'mainnet',
    enum: ['mainnet', 'testnet', 'devnet']
  },

  // Additional metadata
  metadata: {
    compiler: String,
    compilerVersion: String,
    optimizations: {
      enabled: Boolean,
      runs: Number
    },
    constructorArgs: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for common queries
smartContractSchema.index({ owner: 1, deployedAt: -1 });
smartContractSchema.index({ verified: 1, deployedAt: -1 });
smartContractSchema.index({ deployerAddress: 1 });
smartContractSchema.index({ tags: 1 });
smartContractSchema.index({ isPublic: 1, verified: 1 });

// Virtual for deployment cost
smartContractSchema.virtual('deploymentCost').get(function() {
  return this.gasUsed * this.gasPrice;
});

// Method to verify contract
smartContractSchema.methods.verify = function(compilerVersion, optimized) {
  this.verified = true;
  this.verificationDate = new Date();
  this.verificationCompiler = compilerVersion;
  this.verificationOptimized = optimized;
  return this.save();
};

// Method to record interaction
smartContractSchema.methods.recordInteraction = async function() {
  this.interactionCount += 1;
  this.lastInteraction = new Date();
  return this.save();
};

// Method to update state
smartContractSchema.methods.updateState = async function(newState) {
  this.state = { ...this.state, ...newState };
  return this.save();
};

// Method to update balance
smartContractSchema.methods.updateBalance = async function(newBalance) {
  this.balance = newBalance;
  return this.save();
};

// Static method to find contracts by owner
smartContractSchema.statics.findByOwner = function(userId, filters = {}) {
  const query = { owner: userId };

  if (filters.verified !== undefined) {
    query.verified = filters.verified;
  }

  if (filters.network) {
    query.network = filters.network;
  }

  if (filters.isPublic !== undefined) {
    query.isPublic = filters.isPublic;
  }

  return this.find(query).sort({ deployedAt: -1 });
};

// Static method to find verified contracts
smartContractSchema.statics.findVerifiedContracts = function(filters = {}) {
  const query = { verified: true, isPublic: true };

  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }

  if (filters.network) {
    query.network = filters.network;
  }

  return this.find(query).sort({ interactionCount: -1 }).limit(filters.limit || 20);
};

// Static method to search contracts
smartContractSchema.statics.searchContracts = function(searchTerm, options = {}) {
  const query = {
    $text: { $search: searchTerm }
  };

  if (options.verified) {
    query.verified = true;
  }

  if (options.isPublic) {
    query.isPublic = true;
  }

  return this.find(query)
    .select('+score')
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

// Text index for search functionality
smartContractSchema.index({
  name: 'text',
  description: 'text',
  sourceCode: 'text',
  tags: 'text'
});

module.exports = mongoose.model('SmartContract', smartContractSchema);
