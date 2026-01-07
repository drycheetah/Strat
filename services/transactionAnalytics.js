const { TransactionAnalytics } = require('../models/Analytics');
const Block = require('../models/Block');
const logger = require('../utils/logger');

class TransactionAnalyticsService {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.currentHourData = this.initializeHourData();
    this.uniqueAddresses = new Set();
  }

  initializeHourData() {
    return {
      totalTransactions: 0,
      totalVolume: 0,
      totalFees: 0,
      failedTransactions: 0,
      transactionTypes: {
        transfer: 0,
        contract: 0,
        staking: 0,
        bridge: 0,
        nft: 0
      },
      tpsData: []
    };
  }

  // Record transaction when it's added to blockchain
  async recordTransaction(transaction, success = true) {
    try {
      this.currentHourData.totalTransactions++;
      this.currentHourData.totalVolume += transaction.amount || 0;
      this.currentHourData.totalFees += transaction.fee || 0;

      if (!success) {
        this.currentHourData.failedTransactions++;
      }

      // Track unique addresses
      if (transaction.from) this.uniqueAddresses.add(transaction.from);
      if (transaction.to) this.uniqueAddresses.add(transaction.to);

      // Categorize transaction type
      if (transaction.type === 'CONTRACT_CALL' || transaction.type === 'CONTRACT_DEPLOY') {
        this.currentHourData.transactionTypes.contract++;
      } else if (transaction.type === 'STAKE' || transaction.type === 'UNSTAKE') {
        this.currentHourData.transactionTypes.staking++;
      } else if (transaction.type === 'BRIDGE') {
        this.currentHourData.transactionTypes.bridge++;
      } else if (transaction.type === 'NFT_MINT' || transaction.type === 'NFT_TRANSFER') {
        this.currentHourData.transactionTypes.nft++;
      } else {
        this.currentHourData.transactionTypes.transfer++;
      }

      // Record TPS data point
      this.currentHourData.tpsData.push({
        timestamp: Date.now(),
        count: 1
      });

    } catch (error) {
      logger.error(`Error recording transaction analytics: ${error.message}`);
    }
  }

  // Calculate TPS metrics
  calculateTPSMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Filter recent TPS data
    const recentTPS = this.currentHourData.tpsData.filter(
      data => data.timestamp > oneMinuteAgo
    );

    if (recentTPS.length === 0) {
      return { peakTPS: 0, averageTPS: 0 };
    }

    // Group by second
    const tpsBySecond = {};
    recentTPS.forEach(data => {
      const second = Math.floor(data.timestamp / 1000);
      tpsBySecond[second] = (tpsBySecond[second] || 0) + data.count;
    });

    const tpsValues = Object.values(tpsBySecond);
    const peakTPS = Math.max(...tpsValues);
    const averageTPS = tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length;

    return { peakTPS, averageTPS };
  }

  // Save hourly analytics to database
  async saveHourlyAnalytics() {
    try {
      const now = new Date();
      const hour = now.getHours();
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const { peakTPS, averageTPS } = this.calculateTPSMetrics();

      const analytics = {
        date,
        hour,
        totalTransactions: this.currentHourData.totalTransactions,
        totalVolume: this.currentHourData.totalVolume,
        averageTransactionValue: this.currentHourData.totalTransactions > 0
          ? this.currentHourData.totalVolume / this.currentHourData.totalTransactions
          : 0,
        averageFee: this.currentHourData.totalTransactions > 0
          ? this.currentHourData.totalFees / this.currentHourData.totalTransactions
          : 0,
        totalFees: this.currentHourData.totalFees,
        uniqueAddresses: this.uniqueAddresses.size,
        successRate: this.currentHourData.totalTransactions > 0
          ? ((this.currentHourData.totalTransactions - this.currentHourData.failedTransactions)
             / this.currentHourData.totalTransactions) * 100
          : 100,
        failedTransactions: this.currentHourData.failedTransactions,
        peakTPS,
        averageTPS,
        transactionTypes: this.currentHourData.transactionTypes
      };

      await TransactionAnalytics.findOneAndUpdate(
        { date, hour },
        analytics,
        { upsert: true, new: true }
      );

      logger.info(`Saved hourly transaction analytics: ${analytics.totalTransactions} txs, ${analytics.uniqueAddresses} unique addresses`);

      // Reset for next hour
      this.currentHourData = this.initializeHourData();
      this.uniqueAddresses.clear();

    } catch (error) {
      logger.error(`Error saving hourly analytics: ${error.message}`);
    }
  }

  // Aggregate daily analytics from hourly data
  async aggregateDailyAnalytics(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const hourlyData = await TransactionAnalytics.find({
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      if (hourlyData.length === 0) {
        return null;
      }

      const dailyAnalytics = hourlyData.reduce((acc, hour) => ({
        totalTransactions: acc.totalTransactions + hour.totalTransactions,
        totalVolume: acc.totalVolume + hour.totalVolume,
        totalFees: acc.totalFees + hour.totalFees,
        failedTransactions: acc.failedTransactions + hour.failedTransactions,
        peakTPS: Math.max(acc.peakTPS, hour.peakTPS),
        averageTPS: acc.averageTPS + hour.averageTPS,
        transactionTypes: {
          transfer: acc.transactionTypes.transfer + hour.transactionTypes.transfer,
          contract: acc.transactionTypes.contract + hour.transactionTypes.contract,
          staking: acc.transactionTypes.staking + hour.transactionTypes.staking,
          bridge: acc.transactionTypes.bridge + hour.transactionTypes.bridge,
          nft: acc.transactionTypes.nft + hour.transactionTypes.nft
        }
      }), {
        totalTransactions: 0,
        totalVolume: 0,
        totalFees: 0,
        failedTransactions: 0,
        peakTPS: 0,
        averageTPS: 0,
        transactionTypes: { transfer: 0, contract: 0, staking: 0, bridge: 0, nft: 0 }
      });

      dailyAnalytics.averageTPS /= hourlyData.length;
      dailyAnalytics.averageTransactionValue = dailyAnalytics.totalTransactions > 0
        ? dailyAnalytics.totalVolume / dailyAnalytics.totalTransactions
        : 0;
      dailyAnalytics.averageFee = dailyAnalytics.totalTransactions > 0
        ? dailyAnalytics.totalFees / dailyAnalytics.totalTransactions
        : 0;
      dailyAnalytics.successRate = dailyAnalytics.totalTransactions > 0
        ? ((dailyAnalytics.totalTransactions - dailyAnalytics.failedTransactions)
           / dailyAnalytics.totalTransactions) * 100
        : 100;

      return dailyAnalytics;

    } catch (error) {
      logger.error(`Error aggregating daily analytics: ${error.message}`);
      return null;
    }
  }

  // Get analytics for date range
  async getAnalytics(startDate, endDate, granularity = 'daily') {
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      if (granularity === 'hourly') {
        const data = await TransactionAnalytics.find({
          date: { $gte: start, $lte: end }
        }).sort({ date: 1, hour: 1 });

        return data;
      }

      // Daily aggregation
      const data = await TransactionAnalytics.aggregate([
        {
          $match: {
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$date',
            totalTransactions: { $sum: '$totalTransactions' },
            totalVolume: { $sum: '$totalVolume' },
            totalFees: { $sum: '$totalFees' },
            failedTransactions: { $sum: '$failedTransactions' },
            peakTPS: { $max: '$peakTPS' },
            averageTPS: { $avg: '$averageTPS' },
            uniqueAddresses: { $max: '$uniqueAddresses' },
            transactionTypes: {
              transfer: { $sum: '$transactionTypes.transfer' },
              contract: { $sum: '$transactionTypes.contract' },
              staking: { $sum: '$transactionTypes.staking' },
              bridge: { $sum: '$transactionTypes.bridge' },
              nft: { $sum: '$transactionTypes.nft' }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      return data.map(d => ({
        date: d._id,
        ...d,
        averageTransactionValue: d.totalTransactions > 0
          ? d.totalVolume / d.totalTransactions : 0,
        averageFee: d.totalTransactions > 0
          ? d.totalFees / d.totalTransactions : 0,
        successRate: d.totalTransactions > 0
          ? ((d.totalTransactions - d.failedTransactions) / d.totalTransactions) * 100 : 100
      }));

    } catch (error) {
      logger.error(`Error getting analytics: ${error.message}`);
      throw error;
    }
  }

  // Get real-time stats
  getRealTimeStats() {
    const { peakTPS, averageTPS } = this.calculateTPSMetrics();

    return {
      currentHour: {
        totalTransactions: this.currentHourData.totalTransactions,
        totalVolume: this.currentHourData.totalVolume,
        totalFees: this.currentHourData.totalFees,
        uniqueAddresses: this.uniqueAddresses.size,
        failedTransactions: this.currentHourData.failedTransactions,
        peakTPS,
        averageTPS,
        transactionTypes: this.currentHourData.transactionTypes
      }
    };
  }

  // Start periodic analytics collection
  startAnalytics() {
    // Save hourly analytics every hour
    setInterval(() => {
      this.saveHourlyAnalytics();
    }, 3600000); // 1 hour

    // Clean up old TPS data every minute
    setInterval(() => {
      const oneHourAgo = Date.now() - 3600000;
      this.currentHourData.tpsData = this.currentHourData.tpsData.filter(
        data => data.timestamp > oneHourAgo
      );
    }, 60000); // 1 minute

    logger.info('Transaction analytics service started');
  }
}

module.exports = TransactionAnalyticsService;
