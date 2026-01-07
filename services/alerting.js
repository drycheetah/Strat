const { Alert } = require('../models/Analytics');
const logger = require('../utils/logger');

class AlertingService {
  constructor(io) {
    this.io = io;
    this.alertThresholds = {
      performance: {
        responseTime: 5000, // 5 seconds
        errorRate: 5, // 5%
        cpuUsage: 80, // 80%
        memoryUsage: 85 // 85%
      },
      network: {
        blockTime: 120, // 2 minutes
        mempoolSize: 10000,
        orphanedBlocks: 3,
        peerCount: 2
      },
      transaction: {
        failureRate: 10, // 10%
        averageFee: 1000, // Very high fee
        pendingTime: 3600 // 1 hour
      },
      security: {
        invalidTransactions: 10,
        suspiciousActivity: 5,
        largeTransfer: 100000 // Monitor large transfers
      }
    };

    this.activeAlerts = new Map();
    this.alertCooldowns = new Map(); // Prevent alert spam
  }

  // Create alert
  async createAlert(severity, category, title, message, source, metadata = {}) {
    try {
      // Check cooldown to prevent spam
      const alertKey = `${category}-${title}`;
      const lastAlert = this.alertCooldowns.get(alertKey);
      const cooldownPeriod = 5 * 60 * 1000; // 5 minutes

      if (lastAlert && Date.now() - lastAlert < cooldownPeriod) {
        return null; // Skip duplicate alert
      }

      const alert = await Alert.create({
        severity,
        category,
        title,
        message,
        source,
        metadata,
        resolved: false
      });

      this.activeAlerts.set(alert._id.toString(), alert);
      this.alertCooldowns.set(alertKey, Date.now());

      // Broadcast alert via WebSocket
      if (this.io) {
        this.io.emit('alert', {
          id: alert._id,
          severity,
          category,
          title,
          message,
          timestamp: alert.timestamp
        });
      }

      // Log based on severity
      switch (severity) {
        case 'critical':
          logger.error(`CRITICAL ALERT: ${title} - ${message}`);
          break;
        case 'error':
          logger.error(`ERROR ALERT: ${title} - ${message}`);
          break;
        case 'warning':
          logger.warn(`WARNING: ${title} - ${message}`);
          break;
        case 'info':
          logger.info(`INFO: ${title} - ${message}`);
          break;
      }

      return alert;

    } catch (error) {
      logger.error(`Error creating alert: ${error.message}`);
      return null;
    }
  }

  // Resolve alert
  async resolveAlert(alertId, resolvedBy = 'system', result = '') {
    try {
      const alert = await Alert.findByIdAndUpdate(
        alertId,
        {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy,
          $push: {
            actions: {
              action: 'resolved',
              timestamp: new Date(),
              result
            }
          }
        },
        { new: true }
      );

      if (alert) {
        this.activeAlerts.delete(alertId);

        if (this.io) {
          this.io.emit('alert_resolved', {
            id: alertId,
            resolvedBy,
            timestamp: new Date()
          });
        }

        logger.info(`Alert resolved: ${alert.title}`);
      }

      return alert;

    } catch (error) {
      logger.error(`Error resolving alert: ${error.message}`);
      return null;
    }
  }

