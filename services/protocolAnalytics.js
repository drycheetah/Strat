const { ProtocolAnalytics } = require('../models/Analytics');
const LiquidityPool = require('../models/LiquidityPool');
const Stake = require('../models/Stake');
const NFT = require('../models/NFT');
const NFTListing = require('../models/NFTListing');
const BridgeTransaction = require('../models/BridgeTransaction');
const Proposal = require('../models/Proposal');
const Post = require('../models/Post');
const logger = require('../utils/logger');

class ProtocolAnalyticsService {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.protocolData = {
      defi: { volume: 0, transactions: 0, users: new Set() },
      staking: { volume: 0, transactions: 0, users: new Set() },
      bridge: { volume: 0, transactions: 0, users: new Set() },
      nft: { volume: 0, transactions: 0, users: new Set() },
      governance: { volume: 0, transactions: 0, users: new Set() },
      social: { volume: 0, transactions: 0, users: new Set() }
    };
  }

  // Track protocol activity
  trackActivity(protocol, userId, amount = 0) {
    if (!this.protocolData[protocol]) return;

    this.protocolData[protocol].transactions++;
    this.protocolData[protocol].volume += amount;
    this.protocolData[protocol].users.add(userId);
  }

  // Calculate DeFi protocol metrics
  async calculateDeFiMetrics() {
    try {
      // Get all liquidity pools
      const pools = await LiquidityPool.find({ status: 'active' });

      let totalValueLocked = 0;
      let volume24h = 0;
      let volume7d = 0;
      let volume30d = 0;
      let totalFees = 0;

      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      for (const pool of pools) {
        totalValueLocked += pool.totalLiquidity || 0;

        // Calculate volumes based on swap history
        if (pool.swapHistory) {
          pool.swapHistory.forEach(swap => {
            const swapTime = new Date(swap.timestamp).getTime();
            const swapVolume = swap.amountIn || 0;

            if (swapTime >= oneDayAgo) {
              volume24h += swapVolume;
            }
            if (swapTime >= sevenDaysAgo) {
              volume7d += swapVolume;
            }
            if (swapTime >= thirtyDaysAgo) {
              volume30d += swapVolume;
              totalFees += swap.fee || 0;
            }
          });
        }
      }

      const utilizationRate = totalValueLocked > 0
        ? (volume24h / totalValueLocked) * 100
        : 0;

      return {
        totalValueLocked,
        volume24h,
        volume7d,
        volume30d,
        totalFees,
        utilizationRate,
        activePools: pools.length,
        metrics: {
          averagePoolSize: pools.length > 0 ? totalValueLocked / pools.length : 0,
          totalPools: pools.length
        }
      };

    } catch (error) {
      logger.error(`Error calculating DeFi metrics: ${error.message}`);
      return null;
    }
  }

  // Calculate staking protocol metrics
  async calculateStakingMetrics() {
    try {
      const activeStakes = await Stake.find({ status: 'active' });

      let totalValueLocked = 0;
      let totalRewards = 0;
      let volume24h = 0;
      let volume7d = 0;
      let volume30d = 0;

      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      // Get recent stakes
      const recentStakes = await Stake.find({
        createdAt: { $gte: new Date(thirtyDaysAgo) }
      });

      recentStakes.forEach(stake => {
        const stakeTime = new Date(stake.createdAt).getTime();
        const stakeAmount = stake.amount || 0;

        if (stakeTime >= oneDayAgo) {
          volume24h += stakeAmount;
        }
        if (stakeTime >= sevenDaysAgo) {
          volume7d += stakeAmount;
        }
        if (stakeTime >= thirtyDaysAgo) {
          volume30d += stakeAmount;
        }
      });

      activeStakes.forEach(stake => {
        totalValueLocked += stake.amount || 0;
        totalRewards += stake.rewards || 0;
      });

      const averageAPY = activeStakes.length > 0
        ? activeStakes.reduce((sum, s) => sum + (s.apy || 0), 0) / activeStakes.length
        : 0;

      return {
        totalValueLocked,
        volume24h,
        volume7d,
        volume30d,
        totalRewards,
        metrics: {
          activeStakes: activeStakes.length,
          averageStakeSize: activeStakes.length > 0 ? totalValueLocked / activeStakes.length : 0,
          averageAPY
        }
      };

    } catch (error) {
      logger.error(`Error calculating staking metrics: ${error.message}`);
      return null;
    }
  }

  // Calculate bridge protocol metrics
  async calculateBridgeMetrics() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentTransactions = await BridgeTransaction.find({
        createdAt: { $gte: thirtyDaysAgo }
      });

      let volume24h = 0;
      let volume7d = 0;
      let volume30d = 0;
      let totalFees = 0;

      const uniqueUsers = new Set();

      recentTransactions.forEach(tx => {
        const amount = tx.amount || 0;
        const fee = tx.bridgeFee || 0;
        uniqueUsers.add(tx.fromAddress);

        if (tx.createdAt >= oneDayAgo) {
          volume24h += amount;
        }
        if (tx.createdAt >= sevenDaysAgo) {
          volume7d += amount;
        }
        volume30d += amount;
        totalFees += fee;
      });

      const completedTxs = recentTransactions.filter(tx => tx.status === 'completed').length;
      const successRate = recentTransactions.length > 0
        ? (completedTxs / recentTransactions.length) * 100
        : 0;

      return {
        totalValueLocked: 0, // Bridge doesn't lock value
        volume24h,
        volume7d,
        volume30d,
        totalFees,
        uniqueUsers: uniqueUsers.size,
        metrics: {
          totalTransactions: recentTransactions.length,
          successRate,
          averageTransactionSize: recentTransactions.length > 0
            ? volume30d / recentTransactions.length : 0
        }
      };

    } catch (error) {
      logger.error(`Error calculating bridge metrics: ${error.message}`);
      return null;
    }
  }

  // Calculate NFT marketplace metrics
  async calculateNFTMetrics() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get sold NFTs
      const soldListings = await NFTListing.find({
        status: 'sold',
        soldAt: { $gte: thirtyDaysAgo }
      });

      let volume24h = 0;
      let volume7d = 0;
      let volume30d = 0;
      let totalFees = 0;

      const uniqueUsers = new Set();

      soldListings.forEach(listing => {
        const price = listing.price || 0;
        const fee = (listing.royaltyPercentage || 0) * price / 100;

        uniqueUsers.add(listing.seller);
        uniqueUsers.add(listing.buyer);

        if (listing.soldAt >= oneDayAgo) {
          volume24h += price;
        }
        if (listing.soldAt >= sevenDaysAgo) {
          volume7d += price;
        }
        volume30d += price;
        totalFees += fee;
      });

      // Get active listings
      const activeListings = await NFTListing.find({ status: 'active' });
      const floorPrice = activeListings.length > 0
        ? Math.min(...activeListings.map(l => l.price || 0))
        : 0;

      // Get total NFTs
      const totalNFTs = await NFT.countDocuments();

      return {
        totalValueLocked: 0,
        volume24h,
        volume7d,
        volume30d,
        totalFees,
        uniqueUsers: uniqueUsers.size,
        metrics: {
          totalNFTs,
          activeListings: activeListings.length,
          floorPrice,
          averageSalePrice: soldListings.length > 0
            ? volume30d / soldListings.length : 0,
          sales30d: soldListings.length
        }
      };

    } catch (error) {
      logger.error(`Error calculating NFT metrics: ${error.message}`);
      return null;
    }
  }

  // Calculate governance protocol metrics
  async calculateGovernanceMetrics() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentProposals = await Proposal.find({
        createdAt: { $gte: thirtyDaysAgo }
      });

      let proposals24h = 0;
      let proposals7d = 0;
      let proposals30d = recentProposals.length;

      const uniqueUsers = new Set();
      let totalVotes = 0;

      recentProposals.forEach(proposal => {
        if (proposal.createdAt >= oneDayAgo) proposals24h++;
        if (proposal.createdAt >= sevenDaysAgo) proposals7d++;

        uniqueUsers.add(proposal.proposer);
        totalVotes += (proposal.votesFor || 0) + (proposal.votesAgainst || 0);
      });

      const activeProposals = await Proposal.find({ status: 'active' });
      const passedProposals = recentProposals.filter(p => p.status === 'passed').length;
      const successRate = recentProposals.length > 0
        ? (passedProposals / recentProposals.length) * 100
        : 0;

      return {
        totalValueLocked: 0,
        volume24h: proposals24h,
        volume7d: proposals7d,
        volume30d: proposals30d,
        uniqueUsers: uniqueUsers.size,
        metrics: {
          activeProposals: activeProposals.length,
          totalVotes,
          averageVotesPerProposal: recentProposals.length > 0
            ? totalVotes / recentProposals.length : 0,
          successRate
        }
      };

    } catch (error) {
      logger.error(`Error calculating governance metrics: ${error.message}`);
      return null;
    }
  }

  // Calculate social protocol metrics
  async calculateSocialMetrics() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentPosts = await Post.find({
        createdAt: { $gte: thirtyDaysAgo }
      });

      let posts24h = 0;
      let posts7d = 0;
      let posts30d = recentPosts.length;

      const uniqueUsers = new Set();
      let totalLikes = 0;
      let totalComments = 0;

      recentPosts.forEach(post => {
        if (post.createdAt >= oneDayAgo) posts24h++;
        if (post.createdAt >= sevenDaysAgo) posts7d++;

        uniqueUsers.add(post.author);
        totalLikes += post.likes?.length || 0;
        totalComments += post.comments?.length || 0;
      });

      const engagementRate = recentPosts.length > 0
        ? ((totalLikes + totalComments) / recentPosts.length)
        : 0;

      return {
        totalValueLocked: 0,
        volume24h: posts24h,
        volume7d: posts7d,
        volume30d: posts30d,
        uniqueUsers: uniqueUsers.size,
        metrics: {
          totalPosts: posts30d,
          totalLikes,
          totalComments,
          engagementRate,
          averageLikesPerPost: recentPosts.length > 0 ? totalLikes / recentPosts.length : 0,
          averageCommentsPerPost: recentPosts.length > 0 ? totalComments / recentPosts.length : 0
        }
      };

    } catch (error) {
      logger.error(`Error calculating social metrics: ${error.message}`);
      return null;
    }
  }

  // Save daily protocol analytics
  async saveDailyAnalytics() {
    try {
      const date = new Date();
      date.setHours(0, 0, 0, 0);

      const protocols = [
        { name: 'defi', calculator: () => this.calculateDeFiMetrics() },
        { name: 'staking', calculator: () => this.calculateStakingMetrics() },
        { name: 'bridge', calculator: () => this.calculateBridgeMetrics() },
        { name: 'nft', calculator: () => this.calculateNFTMetrics() },
        { name: 'governance', calculator: () => this.calculateGovernanceMetrics() },
        { name: 'social', calculator: () => this.calculateSocialMetrics() }
      ];

      for (const protocol of protocols) {
        const metrics = await protocol.calculator();

        if (metrics) {
          const protocolData = this.protocolData[protocol.name];

          const analytics = {
            date,
            protocol: protocol.name,
            totalValueLocked: metrics.totalValueLocked || 0,
            volume24h: metrics.volume24h || 0,
            volume7d: metrics.volume7d || 0,
            volume30d: metrics.volume30d || 0,
            uniqueUsers: metrics.uniqueUsers || protocolData.users.size,
            totalTransactions: protocolData.transactions,
            averageTransactionSize: protocolData.transactions > 0
              ? protocolData.volume / protocolData.transactions : 0,
            protocolRevenue: 0,
            protocolFees: metrics.totalFees || 0,
            utilizationRate: metrics.utilizationRate || 0,
            metrics: metrics.metrics || {}
          };

          await ProtocolAnalytics.findOneAndUpdate(
            { date, protocol: protocol.name },
            analytics,
            { upsert: true, new: true }
          );

          logger.info(`Saved ${protocol.name} protocol analytics: ${analytics.uniqueUsers} users, ${analytics.volume24h} volume`);
        }
      }

      // Reset daily counters
      for (const protocol in this.protocolData) {
        this.protocolData[protocol].volume = 0;
        this.protocolData[protocol].transactions = 0;
        this.protocolData[protocol].users.clear();
      }

    } catch (error) {
      logger.error(`Error saving protocol analytics: ${error.message}`);
    }
  }

  // Get analytics for protocol and date range
  async getAnalytics(protocol, startDate, endDate) {
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const query = {
        date: { $gte: start, $lte: end }
      };

      if (protocol) {
        query.protocol = protocol;
      }

      const data = await ProtocolAnalytics.find(query).sort({ date: 1 });

      return data;

    } catch (error) {
      logger.error(`Error getting protocol analytics: ${error.message}`);
      throw error;
    }
  }

  // Get real-time stats for all protocols
  async getRealTimeStats() {
    const stats = {};

    for (const protocol in this.protocolData) {
      const data = this.protocolData[protocol];
      stats[protocol] = {
        transactions: data.transactions,
        volume: data.volume,
        uniqueUsers: data.users.size
      };
    }

    return stats;
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

    logger.info('Protocol analytics service started');
  }
}

module.exports = ProtocolAnalyticsService;
