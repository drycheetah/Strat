const mongoose = require('mongoose');

const priceAlertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true
  },
  pair: {
    type: String,
    required: true,
    index: true,
    default: 'STRAT/USD'
  },
  targetPrice: {
    type: Number,
    required: true,
    min: 0
  },
  condition: {
    type: String,
    enum: ['above', 'below', 'crosses_above', 'crosses_below'],
    required: true
  },
  message: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['active', 'triggered', 'cancelled', 'expired'],
    default: 'active',
    index: true
  },
  triggered: {
    type: Boolean,
    default: false
  },
  triggeredAt: {
    type: Date
  },
  triggeredPrice: {
    type: Number
  },
  lastCheckedPrice: {
    type: Number
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
priceAlertSchema.index({ user: 1, status: 1 });
priceAlertSchema.index({ pair: 1, status: 1 });
priceAlertSchema.index({ status: 1, triggered: 1 });
priceAlertSchema.index({ targetPrice: 1, condition: 1 });

/**
 * Check if alert should be triggered based on current price
 */
priceAlertSchema.methods.shouldTrigger = function(currentPrice) {
  if (this.status !== 'active') {
    return false;
  }

  const lastPrice = this.lastCheckedPrice;

  switch (this.condition) {
    case 'above':
      return currentPrice >= this.targetPrice;

    case 'below':
      return currentPrice <= this.targetPrice;

    case 'crosses_above':
      // Triggers when price crosses from below to above target
      if (lastPrice === undefined || lastPrice === null) {
        return false; // Need at least one previous price check
      }
      return lastPrice < this.targetPrice && currentPrice >= this.targetPrice;

    case 'crosses_below':
      // Triggers when price crosses from above to below target
      if (lastPrice === undefined || lastPrice === null) {
        return false; // Need at least one previous price check
      }
      return lastPrice > this.targetPrice && currentPrice <= this.targetPrice;

    default:
      return false;
  }
};

/**
 * Trigger the alert
 */
priceAlertSchema.methods.trigger = function(currentPrice) {
  this.triggered = true;
  this.triggeredAt = new Date();
  this.triggeredPrice = currentPrice;
  this.status = 'triggered';
  this.updatedAt = new Date();
};

/**
 * Update the last checked price
 */
priceAlertSchema.methods.updateLastPrice = function(price) {
  this.lastCheckedPrice = price;
  this.updatedAt = new Date();
};

/**
 * Mark notification as sent
 */
priceAlertSchema.methods.markNotificationSent = function() {
  this.notificationSent = true;
  this.notificationSentAt = new Date();
  this.updatedAt = new Date();
};

/**
 * Get active alerts for a pair
 */
priceAlertSchema.statics.getActiveAlerts = async function(pair) {
  return await this.find({
    pair,
    status: 'active'
  }).sort({ createdAt: -1 });
};

/**
 * Get user's active alerts
 */
priceAlertSchema.statics.getUserActiveAlerts = async function(userId) {
  return await this.find({
    user: userId,
    status: 'active'
  }).sort({ createdAt: -1 });
};

/**
 * Check all active alerts against current price
 */
priceAlertSchema.statics.checkAlerts = async function(pair, currentPrice) {
  const alerts = await this.getActiveAlerts(pair);
  const triggeredAlerts = [];

  for (const alert of alerts) {
    if (alert.shouldTrigger(currentPrice)) {
      alert.trigger(currentPrice);
      await alert.save();
      triggeredAlerts.push(alert);
    } else {
      alert.updateLastPrice(currentPrice);
      await alert.save();
    }
  }

  return triggeredAlerts;
};

/**
 * Clean up expired alerts
 */
priceAlertSchema.statics.expireOldAlerts = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      status: 'active',
      expiresAt: { $lte: now }
    },
    {
      $set: {
        status: 'expired',
        updatedAt: now
      }
    }
  );

  return result.modifiedCount;
};

/**
 * Get alert statistics for a user
 */
priceAlertSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    {
      $match: { user: mongoose.Types.ObjectId(userId) }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    active: 0,
    triggered: 0,
    cancelled: 0,
    expired: 0,
    total: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

module.exports = mongoose.model('PriceAlert', priceAlertSchema);
