const { RevenueAnalytics } = require('../models/Analytics');
const logger = require('../utils/logger');

class RevenueAnalyticsService {
  constructor() {
    this.dailyRevenue = {
      transactionFees: 0,
      bridgeFees: 0,
      nftRoyalties: 0,
      stakingRewards: 0,
      contractDeploymentFees: 0,
      otherRevenue: 0,
      revenueByProtocol: {
        defi: 0,
        nft: 0,
        bridge: 0,
        staking: 0,
        trading: 0
      }
    };
  }

  // Record transaction fee
  recordTransactionFee(amount, protocol = 'blockchain') {
    this.dailyRevenue.transactionFees += amount;

    if (this.dailyRevenue.revenueByProtocol[protocol] !== undefined) {
      this.dailyRevenue.revenueByProtocol[protocol] += amount;
    }
  }

  // Record bridge fee
  recordBridgeFee(amount) {
    this.dailyRevenue.bridgeFees += amount;
    this.dailyRevenue.revenueByProtocol.bridge += amount;
  }

  // Record NFT royalty
  recordNFTRoyalty(amount) {
    this.dailyRevenue.nftRoyalties += amount;
    this.dailyRevenue.revenueByProtocol.nft += amount;
  }

  // Record staking reward (protocol revenue from staking)
  recordStakingRevenue(amount) {
    this.dailyRevenue.stakingRewards += amount;
    this.dailyRevenue.revenueByProtocol.staking += amount;
  }

  // Record contract deployment fee
  recordContractDeploymentFee(amount) {
    this.dailyRevenue.contractDeploymentFees += amount;
  }

  // Record DeFi protocol fee
  recordDeFiFee(amount) {
    this.dailyRevenue.otherRevenue += amount;
    this.dailyRevenue.revenueByProtocol.defi += amount;
  }

  // Record trading fee
  recordTradingFee(amount) {
    this.dailyRevenue.otherRevenue += amount;
    this.dailyRevenue.revenueByProtocol.trading += amount;
  }

  // Calculate total revenue
  calculateTotalRevenue() {
    return (
      this.dailyRevenue.transactionFees +
      this.dailyRevenue.bridgeFees +
      this.dailyRevenue.nftRoyalties +
      this.dailyRevenue.stakingRewards +
      this.dailyRevenue.contractDeploymentFees +
      this.dailyRevenue.otherRevenue
    );
  }

  // Save daily revenue
  async saveDailyRevenue() {
    try {
      const date = new Date();
      date.setHours(0, 0, 0, 0);

      const totalRevenue = this.calculateTotalRevenue();

      // Get previous cumulative revenue
      const previousDay = new Date(date);
      previousDay.setDate(previousDay.getDate() - 1);

      const previousRevenue = await RevenueAnalytics.findOne({
        date: previousDay
      });

      const cumulativeRevenue = (previousRevenue?.cumulativeRevenue || 0) + totalRevenue;

      const revenueData = {
        date,
        totalRevenue,
        transactionFees: this.dailyRevenue.transactionFees,
        bridgeFees: this.dailyRevenue.bridgeFees,
        nftRoyalties: this.dailyRevenue.nftRoyalties,
        stakingRewards: this.dailyRevenue.stakingRewards,
        contractDeploymentFees: this.dailyRevenue.contractDeploymentFees,
        otherRevenue: this.dailyRevenue.otherRevenue,
        revenueByProtocol: this.dailyRevenue.revenueByProtocol,
        cumulativeRevenue
      };

      await RevenueAnalytics.findOneAndUpdate(
        { date },
        revenueData,
        { upsert: true, new: true }
      );

      logger.info(`Saved daily revenue: ${totalRevenue} STRAT (${this.dailyRevenue.transactionFees} from tx fees)`);

      // Reset daily revenue
      this.dailyRevenue = {
        transactionFees: 0,
        bridgeFees: 0,
        nftRoyalties: 0,
        stakingRewards: 0,
        contractDeploymentFees: 0,
        otherRevenue: 0,
        revenueByProtocol: {
          defi: 0,
          nft: 0,
          bridge: 0,
          staking: 0,
          trading: 0
        }
      };

    } catch (error) {
      logger.error(`Error saving daily revenue: ${error.message}`);
    }
  }

