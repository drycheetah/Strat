/**
 * API Key Model
 * Enterprise API key management with permissions and analytics
 */

const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hashedKey: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  tier: {
    type: String,
    enum: ['free', 'basic', 'professional', 'enterprise', 'unlimited'],
    default: 'free'
  },
  permissions: [{
    type: String,
    enum: [
      'read:blockchain',
      'write:transactions',
      'read:wallet',
      'write:wallet',
      'read:contracts',
      'write:contracts',
      'read:mining',
      'write:mining',
      'read:staking',
      'write:staking',
      'read:governance',
      'write:governance',
      'read:nft',
      'write:nft',
      'admin'
    ]
  }],
  ipWhitelist: [{
    type: String
  }],
  allowedOrigins: [{
    type: String
  }],
  rateLimit: {
    requests: {
      type: Number,
      default: 100
    },
    period: {
      type: String,
      enum: ['second', 'minute', 'hour', 'day'],
      default: 'minute'
    }
  },
  quota: {
    daily: {
      type: Number,
      default: 10000
    },
    monthly: {
      type: Number,
      default: 300000
    }
  },
  usage: {
    totalRequests: {
      type: Number,
      default: 0
    },
    successfulRequests: {
      type: Number,
      default: 0
    },
    failedRequests: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date
    },
    dailyUsage: {
      type: Number,
      default: 0
    },
    monthlyUsage: {
      type: Number,
      default: 0
    },
    lastResetDaily: {
      type: Date,
      default: Date.now
    },
    lastResetMonthly: {
      type: Date,
      default: Date.now
    }
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'revoked', 'expired'],
    default: 'active'
  },
  expiresAt: {
    type: Date
  },
  lastRotated: {
    type: Date
  },
  rotationPolicy: {
    enabled: {
      type: Boolean,
      default: false
    },
    intervalDays: {
      type: Number,
      default: 90
    }
  },
  metadata: {
    type: Map,
    of: String
  },
  webhooks: [{
    event: {
      type: String,
      enum: ['quota_exceeded', 'rate_limit', 'key_rotated', 'key_expired']
    },
    url: String,
    secret: String
  }],
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'development'
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
}, {
  timestamps: true
});

// Indexes
apiKeySchema.index({ userId: 1, status: 1 });
apiKeySchema.index({ organizationId: 1 });
apiKeySchema.index({ expiresAt: 1 });
apiKeySchema.index({ 'usage.lastUsed': -1 });

// Methods
apiKeySchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

apiKeySchema.methods.isActive = function() {
  return this.status === 'active' && !this.isExpired();
};

apiKeySchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission) || this.permissions.includes('admin');
};

apiKeySchema.methods.isIpAllowed = function(ip) {
  if (!this.ipWhitelist || this.ipWhitelist.length === 0) {
    return true;
  }
  return this.ipWhitelist.includes(ip);
};

apiKeySchema.methods.isOriginAllowed = function(origin) {
  if (!this.allowedOrigins || this.allowedOrigins.length === 0) {
    return true;
  }
  return this.allowedOrigins.includes(origin);
};

apiKeySchema.methods.incrementUsage = function() {
  this.usage.totalRequests += 1;
  this.usage.lastUsed = new Date();

  // Reset daily usage if needed
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDaily);
  if (now.getDate() !== lastReset.getDate() ||
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear()) {
    this.usage.dailyUsage = 0;
    this.usage.lastResetDaily = now;
  }

  // Reset monthly usage if needed
  if (now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear()) {
    this.usage.monthlyUsage = 0;
    this.usage.lastResetMonthly = now;
  }

  this.usage.dailyUsage += 1;
  this.usage.monthlyUsage += 1;
};

apiKeySchema.methods.incrementSuccess = function() {
  this.usage.successfulRequests += 1;
};

apiKeySchema.methods.incrementFailure = function() {
  this.usage.failedRequests += 1;
};

apiKeySchema.methods.checkQuota = function() {
  if (this.tier === 'unlimited') {
    return { allowed: true };
  }

  const dailyExceeded = this.usage.dailyUsage >= this.quota.daily;
  const monthlyExceeded = this.usage.monthlyUsage >= this.quota.monthly;

  return {
    allowed: !dailyExceeded && !monthlyExceeded,
    dailyRemaining: Math.max(0, this.quota.daily - this.usage.dailyUsage),
    monthlyRemaining: Math.max(0, this.quota.monthly - this.usage.monthlyUsage),
    dailyExceeded,
    monthlyExceeded
  };
};

apiKeySchema.methods.needsRotation = function() {
  if (!this.rotationPolicy.enabled) {
    return false;
  }

  const lastRotation = this.lastRotated || this.createdAt;
  const daysSinceRotation = (Date.now() - lastRotation) / (1000 * 60 * 60 * 24);

  return daysSinceRotation >= this.rotationPolicy.intervalDays;
};

// Statics
apiKeySchema.statics.generateKey = function(prefix = 'strat') {
  const crypto = require('crypto');
  const random = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${random}`;
};

apiKeySchema.statics.hashKey = function(key) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(key).digest('hex');
};

apiKeySchema.statics.findByKey = async function(key) {
  const hashedKey = this.hashKey(key);
  return this.findOne({ hashedKey, status: 'active' });
};

// Pre-save middleware
apiKeySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey;