  // Check performance metrics
  checkPerformanceMetrics(metrics) {
    const { responseTime, errorRate, cpuUsage, memoryUsage } = metrics;

    if (responseTime > this.alertThresholds.performance.responseTime) {
      this.createAlert(
        'warning',
        'performance',
        'High Response Time',
        `Average response time is ${responseTime}ms, exceeding threshold of ${this.alertThresholds.performance.responseTime}ms`,
        'performance-monitor',
        { responseTime, threshold: this.alertThresholds.performance.responseTime }
      );
    }

    if (errorRate > this.alertThresholds.performance.errorRate) {
      this.createAlert(
        'error',
        'performance',
        'High Error Rate',
        `Error rate is ${errorRate}%, exceeding threshold of ${this.alertThresholds.performance.errorRate}%`,
        'performance-monitor',
        { errorRate, threshold: this.alertThresholds.performance.errorRate }
      );
    }

    if (cpuUsage > this.alertThresholds.performance.cpuUsage) {
      this.createAlert(
        'warning',
        'performance',
        'High CPU Usage',
        `CPU usage is ${cpuUsage}%, exceeding threshold of ${this.alertThresholds.performance.cpuUsage}%`,
        'performance-monitor',
        { cpuUsage, threshold: this.alertThresholds.performance.cpuUsage }
      );
    }

    if (memoryUsage > this.alertThresholds.performance.memoryUsage) {
      this.createAlert(
        'critical',
        'performance',
        'High Memory Usage',
        `Memory usage is ${memoryUsage}%, exceeding threshold of ${this.alertThresholds.performance.memoryUsage}%`,
        'performance-monitor',
        { memoryUsage, threshold: this.alertThresholds.performance.memoryUsage }
      );
    }
  }

  // Check network health
  checkNetworkHealth(health) {
    const { averageBlockTime, mempoolSize, orphanedBlocks, p2pConnections } = health;

    if (averageBlockTime > this.alertThresholds.network.blockTime) {
      this.createAlert(
        'warning',
        'network',
        'Slow Block Production',
        `Average block time is ${averageBlockTime}s, exceeding threshold of ${this.alertThresholds.network.blockTime}s`,
        'network-monitor',
        { averageBlockTime, threshold: this.alertThresholds.network.blockTime }
      );
    }

    if (mempoolSize > this.alertThresholds.network.mempoolSize) {
      this.createAlert(
        'warning',
        'network',
        'High Mempool Size',
        `Mempool has ${mempoolSize} transactions, exceeding threshold of ${this.alertThresholds.network.mempoolSize}`,
        'network-monitor',
        { mempoolSize, threshold: this.alertThresholds.network.mempoolSize }
      );
    }

    if (orphanedBlocks > this.alertThresholds.network.orphanedBlocks) {
      this.createAlert(
        'error',
        'network',
        'Multiple Orphaned Blocks',
        `${orphanedBlocks} orphaned blocks detected, exceeding threshold of ${this.alertThresholds.network.orphanedBlocks}`,
        'network-monitor',
        { orphanedBlocks, threshold: this.alertThresholds.network.orphanedBlocks }
      );
    }

    if (p2pConnections < this.alertThresholds.network.peerCount) {
      this.createAlert(
        'critical',
        'network',
        'Low Peer Count',
        `Only ${p2pConnections} peers connected, below threshold of ${this.alertThresholds.network.peerCount}`,
        'network-monitor',
        { p2pConnections, threshold: this.alertThresholds.network.peerCount }
      );
    }
  }

  // Check transaction metrics
  checkTransactionMetrics(metrics) {
    const { failureRate, averageFee, oldestPending } = metrics;

    if (failureRate > this.alertThresholds.transaction.failureRate) {
      this.createAlert(
        'error',
        'transaction',
        'High Transaction Failure Rate',
        `Transaction failure rate is ${failureRate}%, exceeding threshold of ${this.alertThresholds.transaction.failureRate}%`,
        'transaction-monitor',
        { failureRate, threshold: this.alertThresholds.transaction.failureRate }
      );
    }

    if (averageFee > this.alertThresholds.transaction.averageFee) {
      this.createAlert(
        'warning',
        'transaction',
        'High Average Fee',
        `Average transaction fee is ${averageFee}, exceeding threshold of ${this.alertThresholds.transaction.averageFee}`,
        'transaction-monitor',
        { averageFee, threshold: this.alertThresholds.transaction.averageFee }
      );
    }

    if (oldestPending > this.alertThresholds.transaction.pendingTime) {
      this.createAlert(
        'warning',
        'transaction',
        'Long Pending Transaction',
        `Transaction pending for ${oldestPending}s, exceeding threshold of ${this.alertThresholds.transaction.pendingTime}s`,
        'transaction-monitor',
        { oldestPending, threshold: this.alertThresholds.transaction.pendingTime }
      );
    }
  }