  // Get revenue for date range
  async getRevenue(startDate, endDate) {
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const data = await RevenueAnalytics.find({
        date: { $gte: start, $lte: end }
      }).sort({ date: 1 });

      return data;

    } catch (error) {
      logger.error(`Error getting revenue data: ${error.message}`);
      throw error;
    }
  }

  // Get revenue summary
  async getRevenueSummary(days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const data = await RevenueAnalytics.aggregate([
        {
          $match: {
            date: { $gte: startDate }
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
            otherRevenue: { $sum: '$otherRevenue' },
            defiRevenue: { $sum: '$revenueByProtocol.defi' },
            nftRevenue: { $sum: '$revenueByProtocol.nft' },
            bridgeRevenue: { $sum: '$revenueByProtocol.bridge' },
            stakingRevenue: { $sum: '$revenueByProtocol.staking' },
            tradingRevenue: { $sum: '$revenueByProtocol.trading' }
          }
        }
      ]);

      if (data.length === 0) {
        return null;
      }

      const summary = data[0];

      // Calculate percentages
      const total = summary.totalRevenue || 1;
      summary.breakdown = {
        transactionFees: {
          amount: summary.transactionFees,
          percentage: (summary.transactionFees / total) * 100
        },
        bridgeFees: {
          amount: summary.bridgeFees,
          percentage: (summary.bridgeFees / total) * 100
        },
        nftRoyalties: {
          amount: summary.nftRoyalties,
          percentage: (summary.nftRoyalties / total) * 100
        },
        stakingRewards: {
          amount: summary.stakingRewards,
          percentage: (summary.stakingRewards / total) * 100
        },
        other: {
          amount: summary.otherRevenue,
          percentage: (summary.otherRevenue / total) * 100
        }
      };

      summary.protocolBreakdown = {
        defi: {
          amount: summary.defiRevenue,
          percentage: (summary.defiRevenue / total) * 100
        },
        nft: {
          amount: summary.nftRevenue,
          percentage: (summary.nftRevenue / total) * 100
        },
        bridge: {
          amount: summary.bridgeRevenue,
          percentage: (summary.bridgeRevenue / total) * 100
        },
        staking: {
          amount: summary.stakingRevenue,
          percentage: (summary.stakingRevenue / total) * 100
        },
        trading: {
          amount: summary.tradingRevenue,
          percentage: (summary.tradingRevenue / total) * 100
        }
      };

      summary.averageDaily = summary.totalRevenue / days;

      return summary;

    } catch (error) {
      logger.error(`Error getting revenue summary: ${error.message}`);
      return null;
    }
  }

  // Get revenue trends
  async getRevenueTrends(period = 'daily', count = 30) {
    try {
      const startDate = new Date(Date.now() - count * 24 * 60 * 60 * 1000);

      if (period === 'daily') {
        const data = await RevenueAnalytics.find({
          date: { $gte: startDate }
        }).sort({ date: 1 });

        return data.map(d => ({
          date: d.date,
          revenue: d.totalRevenue,
          cumulativeRevenue: d.cumulativeRevenue
        }));
      }

      // Weekly aggregation
      if (period === 'weekly') {
        const data = await RevenueAnalytics.aggregate([
          {
            $match: {
              date: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$date' },
                week: { $week: '$date' }
              },
              revenue: { $sum: '$totalRevenue' },
              transactionFees: { $sum: '$transactionFees' },
              bridgeFees: { $sum: '$bridgeFees' }
            }
          },
          {
            $sort: { '_id.year': 1, '_id.week': 1 }
          }
        ]);

        return data;
      }

      // Monthly aggregation
      if (period === 'monthly') {
        const data = await RevenueAnalytics.aggregate([
          {
            $match: {
              date: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$date' },
                month: { $month: '$date' }
              },
              revenue: { $sum: '$totalRevenue' },
              transactionFees: { $sum: '$transactionFees' },
              bridgeFees: { $sum: '$bridgeFees' }
            }
          },
          {
            $sort: { '_id.year': 1, '_id.month': 1 }
          }
        ]);

        return data;
      }

    } catch (error) {
      logger.error(`Error getting revenue trends: ${error.message}`);
      return [];
    }
  }

  // Get real-time revenue stats
  getRealTimeStats() {
    return {
      today: {
        totalRevenue: this.calculateTotalRevenue(),
        transactionFees: this.dailyRevenue.transactionFees,
        bridgeFees: this.dailyRevenue.bridgeFees,
        nftRoyalties: this.dailyRevenue.nftRoyalties,
        stakingRewards: this.dailyRevenue.stakingRewards,
        contractDeploymentFees: this.dailyRevenue.contractDeploymentFees,
        otherRevenue: this.dailyRevenue.otherRevenue,
        byProtocol: this.dailyRevenue.revenueByProtocol
      }
    };
  }

  // Start revenue tracking
  startTracking() {
    // Save daily revenue at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow - now;

    setTimeout(() => {
      this.saveDailyRevenue();

      setInterval(() => {
        this.saveDailyRevenue();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    logger.info('Revenue analytics service started');
  }
}

module.exports = RevenueAnalyticsService;
