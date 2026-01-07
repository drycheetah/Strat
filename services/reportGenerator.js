const { TransactionAnalytics, UserBehaviorAnalytics, ProtocolAnalytics, NetworkHealth, RevenueAnalytics } = require('../models/Analytics');
const logger = require('../utils/logger');

class ReportGenerator {
  constructor() {
    this.reportTypes = ['daily', 'weekly', 'monthly'];
  }

  // Generate daily report
  async generateDailyReport(date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Transaction analytics
      const txAnalytics = await TransactionAnalytics.aggregate([
        {
          $match: {
            date: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: '$totalTransactions' },
            totalVolume: { $sum: '$totalVolume' },
            totalFees: { $sum: '$totalFees' },
            uniqueAddresses: { $max: '$uniqueAddresses' },
            peakTPS: { $max: '$peakTPS' },
            averageTPS: { $avg: '$averageTPS' }
          }
        }
      ]);

      // User analytics
      const userAnalytics = await UserBehaviorAnalytics.findOne({
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      // Protocol analytics
      const protocolAnalytics = await ProtocolAnalytics.find({
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      // Network health
      const networkHealth = await NetworkHealth.find({
        timestamp: { $gte: startOfDay, $lte: endOfDay }
      }).sort({ timestamp: -1 }).limit(1);

      // Revenue analytics
      const revenueAnalytics = await RevenueAnalytics.findOne({
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      const report = {
        type: 'daily',
        date: startOfDay,
        generatedAt: new Date(),
        transactions: txAnalytics[0] || {},
        users: userAnalytics || {},
        protocols: this.summarizeProtocolData(protocolAnalytics),
        network: networkHealth[0] || {},
        revenue: revenueAnalytics || {},
        summary: this.generateSummary('daily', {
          transactions: txAnalytics[0],
          users: userAnalytics,
          protocols: protocolAnalytics,
          revenue: revenueAnalytics
        })
      };

      logger.info(`Generated daily report for ${startOfDay.toISOString()}`);
      return report;

    } catch (error) {
      logger.error(`Error generating daily report: ${error.message}`);
      return null;
    }
  }

  // Generate weekly report
  async generateWeeklyReport(endDate = new Date()) {
    try {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const start = new Date(endDate);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);

      // Transaction analytics
      const txAnalytics = await TransactionAnalytics.aggregate([
        {
          $match: {
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: '$totalTransactions' },
            totalVolume: { $sum: '$totalVolume' },
            totalFees: { $sum: '$totalFees' },
            peakTPS: { $max: '$peakTPS' },
            averageTPS: { $avg: '$averageTPS' }
          }
        }
      ]);

      // Daily breakdown
      const dailyTxData = await TransactionAnalytics.aggregate([
        {
          $match: {
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$date',
            totalTransactions: { $sum: '$totalTransactions' },
            totalVolume: { $sum: '$totalVolume' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // User analytics
      const userAnalytics = await UserBehaviorAnalytics.find({
        date: { $gte: start, $lte: end }
      });

      const totalUsers = userAnalytics.reduce((sum, day) => sum + (day.activeUsers || 0), 0);
      const newUsers = userAnalytics.reduce((sum, day) => sum + (day.newUsers || 0), 0);
      const avgRetention = userAnalytics.reduce((sum, day) => sum + (day.userRetentionRate || 0), 0) / (userAnalytics.length || 1);

      // Protocol analytics
      const protocolAnalytics = await ProtocolAnalytics.find({
        date: { $gte: start, $lte: end }
      });

      // Revenue analytics
      const revenueData = await RevenueAnalytics.aggregate([
        {
          $match: {
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalRevenue' },
            transactionFees: { $sum: '$transactionFees' },
            bridgeFees: { $sum: '$bridgeFees' },
            nftRoyalties: { $sum: '$nftRoyalties' }
          }
        }
      ]);

      const report = {
        type: 'weekly',
        startDate: start,
        endDate: end,
        generatedAt: new Date(),
        transactions: {
          ...txAnalytics[0],
          dailyBreakdown: dailyTxData,
          averageDaily: txAnalytics[0] ? txAnalytics[0].totalTransactions / 7 : 0
        },
        users: {
          totalActiveUsers: totalUsers,
          newUsers,
          averageRetentionRate: avgRetention,
          averageDailyActive: totalUsers / 7
        },
        protocols: this.summarizeProtocolData(protocolAnalytics),
        revenue: revenueData[0] || {},
        summary: this.generateSummary('weekly', {
          transactions: txAnalytics[0],
          users: { totalActiveUsers: totalUsers, newUsers },
          protocols: protocolAnalytics,
          revenue: revenueData[0]
        })
      };

      logger.info(`Generated weekly report for ${start.toISOString()} to ${end.toISOString()}`);
      return report;

    } catch (error) {
      logger.error(`Error generating weekly report: ${error.message}`);
      return null;
    }
  }

  // Generate monthly report
  async generateMonthlyReport(year, month) {
    try {
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);

      // Transaction analytics
      const txAnalytics = await TransactionAnalytics.aggregate([
        {
          $match: {
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: '$totalTransactions' },
            totalVolume: { $sum: '$totalVolume' },
            totalFees: { $sum: '$totalFees' },
            peakTPS: { $max: '$peakTPS' },
            averageTPS: { $avg: '$averageTPS' }
          }
        }
      ]);

      // Weekly breakdown
      const weeks = [];
      let weekStart = new Date(start);

      while (weekStart < end) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        if (weekEnd > end) {
          weekEnd.setTime(end.getTime());
        }

        const weekData = await TransactionAnalytics.aggregate([
          {
            $match: {
              date: { $gte: weekStart, $lte: weekEnd }
            }
          },
          {
            $group: {
              _id: null,
              totalTransactions: { $sum: '$totalTransactions' },
              totalVolume: { $sum: '$totalVolume' }
            }
          }
        ]);

        weeks.push({
          startDate: new Date(weekStart),
          endDate: new Date(weekEnd),
          data: weekData[0] || {}
        });

        weekStart.setDate(weekStart.getDate() + 7);
      }

      // User growth
      const userGrowth = await UserBehaviorAnalytics.find({
        date: { $gte: start, $lte: end }
      }).sort({ date: 1 });

      const startUsers = userGrowth[0]?.totalUsers || 0;
      const endUsers = userGrowth[userGrowth.length - 1]?.totalUsers || 0;
      const userGrowthRate = startUsers > 0 ? ((endUsers - startUsers) / startUsers) * 100 : 0;

      // Protocol analytics
      const protocolAnalytics = await ProtocolAnalytics.find({
        date: { $gte: start, $lte: end }
      });

      // Revenue analytics
      const revenueData = await RevenueAnalytics.aggregate([
        {
          $match: {
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalRevenue' },
            transactionFees: { $sum: '$transactionFees' },
            bridgeFees: { $sum: '$bridgeFees' },
            nftRoyalties: { $sum: '$nftRoyalties' },
            stakingRewards: { $sum: '$stakingRewards' }
          }
        }
      ]);

      const daysInMonth = (end - start) / (1000 * 60 * 60 * 24);

      const report = {
        type: 'monthly',
        year,
        month,
        startDate: start,
        endDate: end,
        generatedAt: new Date(),
        transactions: {
          ...txAnalytics[0],
          weeklyBreakdown: weeks,
          averageDaily: txAnalytics[0] ? txAnalytics[0].totalTransactions / daysInMonth : 0
        },
        users: {
          startCount: startUsers,
          endCount: endUsers,
          growthRate: userGrowthRate,
          newUsersTotal: userGrowth.reduce((sum, day) => sum + (day.newUsers || 0), 0),
          averageDailyActive: userGrowth.reduce((sum, day) => sum + (day.activeUsers || 0), 0) / (userGrowth.length || 1)
        },
        protocols: this.summarizeProtocolData(protocolAnalytics),
        revenue: revenueData[0] || {},
        summary: this.generateSummary('monthly', {
          transactions: txAnalytics[0],
          users: { endCount: endUsers, growthRate: userGrowthRate },
          protocols: protocolAnalytics,
          revenue: revenueData[0]
        })
      };

      logger.info(`Generated monthly report for ${year}-${month}`);
      return report;

    } catch (error) {
      logger.error(`Error generating monthly report: ${error.message}`);
      return null;
    }
  }

  // Summarize protocol data
  summarizeProtocolData(protocolData) {
    const summary = {};

    protocolData.forEach(data => {
      if (!summary[data.protocol]) {
        summary[data.protocol] = {
          totalValueLocked: 0,
          volume24h: 0,
          volume30d: 0,
          uniqueUsers: 0,
          totalTransactions: 0,
          protocolFees: 0
        };
      }

      summary[data.protocol].totalValueLocked = Math.max(
        summary[data.protocol].totalValueLocked,
        data.totalValueLocked || 0
      );
      summary[data.protocol].volume24h += data.volume24h || 0;
      summary[data.protocol].volume30d += data.volume30d || 0;
      summary[data.protocol].uniqueUsers = Math.max(
        summary[data.protocol].uniqueUsers,
        data.uniqueUsers || 0
      );
      summary[data.protocol].totalTransactions += data.totalTransactions || 0;
      summary[data.protocol].protocolFees += data.protocolFees || 0;
    });

    return summary;
  }

  // Generate executive summary
  generateSummary(period, data) {
    const summary = {
      period,
      highlights: [],
      concerns: [],
      recommendations: []
    };

    // Transaction highlights
    if (data.transactions) {
      if (data.transactions.totalTransactions > 0) {
        summary.highlights.push(`Processed ${data.transactions.totalTransactions.toLocaleString()} transactions`);
      }
      if (data.transactions.totalVolume > 0) {
        summary.highlights.push(`Total volume: ${data.transactions.totalVolume.toLocaleString()} STRAT`);
      }
      if (data.transactions.peakTPS > 10) {
        summary.highlights.push(`Peak TPS: ${data.transactions.peakTPS.toFixed(2)}`);
      }
    }

    // User highlights
    if (data.users) {
      if (data.users.newUsers > 0) {
        summary.highlights.push(`${data.users.newUsers} new users joined`);
      }
      if (data.users.growthRate > 10) {
        summary.highlights.push(`User growth: ${data.users.growthRate.toFixed(1)}%`);
      }
    }

    // Revenue highlights
    if (data.revenue && data.revenue.totalRevenue > 0) {
      summary.highlights.push(`Revenue: ${data.revenue.totalRevenue.toLocaleString()} STRAT`);
    }

    // Add concerns and recommendations based on data
    if (data.transactions && data.transactions.totalTransactions < 100) {
      summary.concerns.push('Low transaction volume');
      summary.recommendations.push('Consider marketing initiatives to increase usage');
    }

    if (data.users && data.users.newUsers < 10) {
      summary.concerns.push('Low user acquisition');
      summary.recommendations.push('Focus on user onboarding and acquisition strategies');
    }

    return summary;
  }

  // Generate financial report
  async generateFinancialReport(startDate, endDate) {
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Revenue breakdown
      const revenueData = await RevenueAnalytics.aggregate([
        {
          $match: {
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalRevenue' },
            transactionFees: { $sum: '$transactionFees' },
            bridgeFees: { $sum: '$bridgeFees' },
            nftRoyalties: { $sum: '$nftRoyalties' },
            stakingRewards: { $sum: '$stakingRewards' },
            contractDeploymentFees: { $sum: '$contractDeploymentFees' },
            otherRevenue: { $sum: '$otherRevenue' }
          }
        }
      ]);

      // Daily revenue trend
      const dailyRevenue = await RevenueAnalytics.find({
        date: { $gte: start, $lte: end }
      }).sort({ date: 1 });

      // Protocol revenue breakdown
      const protocolRevenue = await RevenueAnalytics.aggregate([
        {
          $match: {
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            defi: { $sum: '$revenueByProtocol.defi' },
            nft: { $sum: '$revenueByProtocol.nft' },
            bridge: { $sum: '$revenueByProtocol.bridge' },
            staking: { $sum: '$revenueByProtocol.staking' },
            trading: { $sum: '$revenueByProtocol.trading' }
          }
        }
      ]);

      const report = {
        type: 'financial',
        startDate: start,
        endDate: end,
        generatedAt: new Date(),
        summary: revenueData[0] || {},
        dailyTrend: dailyRevenue,
        protocolBreakdown: protocolRevenue[0] || {},
        metrics: {
          averageDailyRevenue: revenueData[0] ?
            revenueData[0].totalRevenue / ((end - start) / (1000 * 60 * 60 * 24)) : 0,
          growthRate: this.calculateGrowthRate(dailyRevenue)
        }
      };

      logger.info(`Generated financial report for ${start.toISOString()} to ${end.toISOString()}`);
      return report;

    } catch (error) {
      logger.error(`Error generating financial report: ${error.message}`);
      return null;
    }
  }

  // Calculate growth rate from time series data
  calculateGrowthRate(data) {
    if (data.length < 2) return 0;

    const firstValue = data[0].totalRevenue || 0;
    const lastValue = data[data.length - 1].totalRevenue || 0;

    if (firstValue === 0) return 0;

    return ((lastValue - firstValue) / firstValue) * 100;
  }

  // Schedule automatic report generation
  scheduleReports() {
    // Generate daily report at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 30, 0, 0); // 12:30 AM
    const msUntilMidnight = tomorrow - now;

    setTimeout(() => {
      this.generateDailyReport(new Date(Date.now() - 24 * 60 * 60 * 1000));

      setInterval(() => {
        this.generateDailyReport(new Date(Date.now() - 24 * 60 * 60 * 1000));
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    logger.info('Report generation scheduled');
  }
}

module.exports = ReportGenerator;
