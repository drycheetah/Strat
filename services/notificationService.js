// Notification Service for STRAT blockchain

const EventEmitter = require('events');

class NotificationService extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.subscriptions = new Map(); // Map of userId -> Set of notification types
    this.notificationQueue = [];
    this.maxQueueSize = 1000;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for blockchain events
   */
  setupEventListeners() {
    // Block events
    this.on('block:new', (block) => {
      this.broadcastNotification('block:new', {
        type: 'block',
        title: 'New Block Mined',
        message: `Block #${block.index} has been mined`,
        data: block,
        timestamp: Date.now()
      });
    });

    // Transaction events
    this.on('transaction:confirmed', (tx) => {
      this.sendNotificationToUser(tx.to, 'transaction:received', {
        type: 'transaction',
        title: 'Transaction Received',
        message: `You received ${tx.amount} STRAT`,
        data: tx,
        timestamp: Date.now()
      });

      this.sendNotificationToUser(tx.from, 'transaction:sent', {
        type: 'transaction',
        title: 'Transaction Sent',
        message: `You sent ${tx.amount} STRAT to ${tx.to}`,
        data: tx,
        timestamp: Date.now()
      });
    });

    // Governance events
    this.on('proposal:created', (proposal) => {
      this.broadcastNotification('proposal:created', {
        type: 'governance',
        title: 'New Proposal Created',
        message: proposal.title,
        data: proposal,
        timestamp: Date.now()
      });
    });

    this.on('proposal:passed', (proposal) => {
      this.broadcastNotification('proposal:passed', {
        type: 'governance',
        title: 'Proposal Passed',
        message: `Proposal "${proposal.title}" has passed`,
        data: proposal,
        timestamp: Date.now()
      });
    });

    this.on('vote:cast', (vote) => {
      this.sendNotificationToUser(vote.voter, 'vote:cast', {
        type: 'governance',
        title: 'Vote Recorded',
        message: `Your vote has been recorded`,
        data: vote,
        timestamp: Date.now()
      });
    });

    // NFT events
    this.on('nft:minted', (nft) => {
      this.sendNotificationToUser(nft.owner, 'nft:minted', {
        type: 'nft',
        title: 'NFT Minted',
        message: `Your NFT "${nft.name}" has been minted`,
        data: nft,
        timestamp: Date.now()
      });
    });

    this.on('nft:sold', (sale) => {
      this.sendNotificationToUser(sale.seller, 'nft:sold', {
        type: 'nft',
        title: 'NFT Sold',
        message: `Your NFT was sold for ${sale.price} STRAT`,
        data: sale,
        timestamp: Date.now()
      });

      this.sendNotificationToUser(sale.buyer, 'nft:purchased', {
        type: 'nft',
        title: 'NFT Purchased',
        message: `You purchased "${sale.nftName}"`,
        data: sale,
        timestamp: Date.now()
      });
    });

    // Trading events
    this.on('order:filled', (order) => {
      this.sendNotificationToUser(order.user, 'order:filled', {
        type: 'trading',
        title: 'Order Filled',
        message: `Your ${order.type} order has been filled`,
        data: order,
        timestamp: Date.now()
      });
    });

    this.on('price:alert', (alert) => {
      this.sendNotificationToUser(alert.user, 'price:alert', {
        type: 'trading',
        title: 'Price Alert',
        message: `${alert.pair} has reached ${alert.targetPrice}`,
        data: alert,
        timestamp: Date.now()
      });
    });

    // Social events
    this.on('post:liked', (like) => {
      this.sendNotificationToUser(like.postAuthor, 'post:liked', {
        type: 'social',
        title: 'Post Liked',
        message: `${like.liker} liked your post`,
        data: like,
        timestamp: Date.now()
      });
    });

    this.on('post:commented', (comment) => {
      this.sendNotificationToUser(comment.postAuthor, 'post:commented', {
        type: 'social',
        title: 'New Comment',
        message: `${comment.author} commented on your post`,
        data: comment,
        timestamp: Date.now()
      });
    });

    this.on('achievement:unlocked', (achievement) => {
      this.sendNotificationToUser(achievement.user, 'achievement:unlocked', {
        type: 'achievement',
        title: 'Achievement Unlocked',
        message: `You unlocked "${achievement.name}"`,
        data: achievement,
        timestamp: Date.now()
      });
    });

    // Staking events
    this.on('stake:reward', (reward) => {
      this.sendNotificationToUser(reward.staker, 'stake:reward', {
        type: 'staking',
        title: 'Staking Reward',
        message: `You earned ${reward.amount} STRAT from staking`,
        data: reward,
        timestamp: Date.now()
      });
    });

    // DeFi events
    this.on('pool:liquidity', (pool) => {
      this.broadcastNotification('pool:liquidity', {
        type: 'defi',
        title: 'New Liquidity Pool',
        message: `${pool.tokenA}/${pool.tokenB} pool created`,
        data: pool,
        timestamp: Date.now()
      });
    });

    this.on('farming:reward', (reward) => {
      this.sendNotificationToUser(reward.farmer, 'farming:reward', {
        type: 'defi',
        title: 'Farming Reward',
        message: `You earned ${reward.amount} STRAT from yield farming`,
        data: reward,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Subscribe user to notifications
   */
  subscribe(userId, notificationTypes = ['all']) {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Set());
    }

    const userSubscriptions = this.subscriptions.get(userId);
    notificationTypes.forEach(type => userSubscriptions.add(type));

    return {
      success: true,
      subscriptions: Array.from(userSubscriptions)
    };
  }

  /**
   * Unsubscribe user from notifications
   */
  unsubscribe(userId, notificationTypes = null) {
    if (!this.subscriptions.has(userId)) {
      return { success: false, message: 'No subscriptions found' };
    }

    if (notificationTypes === null) {
      // Unsubscribe from all
      this.subscriptions.delete(userId);
      return { success: true, message: 'Unsubscribed from all notifications' };
    }

    const userSubscriptions = this.subscriptions.get(userId);
    notificationTypes.forEach(type => userSubscriptions.delete(type));

    if (userSubscriptions.size === 0) {
      this.subscriptions.delete(userId);
    }

    return {
      success: true,
      subscriptions: Array.from(userSubscriptions)
    };
  }

  /**
   * Send notification to specific user
   */
  sendNotificationToUser(userId, event, notification) {
    if (!this.subscriptions.has(userId)) {
      return; // User not subscribed
    }

    const userSubscriptions = this.subscriptions.get(userId);
    if (!userSubscriptions.has('all') && !userSubscriptions.has(notification.type)) {
      return; // User not subscribed to this notification type
    }

    // Send via WebSocket
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, notification);
    }

    // Add to queue for offline users
    this.addToQueue(userId, notification);
  }

  /**
   * Broadcast notification to all subscribed users
   */
  broadcastNotification(event, notification) {
    // Send via WebSocket to all connected users
    if (this.io) {
      this.io.emit(event, notification);
    }

    // Add to queue for all subscribed users
    this.subscriptions.forEach((types, userId) => {
      if (types.has('all') || types.has(notification.type)) {
        this.addToQueue(userId, notification);
      }
    });
  }

  /**
   * Add notification to queue
   */
  addToQueue(userId, notification) {
    this.notificationQueue.push({
      userId,
      notification,
      timestamp: Date.now()
    });

    // Maintain queue size
    if (this.notificationQueue.length > this.maxQueueSize) {
      this.notificationQueue.shift();
    }
  }

  /**
   * Get pending notifications for user
   */
  getPendingNotifications(userId, limit = 50) {
    const pending = this.notificationQueue
      .filter(item => item.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return pending.map(item => item.notification);
  }

  /**
   * Clear notifications for user
   */
  clearNotifications(userId) {
    this.notificationQueue = this.notificationQueue.filter(
      item => item.userId !== userId
    );

    return { success: true, message: 'Notifications cleared' };
  }

  /**
   * Get notification statistics
   */
  getStats() {
    return {
      totalSubscribers: this.subscriptions.size,
      queueSize: this.notificationQueue.length,
      subscriptionsByType: this.getSubscriptionsByType()
    };
  }

  /**
   * Get subscriptions grouped by type
   */
  getSubscriptionsByType() {
    const typeCount = {};

    this.subscriptions.forEach((types) => {
      types.forEach((type) => {
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
    });

    return typeCount;
  }

  /**
   * Send bulk notifications
   */
  sendBulkNotifications(userIds, event, notification) {
    userIds.forEach(userId => {
      this.sendNotificationToUser(userId, event, notification);
    });

    return {
      success: true,
      sent: userIds.length
    };
  }

  /**
   * Schedule notification
   */
  scheduleNotification(userId, event, notification, delay) {
    setTimeout(() => {
      this.sendNotificationToUser(userId, event, notification);
    }, delay);

    return {
      success: true,
      scheduledFor: Date.now() + delay
    };
  }

  /**
   * Get user subscription preferences
   */
  getUserPreferences(userId) {
    if (!this.subscriptions.has(userId)) {
      return {
        subscribed: false,
        types: []
      };
    }

    return {
      subscribed: true,
      types: Array.from(this.subscriptions.get(userId))
    };
  }
}

module.exports = NotificationService;
