/**
 * Audit Trail System
 * Complete audit logging for compliance and security
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const auditLogSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'user_login', 'user_logout', 'user_created', 'user_updated',
      'transaction_created', 'transaction_confirmed', 'transaction_failed',
      'contract_deployed', 'contract_executed',
      'api_key_created', 'api_key_revoked', 'api_key_used',
      'kyc_initiated', 'kyc_approved', 'kyc_rejected',
      'admin_action', 'security_event', 'compliance_check',
      'data_export', 'data_deletion'
    ],
    index: true
  },
  actor: {
    userId: mongoose.Schema.Types.ObjectId,
    userEmail: String,
    ipAddress: String,
    userAgent: String,
    apiKey: String
  },
  target: {
    type: String,
    id: String,
    details: mongoose.Schema.Types.Mixed
  },
  action: {
    type: String,
    required: true
  },
  result: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    required: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['security', 'compliance', 'business', 'system'],
    default: 'business'
  },
  tenantId: String,
  sessionId: String
}, {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'seconds'
  }
});

// Indexes for efficient querying
auditLogSchema.index({ 'actor.userId': 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

class AuditTrail {
  /**
   * Log an audit event
   */
  async log(event) {
    try {
      const eventId = this.generateEventId();

      const auditLog = new AuditLog({
        eventId,
        timestamp: event.timestamp || new Date(),
        eventType: event.eventType,
        actor: event.actor,
        target: event.target,
        action: event.action,
        result: event.result,
        metadata: event.metadata,
        changes: event.changes,
        severity: event.severity || 'medium',
        category: event.category || 'business',
        tenantId: event.tenantId,
        sessionId: event.sessionId
      });

      await auditLog.save();

      // Log critical events
      if (event.severity === 'critical') {
        logger.warn(`Critical audit event: ${event.eventType} - ${event.action}`);
      }

      return auditLog;
    } catch (error) {
      logger.error(`Error logging audit event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Query audit logs
   */
  async query(filters = {}, options = {}) {
    const query = {};

    if (filters.userId) {
      query['actor.userId'] = filters.userId;
    }

    if (filters.eventType) {
      query.eventType = filters.eventType;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.timestamp.$lte = new Date(filters.endDate);
      }
    }

    if (filters.severity) {
      query.severity = filters.severity;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.tenantId) {
      query.tenantId = filters.tenantId;
    }

    const limit = options.limit || 100;
    const skip = options.skip || 0;
    const sort = options.sort || { timestamp: -1 };

    const logs = await AuditLog.find(query)
      .sort(sort)
      .limit(limit)
      .skip(skip);

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get audit trail for specific user
   */
  async getUserAuditTrail(userId, options = {}) {
    return this.query({ userId }, options);
  }

  /**
   * Get audit trail for specific transaction
   */
  async getTransactionAuditTrail(transactionId) {
    return this.query({
      'target.type': 'transaction',
      'target.id': transactionId
    });
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate, endDate) {
    const logs = await AuditLog.find({
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      category: 'compliance'
    }).sort({ timestamp: -1 });

    const report = {
      period: { startDate, endDate },
      totalEvents: logs.length,
      eventsByType: {},
      eventsBySeverity: {},
      criticalEvents: [],
      summary: {}
    };

    logs.forEach(log => {
      // Count by type
      report.eventsByType[log.eventType] = (report.eventsByType[log.eventType] || 0) + 1;

      // Count by severity
      report.eventsBySeverity[log.severity] = (report.eventsBySeverity[log.severity] || 0) + 1;

      // Track critical events
      if (log.severity === 'critical') {
        report.criticalEvents.push(log);
      }
    });

    return report;
  }

  /**
   * Middleware to automatically log API requests
   */
  middleware() {
    return async (req, res, next) => {
      const startTime = Date.now();

      // Capture response
      const originalSend = res.send;
      res.send = function(data) {
        res.send = originalSend;

        const duration = Date.now() - startTime;

        // Log API request
        auditTrail.log({
          eventType: 'api_request',
          actor: {
            userId: req.user?._id,
            userEmail: req.user?.email,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            apiKey: req.headers['x-api-key']
          },
          target: {
            type: 'api_endpoint',
            id: req.path,
            details: {
              method: req.method,
              params: req.params,
              query: req.query
            }
          },
          action: `${req.method} ${req.path}`,
          result: res.statusCode < 400 ? 'success' : 'failure',
          metadata: {
            statusCode: res.statusCode,
            duration,
            responseSize: data?.length || 0
          },
          severity: res.statusCode >= 500 ? 'high' : 'low',
          category: 'system',
          tenantId: req.tenant?.tenantId,
          sessionId: req.sessionID
        }).catch(err => {
          logger.error(`Error logging API request: ${err.message}`);
        });

        return originalSend.call(this, data);
      };

      next();
    };
  }

  generateEventId() {
    const crypto = require('crypto');
    return `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

const auditTrail = new AuditTrail();

module.exports = auditTrail;
