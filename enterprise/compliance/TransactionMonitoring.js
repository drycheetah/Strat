/**
 * Transaction Monitoring System
 * Real-time monitoring for suspicious activities and compliance
 */

const EventEmitter = require('events');
const logger = require('../../utils/logger');

class TransactionMonitoring extends EventEmitter {
  constructor() {
    super();
    this.rules = new Map();
    this.alerts = [];
    this.setupDefaultRules();
  }

  /**
   * Setup default monitoring rules
   */
  setupDefaultRules() {
    // Large transaction rule
    this.addRule('large_transaction', {
      threshold: 10000,
      check: (tx) => tx.amount >= 10000,
      severity: 'high',
      description: 'Transaction exceeds $10,000 threshold'
    });

    // Rapid transaction rule
    this.addRule('rapid_transactions', {
      threshold: 10,
      timeWindow: 60000, // 1 minute
      severity: 'medium',
      description: 'Multiple transactions in short time'
    });

    // Round amount rule
    this.addRule('round_amount', {
      check: (tx) => tx.amount % 1000 === 0 && tx.amount >= 5000,
      severity: 'low',
      description: 'Suspiciously round transaction amount'
    });

    // Structuring detection
    this.addRule('structuring', {
      threshold: 9900,
      check: (tx) => tx.amount > 9000 && tx.amount < 10000,
      severity: 'high',
      description: 'Possible structuring to avoid reporting'
    });

    // High frequency from same address
    this.addRule('high_frequency', {
      threshold: 20,
      timeWindow: 3600000, // 1 hour
      severity: 'medium',
      description: 'High frequency transactions from address'
    });
  }

  /**
   * Add monitoring rule
   */
  addRule(ruleId, config) {
    this.rules.set(ruleId, {
      id: ruleId,
      ...config,
      enabled: true
    });

    logger.info(`Monitoring rule added: ${ruleId}`);
  }

  /**
   * Monitor transaction
   */
  async monitorTransaction(transaction) {
    const alerts = [];

    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue;

      if (rule.check && rule.check(transaction)) {
        const alert = this.createAlert(ruleId, transaction, rule);
        alerts.push(alert);
        this.alerts.push(alert);

        // Emit alert event
        this.emit('alert', alert);

        logger.warn(`Transaction alert: ${ruleId} - ${transaction.id}`);
      }
    }

    return alerts;
  }

  /**
   * Create alert
   */
  createAlert(ruleId, transaction, rule) {
    return {
      id: this.generateAlertId(),
      ruleId,
      ruleName: rule.description,
      severity: rule.severity,
      transaction: {
        id: transaction.id,
        from: transaction.from,
        to: transaction.to,
        amount: transaction.amount,
        timestamp: transaction.timestamp
      },
      status: 'open',
      createdAt: new Date(),
      reviewed: false
    };
  }

  /**
   * Get alerts
   */
  getAlerts(filter = {}) {
    let filtered = [...this.alerts];

    if (filter.severity) {
      filtered = filtered.filter(a => a.severity === filter.severity);
    }

    if (filter.status) {
      filtered = filtered.filter(a => a.status === filter.status);
    }

    if (filter.reviewed !== undefined) {
      filtered = filtered.filter(a => a.reviewed === filter.reviewed);
    }

    return filtered;
  }

  /**
   * Review alert
   */
  reviewAlert(alertId, decision, notes) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.reviewed = true;
    alert.reviewedAt = new Date();
    alert.reviewDecision = decision;
    alert.reviewNotes = notes;
    alert.status = decision === 'confirmed' ? 'confirmed' : 'closed';

    logger.info(`Alert reviewed: ${alertId} - ${decision}`);

    return alert;
  }

  /**
   * Analyze transaction patterns
   */
  async analyzePatterns(address, timeWindow = 24 * 60 * 60 * 1000) {
    const BlockModel = require('../../models/Block');

    const blocks = await BlockModel.find({
      timestamp: { $gte: Date.now() - timeWindow }
    });

    const addressTxs = [];
    blocks.forEach(block => {
      block.transactions.forEach(tx => {
        if (tx.from === address || tx.to === address) {
          addressTxs.push(tx);
        }
      });
    });

    const analysis = {
      address,
      timeWindow,
      transactionCount: addressTxs.length,
      totalVolume: addressTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      averageAmount: 0,
      largestTransaction: null,
      patterns: []
    };

    if (addressTxs.length > 0) {
      analysis.averageAmount = analysis.totalVolume / addressTxs.length;
      analysis.largestTransaction = addressTxs.reduce((max, tx) =>
        (tx.amount > (max?.amount || 0)) ? tx : max, null);
    }

    // Detect patterns
    if (addressTxs.length > 50) {
      analysis.patterns.push('high_frequency');
    }

    if (analysis.totalVolume > 100000) {
      analysis.patterns.push('high_volume');
    }

    return analysis;
  }

  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = new TransactionMonitoring();
