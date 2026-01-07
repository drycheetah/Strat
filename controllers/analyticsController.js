const logger = require('../utils/logger');

class AnalyticsController {
  // Get transaction analytics
  static async getTransactionAnalytics(req, res) {
    try {
      const { startDate, endDate, granularity = 'daily' } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required'
        });
      }

      const transactionAnalytics = req.app.locals.transactionAnalytics;
      const data = await transactionAnalytics.getAnalytics(startDate, endDate, granularity);

      res.json({
        success: true,
        data,
        granularity,
        period: { startDate, endDate }
      });

    } catch (error) {
      logger.error(`Error getting transaction analytics: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch transaction analytics',
        message: error.message
      });
    }
  }

  // Get real-time transaction stats
  static getRealTimeTransactionStats(req, res) {
    try {
      const transactionAnalytics = req.app.locals.transactionAnalytics;
      const stats = transactionAnalytics.getRealTimeStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error(`Error getting real-time stats: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch real-time stats',
        message: error.message
      });
    }
  }

  // Get user behavior analytics
  static async getUserAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required'
        });
      }

      const userAnalytics = req.app.locals.userAnalytics;
      const data = await userAnalytics.getAnalytics(startDate, endDate);

      res.json({
        success: true,
        data,
        period: { startDate, endDate }
      });

    } catch (error) {
      logger.error(`Error getting user analytics: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch user analytics',
        message: error.message
      });
    }
  }

  // Get real-time user stats
  static getRealTimeUserStats(req, res) {
    try {
      const userAnalytics = req.app.locals.userAnalytics;
      const stats = userAnalytics.getRealTimeStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error(`Error getting real-time user stats: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch real-time user stats',
        message: error.message
      });
    }
  }

  // Get protocol analytics
  static async getProtocolAnalytics(req, res) {
    try {
      const { protocol, startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required'
        });
      }

      const protocolAnalytics = req.app.locals.protocolAnalytics;
      const data = await protocolAnalytics.getAnalytics(protocol, startDate, endDate);

      res.json({
        success: true,
        data,
        protocol: protocol || 'all',
        period: { startDate, endDate }
      });

    } catch (error) {
      logger.error(`Error getting protocol analytics: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch protocol analytics',
        message: error.message
      });
    }
  }

  // Get real-time protocol stats
  static async getRealTimeProtocolStats(req, res) {
    try {
      const protocolAnalytics = req.app.locals.protocolAnalytics;
      const stats = await protocolAnalytics.getRealTimeStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error(`Error getting real-time protocol stats: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch real-time protocol stats',
        message: error.message
      });
    }
  }

  // Get revenue analytics
  static async getRevenueAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required'
        });
      }

      const revenueAnalytics = req.app.locals.revenueAnalytics;
      const data = await revenueAnalytics.getRevenue(startDate, endDate);

      res.json({
        success: true,
        data,
        period: { startDate, endDate }
      });

    } catch (error) {
      logger.error(`Error getting revenue analytics: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch revenue analytics',
        message: error.message
      });
    }
  }

  // Get revenue summary
  static async getRevenueSummary(req, res) {
    try {
      const { days = 30 } = req.query;

      const revenueAnalytics = req.app.locals.revenueAnalytics;
      const summary = await revenueAnalytics.getRevenueSummary(parseInt(days));

      res.json({
        success: true,
        data: summary,
        period: `Last ${days} days`
      });

    } catch (error) {
      logger.error(`Error getting revenue summary: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch revenue summary',
        message: error.message
      });
    }
  }

  // Get revenue trends
  static async getRevenueTrends(req, res) {
    try {
      const { period = 'daily', count = 30 } = req.query;

      const revenueAnalytics = req.app.locals.revenueAnalytics;
      const trends = await revenueAnalytics.getRevenueTrends(period, parseInt(count));

      res.json({
        success: true,
        data: trends,
        period,
        count: parseInt(count)
      });

    } catch (error) {
      logger.error(`Error getting revenue trends: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch revenue trends',
        message: error.message
      });
    }
  }

  // Get real-time revenue stats
  static getRealTimeRevenueStats(req, res) {
    try {
      const revenueAnalytics = req.app.locals.revenueAnalytics;
      const stats = revenueAnalytics.getRealTimeStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error(`Error getting real-time revenue stats: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch real-time revenue stats',
        message: error.message
      });
    }
  }

  // Get dashboard overview
  static async getDashboardOverview(req, res) {
    try {
      const transactionAnalytics = req.app.locals.transactionAnalytics;
      const userAnalytics = req.app.locals.userAnalytics;
      const protocolAnalytics = req.app.locals.protocolAnalytics;
      const revenueAnalytics = req.app.locals.revenueAnalytics;

      const overview = {
        transactions: transactionAnalytics.getRealTimeStats(),
        users: userAnalytics.getRealTimeStats(),
        protocols: await protocolAnalytics.getRealTimeStats(),
        revenue: revenueAnalytics.getRealTimeStats(),
        timestamp: Date.now()
      };

      res.json({
        success: true,
        data: overview
      });

    } catch (error) {
      logger.error(`Error getting dashboard overview: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch dashboard overview',
        message: error.message
      });
    }
  }
}

module.exports = AnalyticsController;