  // Check security issues
  checkSecurity(metrics) {
    const { invalidTransactions, suspiciousActivity, largeTransfers } = metrics;

    if (invalidTransactions > this.alertThresholds.security.invalidTransactions) {
      this.createAlert(
        'critical',
        'security',
        'Multiple Invalid Transactions',
        `${invalidTransactions} invalid transactions detected, exceeding threshold of ${this.alertThresholds.security.invalidTransactions}`,
        'security-monitor',
        { invalidTransactions, threshold: this.alertThresholds.security.invalidTransactions }
      );
    }

    if (suspiciousActivity > this.alertThresholds.security.suspiciousActivity) {
      this.createAlert(
        'error',
        'security',
        'Suspicious Activity Detected',
        `${suspiciousActivity} suspicious activities detected, exceeding threshold of ${this.alertThresholds.security.suspiciousActivity}`,
        'security-monitor',
        { suspiciousActivity, threshold: this.alertThresholds.security.suspiciousActivity }
      );
    }

    if (largeTransfers && largeTransfers.length > 0) {
      largeTransfers.forEach(tx => {
        if (tx.amount > this.alertThresholds.security.largeTransfer) {
          this.createAlert(
            'info',
            'security',
            'Large Transfer Detected',
            `Large transfer of ${tx.amount} STRAT from ${tx.from} to ${tx.to}`,
            'security-monitor',
            { transaction: tx, threshold: this.alertThresholds.security.largeTransfer }
          );
        }
      });
    }
  }

  // Get active alerts
  async getActiveAlerts(severity = null, category = null) {
    try {
      const query = { resolved: false };

      if (severity) query.severity = severity;
      if (category) query.category = category;

      const alerts = await Alert.find(query)
        .sort({ timestamp: -1 })
        .limit(100);

      return alerts;

    } catch (error) {
      logger.error(`Error getting active alerts: ${error.message}`);
      return [];
    }
  }

  // Get alert history
  async getAlertHistory(startDate, endDate, severity = null, category = null) {
    try {
      const query = {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      if (severity) query.severity = severity;
      if (category) query.category = category;

      const alerts = await Alert.find(query)
        .sort({ timestamp: -1 })
        .limit(1000);

      return alerts;

    } catch (error) {
      logger.error(`Error getting alert history: ${error.message}`);
      return [];
    }
  }

  // Get alert statistics
  async getAlertStatistics(days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await Alert.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              severity: '$severity',
              category: '$category'
            },
            count: { $sum: 1 },
            resolved: {
              $sum: { $cond: ['$resolved', 1, 0] }
            }
          }
        }
      ]);

      const summary = {
        total: 0,
        bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
        byCategory: {},
        resolvedRate: 0
      };

      let totalResolved = 0;

      stats.forEach(stat => {
        summary.total += stat.count;
        summary.bySeverity[stat._id.severity] = (summary.bySeverity[stat._id.severity] || 0) + stat.count;
        summary.byCategory[stat._id.category] = (summary.byCategory[stat._id.category] || 0) + stat.count;
        totalResolved += stat.resolved;
      });

      summary.resolvedRate = summary.total > 0 ? (totalResolved / summary.total) * 100 : 0;

      return summary;

    } catch (error) {
      logger.error(`Error getting alert statistics: ${error.message}`);
      return null;
    }
  }

  // Clean up old resolved alerts
  async cleanupOldAlerts(daysToKeep = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await Alert.deleteMany({
        resolved: true,
        resolvedAt: { $lt: cutoffDate }
      });

      logger.info(`Cleaned up ${result.deletedCount} old alerts`);
      return result.deletedCount;

    } catch (error) {
      logger.error(`Error cleaning up alerts: ${error.message}`);
      return 0;
    }
  }

  // Start alerting service
  startMonitoring() {
    // Clean up old alerts daily
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 24 * 60 * 60 * 1000);

    // Clear cooldowns every hour
    setInterval(() => {
      this.alertCooldowns.clear();
    }, 60 * 60 * 1000);

    logger.info('Alerting service started');
  }
}

module.exports = AlertingService;
