const logger = require('../utils/logger');

class MonitoringController {
  // Get network health
  static async getNetworkHealth(req, res) {
    try {
      const networkMonitor = req.app.locals.networkMonitor;
      const health = await networkMonitor.getCurrentHealth();

      res.json({
        success: true,
        data: health
      });

    } catch (error) {
      logger.error(`Error getting network health: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch network health',
        message: error.message
      });
    }
  }

  // Get historical network health
  static async getHistoricalNetworkHealth(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required'
        });
      }

      const networkMonitor = req.app.locals.networkMonitor;
      const data = await networkMonitor.getHistoricalHealth(startDate, endDate);

      res.json({
        success: true,
        data,
        period: { startDate, endDate }
      });

    } catch (error) {
      logger.error(`Error getting historical network health: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch historical network health',
        message: error.message
      });
    }
  }

  // Get network statistics
  static async getNetworkStatistics(req, res) {
    try {
      const { days = 7 } = req.query;

      const networkMonitor = req.app.locals.networkMonitor;
      const stats = await networkMonitor.getNetworkStatistics(parseInt(days));

      res.json({
        success: true,
        data: stats,
        period: `Last ${days} days`
      });

    } catch (error) {
      logger.error(`Error getting network statistics: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch network statistics',
        message: error.message
      });
    }
  }

  // Get performance metrics
  static getPerformanceMetrics(req, res) {
    try {
      const performanceMonitor = req.app.locals.performanceMonitor;
      const metrics = performanceMonitor.getRealTimeMetrics();

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error(`Error getting performance metrics: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch performance metrics',
        message: error.message
      });
    }
  }

  // Get historical performance metrics
  static async getHistoricalPerformanceMetrics(req, res) {
    try {
      const { service, startDate, endDate } = req.query;

      if (!service || !startDate || !endDate) {
        return res.status(400).json({
          error: 'service, startDate, and endDate are required'
        });
      }

      const performanceMonitor = req.app.locals.performanceMonitor;
      const data = await performanceMonitor.getHistoricalMetrics(service, startDate, endDate);

      res.json({
        success: true,
        data,
        service,
        period: { startDate, endDate }
      });

    } catch (error) {
      logger.error(`Error getting historical performance metrics: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch historical performance metrics',
        message: error.message
      });
    }
  }

  // Get service health
  static getServiceHealth(req, res) {
    try {
      const performanceMonitor = req.app.locals.performanceMonitor;
      const health = performanceMonitor.getServiceHealth();

      res.json({
        success: true,
        data: health
      });

    } catch (error) {
      logger.error(`Error getting service health: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch service health',
        message: error.message
      });
    }
  }

  // Get active alerts
  static async getActiveAlerts(req, res) {
    try {
      const { severity, category } = req.query;

      const alerting = req.app.locals.alerting;
      const alerts = await alerting.getActiveAlerts(severity, category);

      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });

    } catch (error) {
      logger.error(`Error getting active alerts: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch active alerts',
        message: error.message
      });
    }
  }

  // Get alert history
  static async getAlertHistory(req, res) {
    try {
      const { startDate, endDate, severity, category } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required'
        });
      }

      const alerting = req.app.locals.alerting;
      const alerts = await alerting.getAlertHistory(startDate, endDate, severity, category);

      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
        period: { startDate, endDate }
      });

    } catch (error) {
      logger.error(`Error getting alert history: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch alert history',
        message: error.message
      });
    }
  }

  // Get alert statistics
  static async getAlertStatistics(req, res) {
    try {
      const { days = 7 } = req.query;

      const alerting = req.app.locals.alerting;
      const stats = await alerting.getAlertStatistics(parseInt(days));

      res.json({
        success: true,
        data: stats,
        period: `Last ${days} days`
      });

    } catch (error) {
      logger.error(`Error getting alert statistics: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch alert statistics',
        message: error.message
      });
    }
  }

  // Resolve alert
  static async resolveAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { resolvedBy = 'manual', result = '' } = req.body;

      const alerting = req.app.locals.alerting;
      const alert = await alerting.resolveAlert(alertId, resolvedBy, result);

      if (!alert) {
        return res.status(404).json({
          error: 'Alert not found'
        });
      }

      res.json({
        success: true,
        data: alert,
        message: 'Alert resolved successfully'
      });

    } catch (error) {
      logger.error(`Error resolving alert: ${error.message}`);
      res.status(500).json({
        error: 'Failed to resolve alert',
        message: error.message
      });
    }
  }

  // Get monitoring dashboard
  static async getMonitoringDashboard(req, res) {
    try {
      const networkMonitor = req.app.locals.networkMonitor;
      const performanceMonitor = req.app.locals.performanceMonitor;
      const alerting = req.app.locals.alerting;

      const dashboard = {
        network: await networkMonitor.getCurrentHealth(),
        performance: performanceMonitor.getRealTimeMetrics(),
        serviceHealth: performanceMonitor.getServiceHealth(),
        activeAlerts: await alerting.getActiveAlerts(),
        timestamp: Date.now()
      };

      res.json({
        success: true,
        data: dashboard
      });

    } catch (error) {
      logger.error(`Error getting monitoring dashboard: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch monitoring dashboard',
        message: error.message
      });
    }
  }
}

module.exports = MonitoringController;
