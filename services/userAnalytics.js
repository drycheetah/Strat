const { UserBehaviorAnalytics } = require('../models/Analytics');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const logger = require('../utils/logger');

class UserAnalyticsService {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.activeSessions = new Map(); // address -> { startTime, lastActivity, transactions }
    this.dailyActiveUsers = new Set();
    this.newUsersToday = new Set();
  }

  // Track user activity
  trackActivity(address) {
    const now = Date.now();

    if (!this.activeSessions.has(address)) {
      this.activeSessions.set(address, {
        startTime: now,
        lastActivity: now,
        transactions: 0
      });
    } else {
      const session = this.activeSessions.get(address);
      session.lastActivity = now;
    }

    this.dailyActiveUsers.add(address);
  }

  // Track new user registration
  trackNewUser(address) {
    this.newUsersToday.add(address);
    this.dailyActiveUsers.add(address);
  }

  // Track user transaction
  trackTransaction(address) {
    if (this.activeSessions.has(address)) {
      this.activeSessions.get(address).transactions++;
    }
    this.trackActivity(address);
  }

  // Calculate session duration
  getSessionDuration(address) {
    const session = this.activeSessions.get(address);
    if (!session) return 0;
    return (session.lastActivity - session.startTime) / 1000; // in seconds
  }

  // Get all active sessions
  getActiveSessions() {
    const now = Date.now();
    const activeSessionTimeout = 30 * 60 * 1000; // 30 minutes

    const active = [];
    for (const [address, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity < activeSessionTimeout) {
        active.push({
          address,
          duration: (now - session.startTime) / 1000,
          transactions: session.transactions
        });
      }
    }

    return active;
  }

  // Classify user by balance
  async classifyUsers() {
    try {
      const wallets = await Wallet.find({});
      const distribution = {
        whales: 0,
        large: 0,
        medium: 0,
        small: 0,
        inactive: 0
      };

      for (const wallet of wallets) {
        const balance = this.blockchain.getBalance(wallet.address);

        if (balance === 0) {
          distribution.inactive++;
        } else if (balance >= 100000) {
          distribution.whales++;
        } else if (balance >= 10000) {
          distribution.large++;
        } else if (balance >= 1000) {
          distribution.medium++;
        } else {
          distribution.small++;
        }
      }

      return distribution;

    } catch (error) {
      logger.error(`Error classifying users: ${error.message}`);
      return null;
    }
  }

  // Get top users by volume
  async getTopUsersByVolume(limit = 10) {
    try {
      const Block = require('../models/Block');

      // Aggregate transaction volume per user
      const topUsers = await Block.aggregate([
        { $unwind: '$transactions' },
        {
          $group: {
            _id: '$transactions.from',
            volume: { $sum: '$transactions.amount' },
            transactions: { $sum: 1 }
          }
        },
        { $sort: { volume: -1 } },
        { $limit: limit },
        {
          $project: {
            address: '$_id',
            volume: 1,
            transactions: 1,
            _id: 0
          }
        }
      ]);

      return topUsers;

    } catch (error) {
      logger.error(`Error getting top users: ${error.message}`);
      return [];
    }
  }

  // Calculate activity by time of day
  async getActivityByTimeOfDay() {
    try {
      const Block = require('../models/Block');
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const blocks = await Block.find({
        timestamp: { $gte: oneDayAgo }
      });

      const hourlyActivity = new Array(24).fill(0);

      blocks.forEach(block => {
        const hour = new Date(block.timestamp).getHours();
        hourlyActivity[hour] += block.transactions.length;
      });

      return hourlyActivity;

    } catch (error) {
      logger.error(`Error getting activity by time: ${error.message}`);
      return new Array(24).fill(0);
    }
  }

  // Calculate retention and churn rates
  async calculateRetentionMetrics() {
    try {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

      const Block = require('../models/Block');

      // Users active in last 7 days
      const recentBlocks = await Block.find({
        timestamp: { $gte: new Date(sevenDaysAgo) }
      });

      const recentActiveUsers = new Set();
      recentBlocks.forEach(block => {
        block.transactions.forEach(tx => {
          if (tx.from) recentActiveUsers.add(tx.from);
        });
      });

      // Users active 7-14 days ago
      const previousBlocks = await Block.find({
        timestamp: {
          $gte: new Date(fourteenDaysAgo),
          $lt: new Date(sevenDaysAgo)
        }
      });

      const previousActiveUsers = new Set();
      previousBlocks.forEach(block => {
        block.transactions.forEach(tx => {
          if (tx.from) previousActiveUsers.add(tx.from);
        });
      });

      // Calculate retention (users active in both periods)
      const retainedUsers = Array.from(previousActiveUsers).filter(
        user => recentActiveUsers.has(user)
      ).length;

      const retentionRate = previousActiveUsers.size > 0
        ? (retainedUsers / previousActiveUsers.size) * 100
        : 0;

      const churnRate = 100 - retentionRate;

      return {
        retentionRate,
        churnRate,
        retainedUsers,
        totalPreviousUsers: previousActiveUsers.size
      };

    } catch (error) {
      logger.error(`Error calculating retention: ${error.message}`);
      return { retentionRate: 0, churnRate: 0 };
    }
  }

  // Save daily analytics
  async saveDailyAnalytics() {
    try {
      const now = new Date();
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get total users
      const totalUsers = await User.countDocuments();

      // Calculate average session duration
      let totalSessionDuration = 0;
      let sessionCount = 0;

      for (const [address, session] of this.activeSessions.entries()) {
        const duration = (session.lastActivity - session.startTime) / 1000;
        totalSessionDuration += duration;
        sessionCount++;
      }

      const averageSessionDuration = sessionCount > 0
        ? totalSessionDuration / sessionCount
        : 0;

      // Get returning users (active today but not new)
      const returningUsers = this.dailyActiveUsers.size - this.newUsersToday.size;

      // Calculate average transactions per user
      let totalTransactions = 0;
      for (const session of this.activeSessions.values()) {
        totalTransactions += session.transactions;
      }

      const averageTransactionsPerUser = this.dailyActiveUsers.size > 0
        ? totalTransactions / this.dailyActiveUsers.size
        : 0;

      // Get retention metrics
      const { retentionRate, churnRate } = await this.calculateRetentionMetrics();

      // Get user distribution
      const userDistribution = await this.classifyUsers();

      // Get top users
      const topUsersByVolume = await this.getTopUsersByVolume();

      // Get activity by time of day
      const activityByTimeOfDay = await this.getActivityByTimeOfDay();

      const analytics = {
        date,
        totalUsers,
        activeUsers: this.dailyActiveUsers.size,
        newUsers: this.newUsersToday.size,
        returningUsers,
        averageSessionDuration,
        averageTransactionsPerUser,
        userRetentionRate: retentionRate,
        churnRate,
        topUsersByVolume,
        userDistribution,
        activityByTimeOfDay
      };

      await UserBehaviorAnalytics.findOneAndUpdate(
        { date },
        analytics,
        { upsert: true, new: true }
      );

      logger.info(`Saved daily user analytics: ${analytics.activeUsers} active, ${analytics.newUsers} new users`);

      // Reset daily counters
      this.dailyActiveUsers.clear();
      this.newUsersToday.clear();

      // Clean up old sessions (older than 24 hours)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      for (const [address, session] of this.activeSessions.entries()) {
        if (session.lastActivity < oneDayAgo) {
          this.activeSessions.delete(address);
        }
      }

    } catch (error) {
      logger.error(`Error saving daily user analytics: ${error.message}`);
    }
  }

  // Get analytics for date range
  async getAnalytics(startDate, endDate) {
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const data = await UserBehaviorAnalytics.find({
        date: { $gte: start, $lte: end }
      }).sort({ date: 1 });

      return data;

    } catch (error) {
      logger.error(`Error getting user analytics: ${error.message}`);
      throw error;
    }
  }

  // Get real-time stats
  getRealTimeStats() {
    const activeSessions = this.getActiveSessions();

    return {
      currentDay: {
        activeUsers: this.dailyActiveUsers.size,
        newUsers: this.newUsersToday.size,
        activeSessions: activeSessions.length,
        averageSessionDuration: activeSessions.length > 0
          ? activeSessions.reduce((sum, s) => sum + s.duration, 0) / activeSessions.length
          : 0
      }
    };
  }

  // Start periodic analytics collection
  startAnalytics() {
    // Save daily analytics at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow - now;

    setTimeout(() => {
      this.saveDailyAnalytics();

      // Then save daily every 24 hours
      setInterval(() => {
        this.saveDailyAnalytics();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    // Clean up old sessions every hour
    setInterval(() => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      for (const [address, session] of this.activeSessions.entries()) {
        if (session.lastActivity < oneDayAgo) {
          this.activeSessions.delete(address);
        }
      }
    }, 60 * 60 * 1000);

    logger.info('User analytics service started');
  }
}

module.exports = UserAnalyticsService;
