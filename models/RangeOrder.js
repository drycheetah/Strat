const mongoose = require('mongoose');

const rangeOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pair: {
    type: String,
    required: true
  },
  tokenIn: {
    type: String,
    required: true
  },
  tokenOut: {
    type: String,
    required: true
  },
  amountIn: {
    type: Number,
    required: true,
    min: 0
  },
  priceLower: {
    type: Number,
    required: true
  },
  priceUpper: {
    type: Number,
    required: true
  },
  currentPrice: {
    type: Number,
    required: true
  },
  amountFilled: {
    type: Number,
    default: 0
  },
  amountOut: {
    type: Number,
    default: 0
  },
  averagePrice: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'EXPIRED'],
    default: 'PENDING'
  },
  orderType: {
    type: String,
    enum: ['LIMIT', 'RANGE', 'STOP_LIMIT'],
    default: 'RANGE'
  },
  fills: [{
    amount: Number,
    price: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  feePaid: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date,
  filledAt: Date,
  cancelledAt: Date
}, { timestamps: true });

const rangeOrderPoolSchema = new mongoose.Schema({
  poolId: {
    type: String,
    required: true,
    unique: true
  },
  pair: {
    type: String,
    required: true
  },
  token0: {
    type: String,
    required: true
  },
  token1: {
    type: String,
    required: true
  },
  currentPrice: {
    type: Number,
    required: true
  },
  orders: [rangeOrderSchema],
  fee: {
    type: Number,
    default: 0.001 // 0.1%
  },
  totalVolume24h: {
    type: Number,
    default: 0
  },
  totalFeesCollected: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Place range order
rangeOrderPoolSchema.methods.placeOrder = async function(user, tokenIn, amountIn, priceLower, priceUpper, expiryTime = null) {
  if (priceLower >= priceUpper) {
    throw new Error('Invalid price range');
  }

  if (amountIn <= 0) {
    throw new Error('Amount must be positive');
  }

  const tokenOut = tokenIn === this.token0 ? this.token1 : this.token0;
  const orderId = `RO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const order = {
    orderId,
    user,
    pair: this.pair,
    tokenIn,
    tokenOut,
    amountIn,
    priceLower,
    priceUpper,
    currentPrice: this.currentPrice,
    amountFilled: 0,
    amountOut: 0,
    averagePrice: 0,
    status: 'PENDING',
    orderType: 'RANGE',
    fills: [],
    feePaid: 0,
    createdAt: new Date(),
    expiresAt: expiryTime
  };

  // Check if order is immediately in range
  if (this.currentPrice >= priceLower && this.currentPrice <= priceUpper) {
    order.status = 'ACTIVE';
  }

  this.orders.push(order);
  await this.save();

  return order;
};

// Update price and execute orders
rangeOrderPoolSchema.methods.updatePrice = async function(newPrice) {
  this.currentPrice = newPrice;

  for (const order of this.orders) {
    if (order.status === 'CANCELLED' || order.status === 'FILLED' || order.status === 'EXPIRED') {
      continue;
    }

    // Check expiry
    if (order.expiresAt && new Date() >= order.expiresAt) {
      order.status = 'EXPIRED';
      continue;
    }

    // Check if price is in range
    const inRange = newPrice >= order.priceLower && newPrice <= order.priceUpper;

    if (inRange) {
      if (order.status === 'PENDING') {
        order.status = 'ACTIVE';
      }

      // Execute partial fill
      await this.fillOrder(order.orderId, newPrice);
    } else {
      if (order.status === 'ACTIVE' || order.status === 'PARTIALLY_FILLED') {
        order.status = order.amountFilled > 0 ? 'PARTIALLY_FILLED' : 'PENDING';
      }
    }
  }

  await this.save();
};

// Fill order
rangeOrderPoolSchema.methods.fillOrder = async function(orderId, executionPrice) {
  const order = this.orders.find(o => o.orderId === orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status === 'FILLED' || order.status === 'CANCELLED' || order.status === 'EXPIRED') {
    throw new Error('Order cannot be filled');
  }

  const remainingAmount = order.amountIn - order.amountFilled;
  if (remainingAmount <= 0) {
    order.status = 'FILLED';
    order.filledAt = new Date();
    await this.save();
    return;
  }

  // Partial fill - simulate filling 10% of remaining per update
  const fillAmount = Math.min(remainingAmount, remainingAmount * 0.1);
  const outputAmount = fillAmount * executionPrice;
  const fee = outputAmount * this.fee;

  order.fills.push({
    amount: fillAmount,
    price: executionPrice,
    timestamp: new Date()
  });

  order.amountFilled += fillAmount;
  order.amountOut += (outputAmount - fee);
  order.feePaid += fee;

  // Update average price
  order.averagePrice = order.fills.reduce((sum, f) => sum + f.price, 0) / order.fills.length;

  if (order.amountFilled >= order.amountIn) {
    order.status = 'FILLED';
    order.filledAt = new Date();
  } else {
    order.status = 'PARTIALLY_FILLED';
  }

  this.totalVolume24h += fillAmount;
  this.totalFeesCollected += fee;

  await this.save();

  return {
    filled: fillAmount,
    outputAmount: outputAmount - fee,
    fee,
    status: order.status
  };
};

// Cancel order
rangeOrderPoolSchema.methods.cancelOrder = async function(orderId, userId) {
  const order = this.orders.find(o => o.orderId === orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (order.user.toString() !== userId.toString()) {
    throw new Error('Unauthorized');
  }

  if (order.status === 'FILLED' || order.status === 'CANCELLED') {
    throw new Error('Order cannot be cancelled');
  }

  const refundAmount = order.amountIn - order.amountFilled;

  order.status = 'CANCELLED';
  order.cancelledAt = new Date();

  await this.save();

  return {
    refunded: refundAmount,
    amountFilled: order.amountFilled,
    amountOut: order.amountOut
  };
};

// Get user orders
rangeOrderPoolSchema.methods.getUserOrders = function(userId, includeCompleted = false) {
  let orders = this.orders.filter(o => o.user.toString() === userId.toString());

  if (!includeCompleted) {
    orders = orders.filter(o =>
      o.status !== 'FILLED' && o.status !== 'CANCELLED' && o.status !== 'EXPIRED'
    );
  }

  return orders.map(o => ({
    orderId: o.orderId,
    tokenIn: o.tokenIn,
    tokenOut: o.tokenOut,
    amountIn: o.amountIn,
    amountFilled: o.amountFilled,
    amountOut: o.amountOut,
    priceLower: o.priceLower,
    priceUpper: o.priceUpper,
    averagePrice: o.averagePrice,
    status: o.status,
    feePaid: o.feePaid,
    createdAt: o.createdAt,
    filledAt: o.filledAt,
    fills: o.fills.length
  }));
};

// Get order book
rangeOrderPoolSchema.methods.getOrderBook = function(side = 'both') {
  const activeOrders = this.orders.filter(o =>
    o.status === 'ACTIVE' || o.status === 'PARTIALLY_FILLED' || o.status === 'PENDING'
  );

  const buyOrders = [];
  const sellOrders = [];

  for (const order of activeOrders) {
    const orderData = {
      price: (order.priceLower + order.priceUpper) / 2,
      amount: order.amountIn - order.amountFilled,
      range: [order.priceLower, order.priceUpper]
    };

    if (order.tokenIn === this.token0) {
      sellOrders.push(orderData);
    } else {
      buyOrders.push(orderData);
    }
  }

  buyOrders.sort((a, b) => b.price - a.price);
  sellOrders.sort((a, b) => a.price - b.price);

  return {
    buy: side === 'sell' ? [] : buyOrders,
    sell: side === 'buy' ? [] : sellOrders,
    spread: buyOrders.length > 0 && sellOrders.length > 0
      ? sellOrders[0].price - buyOrders[0].price
      : 0
  };
};

// Get pool statistics
rangeOrderPoolSchema.methods.getStats = function() {
  const activeOrders = this.orders.filter(o =>
    o.status === 'ACTIVE' || o.status === 'PARTIALLY_FILLED' || o.status === 'PENDING'
  );

  const filledOrders = this.orders.filter(o => o.status === 'FILLED');

  return {
    poolId: this.poolId,
    pair: this.pair,
    currentPrice: this.currentPrice,
    totalOrders: this.orders.length,
    activeOrders: activeOrders.length,
    filledOrders: filledOrders.length,
    totalVolume24h: this.totalVolume24h,
    totalFeesCollected: this.totalFeesCollected,
    fee: this.fee,
    averageFillRate: filledOrders.length > 0
      ? filledOrders.reduce((sum, o) => sum + (o.amountFilled / o.amountIn), 0) / filledOrders.length
      : 0
  };
};

module.exports = mongoose.model('RangeOrderPool', rangeOrderPoolSchema);
