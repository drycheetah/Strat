// Webhook Service for STRAT blockchain event notifications

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class WebhookService {
  constructor() {
    this.webhooks = new Map(); // Map of webhook ID -> webhook config
    this.queue = [];
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
    this.processing = false;

    this.startQueueProcessor();
  }

  /**
   * Register a webhook
   */
  register(config) {
    const webhookId = this.generateId();

    const webhook = {
      id: webhookId,
      url: config.url,
      events: config.events || ['*'], // Events to subscribe to
      secret: config.secret || this.generateSecret(),
      active: true,
      createdAt: Date.now(),
      lastTriggered: null,
      successCount: 0,
      failureCount: 0,
      headers: config.headers || {}
    };

    this.webhooks.set(webhookId, webhook);

    logger.info(`Webhook registered: ${webhookId} for ${webhook.url}`);

    return {
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret
      }
    };
  }

  /**
   * Unregister a webhook
   */
  unregister(webhookId) {
    const deleted = this.webhooks.delete(webhookId);

    if (deleted) {
      logger.info(`Webhook unregistered: ${webhookId}`);
      return { success: true, message: 'Webhook removed' };
    }

    return { success: false, message: 'Webhook not found' };
  }

  /**
   * Update webhook configuration
   */
  update(webhookId, updates) {
    const webhook = this.webhooks.get(webhookId);

    if (!webhook) {
      return { success: false, message: 'Webhook not found' };
    }

    if (updates.url) webhook.url = updates.url;
    if (updates.events) webhook.events = updates.events;
    if (updates.active !== undefined) webhook.active = updates.active;
    if (updates.headers) webhook.headers = updates.headers;

    this.webhooks.set(webhookId, webhook);

    return { success: true, webhook };
  }

  /**
   * Trigger webhooks for an event
   */
  async trigger(eventType, data) {
    const matchingWebhooks = Array.from(this.webhooks.values()).filter(
      webhook =>
        webhook.active &&
        (webhook.events.includes('*') || webhook.events.includes(eventType))
    );

    if (matchingWebhooks.length === 0) {
      return { success: true, triggered: 0 };
    }

    // Add to queue
    for (const webhook of matchingWebhooks) {
      this.queue.push({
        webhook,
        eventType,
        data,
        attempts: 0,
        createdAt: Date.now()
      });
    }

    logger.info(`Queued ${matchingWebhooks.length} webhooks for event: ${eventType}`);

    return {
      success: true,
      triggered: matchingWebhooks.length
    };
  }

  /**
   * Process webhook queue
   */
  startQueueProcessor() {
    setInterval(async () => {
      if (this.processing || this.queue.length === 0) {
        return;
      }

      this.processing = true;

      try {
        const item = this.queue.shift();
        await this.sendWebhook(item);
      } catch (error) {
        logger.error('Webhook queue processing error:', error);
      }

      this.processing = false;
    }, 1000); // Process every second
  }

  /**
   * Send webhook HTTP request
   */
  async sendWebhook(item) {
    const { webhook, eventType, data, attempts } = item;

    try {
      const payload = {
        event: eventType,
        data,
        timestamp: Date.now(),
        webhookId: webhook.id
      };

      const signature = this.generateSignature(payload, webhook.secret);

      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': eventType,
          'X-Webhook-ID': webhook.id,
          ...webhook.headers
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.status >= 200 && response.status < 300) {
        webhook.lastTriggered = Date.now();
        webhook.successCount++;
        this.webhooks.set(webhook.id, webhook);

        logger.info(`Webhook delivered: ${webhook.id} (${eventType})`);

        return { success: true };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      logger.error(`Webhook delivery failed: ${webhook.id}`, error.message);

      webhook.failureCount++;
      this.webhooks.set(webhook.id, webhook);

      // Retry logic
      if (attempts < this.maxRetries) {
        logger.info(`Retrying webhook ${webhook.id} (attempt ${attempts + 1}/${this.maxRetries})`);

        setTimeout(() => {
          this.queue.push({
            ...item,
            attempts: attempts + 1
          });
        }, this.retryDelay * (attempts + 1)); // Exponential backoff
      } else {
        logger.error(`Webhook ${webhook.id} failed after ${this.maxRetries} attempts`);

        // Optionally disable webhook after repeated failures
        if (webhook.failureCount >= 10) {
          webhook.active = false;
          this.webhooks.set(webhook.id, webhook);
          logger.warn(`Webhook ${webhook.id} auto-disabled due to repeated failures`);
        }
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Generate HMAC signature
   */
  generateSignature(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload, signature, secret) {
    const expected = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }

  /**
   * Generate webhook ID
   */
  generateId() {
    return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate webhook secret
   */
  generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get webhook by ID
   */
  getWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);

    if (!webhook) {
      return null;
    }

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      active: webhook.active,
      createdAt: webhook.createdAt,
      lastTriggered: webhook.lastTriggered,
      successCount: webhook.successCount,
      failureCount: webhook.failureCount
    };
  }

  /**
   * List all webhooks
   */
  listWebhooks(filters = {}) {
    let webhooks = Array.from(this.webhooks.values());

    if (filters.active !== undefined) {
      webhooks = webhooks.filter(w => w.active === filters.active);
    }

    if (filters.event) {
      webhooks = webhooks.filter(w =>
        w.events.includes('*') || w.events.includes(filters.event)
      );
    }

    return webhooks.map(w => ({
      id: w.id,
      url: w.url,
      events: w.events,
      active: w.active,
      createdAt: w.createdAt,
      lastTriggered: w.lastTriggered,
      successCount: w.successCount,
      failureCount: w.failureCount
    }));
  }

  /**
   * Get webhook statistics
   */
  getStats() {
    const total = this.webhooks.size;
    const active = Array.from(this.webhooks.values()).filter(w => w.active).length;

    let totalSuccess = 0;
    let totalFailures = 0;

    for (const webhook of this.webhooks.values()) {
      totalSuccess += webhook.successCount;
      totalFailures += webhook.failureCount;
    }

    return {
      totalWebhooks: total,
      activeWebhooks: active,
      inactiveWebhooks: total - active,
      queueSize: this.queue.length,
      totalDeliveries: totalSuccess,
      totalFailures,
      successRate: totalSuccess + totalFailures > 0
        ? ((totalSuccess / (totalSuccess + totalFailures)) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }

  /**
   * Test webhook
   */
  async testWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);

    if (!webhook) {
      return { success: false, message: 'Webhook not found' };
    }

    const testData = {
      message: 'This is a test webhook',
      timestamp: Date.now()
    };

    const result = await this.sendWebhook({
      webhook,
      eventType: 'webhook.test',
      data: testData,
      attempts: 0
    });

    return result;
  }

  /**
   * Clear queue
   */
  clearQueue() {
    const cleared = this.queue.length;
    this.queue = [];
    return { success: true, cleared };
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      size: this.queue.length,
      processing: this.processing,
      items: this.queue.slice(0, 10).map(item => ({
        webhookId: item.webhook.id,
        event: item.eventType,
        attempts: item.attempts,
        age: Date.now() - item.createdAt
      }))
    };
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new WebhookService();
    }
    return instance;
  },
  WebhookService
};
