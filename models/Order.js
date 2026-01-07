const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  address: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['limit', 'stop-loss', 'take-profit'],
    required: true
  },
  side: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  pair: {
    type: String,
    required: true,
    index: true,
    default: 'STRAT/USD'
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  filledAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'filled', 'cancelled', 'expired'],
    default: 'pending',
    index: true
  },
  triggerPrice: {
    type: Number,
    min: 0
  },
  triggered: {
    type: Boolean,
    default: false
  },
  triggeredAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  averageFilledPrice: {
    type: Number,
    default: 0
  },
  fees: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ address: 1, status: 1 });
orderSchema.index({ pair: 1, type: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ triggerPrice: 1, triggered: 1 });

/**
 * Check if order is fillable at current price
 */
orderSchema.methods.canFillAtPrice = function(currentPrice) {
  if (this.status !== 'pending' && this.status !== 'partial') {
    return false;
  }

  switch (this.type) {
    case 'limit':
      if (this.side === 'buy') {
        return currentPrice <= this.price;
      } else {
        return currentPrice >= this.price;
      }

    case 'stop-loss':
      if (!this.triggered) {
        // Check if stop-loss should be triggered
        if (this.side === 'sell') {
          return currentPrice <= this.triggerPrice;
        } else {
          return currentPrice >= this.triggerPrice;
        }
      }
      return true; // Already triggered, execute at market

    case 'take-profit':
      if (!this.triggered) {
        // Check if take-profit should be triggered
        if (this.side === 'sell') {
          return currentPrice >= this.triggerPrice;
        } else {
          return currentPrice <= this.triggerPrice;
        }
      }
      return true; // Already triggered, execute at market

    default:
      return false;
  }
};

/**
 * Calculate remaining amount
 */
orderSchema.methods.getRemainingAmount = function() {
  return this.amount - this.filledAmount;
};

/**
 * Check if order is fully filled
 */
orderSchema.methods.isFullyFilled = function() {
  return this.filledAmount >= this.amount;
};

/**
 * Partially fill order
 */
orderSchema.methods.partialFill = function(fillAmount, fillPrice) {
  const previousFilled = this.filledAmount;
  this.filledAmount = Math.min(this.amount, this.filledAmount + fillAmount);

  // Update average filled price
  const totalValue = (previousFilled * this.averageFilledPrice) + (fillAmount * fillPrice);
  this.averageFilledPrice = totalValue / this.filledAmount;

  if (this.isFullyFilled()) {
    this.status = 'filled';
    this.completedAt = new Date();
  } else if (this.filledAmount > 0) {
    this.status = 'partial';
  }

  this.updatedAt = new Date();
};

/**
 * Trigger stop-loss or take-profit order
 */
orderSchema.methods.trigger = function() {
  if (this.type === 'stop-loss' || this.type === 'take-profit') {
    this.triggered = true;
    this.triggeredAt = new Date();
  }
};

/**
 * Get active orders for a pair
 */
orderSchema.statics.getActiveOrders = async function(pair) {
  return await this.find({
    pair,
    status: { $in: ['pending', 'partial'] }
  }).sort({ price: 1 });
};

/**
 * Get user's active orders
 */
orderSchema.statics.getUserActiveOrders = async function(userId) {
  return await this.find({
    user: userId,
    status: { $in: ['pending', 'partial'] }
  }).sort({ createdAt: -1 });
};

/**
 * Get orders that should be triggered at current price
 */
orderSchema.statics.getTriggeredOrders = async function(pair, currentPrice) {
  // Get all pending stop-loss and take-profit orders
  const orders = await this.find({
    pair,
    type: { $in: ['stop-loss', 'take-profit'] },
    status: 'pending',
    triggered: false
  });

  return orders.filter(order => order.canFillAtPrice(currentPrice));
};

/**
 * Clean up expired orders
 */
orderSchema.statics.expireOldOrders = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      status: { $in: ['pending', 'partial'] },
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

module.exports = mongoose.model('Order', orderSchema);
