const { PerformanceMetrics } = require('../models/Analytics');
const os = require('os');
const logger = require('../utils/logger');

class PerformanceMonitor {
  constructor(alertingService) {
    this.alertingService = alertingService;
    this.metrics = {
      api: { requests: [], errors: 0, totalRequests: 0 },
      blockchain: { operations: [], errors: 0 },
      p2p: { messages: [], connections: 0 },
      database: { queries: [], errors: 0 },
      websocket: { connections: 0, messages: [] }
    };

    this.startTime = Date.now();
  }

  // Record API request
  recordAPIRequest(duration, error = false) {
    const now = Date.now();
    this.metrics.api.requests.push({ timestamp: now, duration });
    this.metrics.api.totalRequests++;

    if (error) {
      this.metrics.api.errors++;
    }

    // Clean up old data (keep last 5 minutes)
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    this.metrics.api.requests = this.metrics.api.requests.filter(
      r => r.timestamp > fiveMinutesAgo
    );
  }

  // Record blockchain operation
  recordBlockchainOperation(operation, duration, error = false) {
    const now = Date.now();
    this.metrics.blockchain.operations.push({ timestamp: now, operation, duration });

    if (error) {
      this.metrics.blockchain.errors++;
    }

    // Clean up old data
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    this.metrics.blockchain.operations = this.metrics.blockchain.operations.filter(
      op => op.timestamp > fiveMinutesAgo
    );
  }

  // Record P2P activity
  recordP2PMessage(size) {
    const now = Date.now();
    this.metrics.p2p.messages.push({ timestamp: now, size });

    // Clean up old data
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    this.metrics.p2p.messages = this.metrics.p2p.messages.filter(
      m => m.timestamp > fiveMinutesAgo
    );
  }

  // Update P2P connections
  updateP2PConnections(count) {
    this.metrics.p2p.connections = count;
  }

  // Record database query
  recordDatabaseQuery(duration, error = false) {
    const now = Date.now();
    this.metrics.database.queries.push({ timestamp: now, duration });

    if (error) {
      this.metrics.database.errors++;
    }

    // Clean up old data
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    this.metrics.database.queries = this.metrics.database.queries.filter(
      q => q.timestamp > fiveMinutesAgo
    );
  }

  // Update WebSocket connections
  updateWebSocketConnections(count) {
    this.metrics.websocket.connections = count;
  }

  // Record WebSocket message
  recordWebSocketMessage(size) {
    const now = Date.now();
    this.metrics.websocket.messages.push({ timestamp: now, size });

    // Clean up old data
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    this.metrics.websocket.messages = this.metrics.websocket.messages.filter(
      m => m.timestamp > fiveMinutesAgo
    );
  }

  // Get system metrics
  getSystemMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const cpuUsage = 100 - (100 * totalIdle / totalTick);
    const memoryUsage = (usedMem / totalMem) * 100;

    return {
      cpuUsage: Math.round(cpuUsage * 100) / 100,
      memoryUsage: Math.round(memoryUsage * 100) / 100,
      totalMemory: totalMem,
      freeMemory: freeMem,
      usedMemory: usedMem,
      uptime: os.uptime(),
      processUptime: (Date.now() - this.startTime) / 1000,
      loadAverage: os.loadavg()
    };
  }

  // Calculate service metrics
  calculateServiceMetrics(service) {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    let data, errorCount;

    switch (service) {
      case 'api':
        data = this.metrics.api.requests;
        errorCount = this.metrics.api.errors;
        break;
      case 'blockchain':
        data = this.metrics.blockchain.operations;
        errorCount = this.metrics.blockchain.errors;
        break;
      case 'database':
        data = this.metrics.database.queries;
        errorCount = this.metrics.database.errors;
        break;
      default:
        return null;
    }

    // Filter recent data
    const recentData = data.filter(d => d.timestamp > oneMinuteAgo);

    if (recentData.length === 0) {
      return {
        responseTime: 0,
        throughput: 0,
        errorRate: 0
      };
    }

    // Calculate average response time
    const totalDuration = recentData.reduce((sum, d) => sum + d.duration, 0);
    const responseTime = totalDuration / recentData.length;

    // Calculate throughput (requests per second)
    const throughput = recentData.length / 60;

    // Calculate error rate
    const errorRate = this.metrics[service].totalRequests > 0
      ? (errorCount / this.metrics[service].totalRequests) * 100
      : 0;

    return {
      responseTime: Math.round(responseTime * 100) / 100,
      throughput: Math.round(throughput * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100
    };
  }

  // Calculate network I/O
  calculateNetworkIO() {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    const recentP2P = this.metrics.p2p.messages.filter(m => m.timestamp > oneMinuteAgo);
    const recentWS = this.metrics.websocket.messages.filter(m => m.timestamp > oneMinuteAgo);

    const p2pBytes = recentP2P.reduce((sum, m) => sum + m.size, 0);
    const wsBytes = recentWS.reduce((sum, m) => sum + m.size, 0);

    return {
      in: p2pBytes + wsBytes,
      out: p2pBytes + wsBytes // Simplified, assuming bidirectional
    };
  }

  // Collect all metrics
  async collectMetrics() {
    try {
      const systemMetrics = this.getSystemMetrics();
      const networkIO = this.calculateNetworkIO();

      const services = ['api', 'blockchain', 'database'];
      const timestamp = new Date();

      for (const service of services) {
        const serviceMetrics = this.calculateServiceMetrics(service);

        if (serviceMetrics) {
          const metrics = {
            timestamp,
            service,
            responseTime: serviceMetrics.responseTime,
            throughput: serviceMetrics.throughput,
            errorRate: serviceMetrics.errorRate,
            cpuUsage: systemMetrics.cpuUsage,
            memoryUsage: systemMetrics.memoryUsage,
            diskUsage: 0, // Would need additional logic to calculate
            networkIO,
            activeConnections: service === 'api' ? this.metrics.api.totalRequests : 0
          };

          // Save to database
          await PerformanceMetrics.create(metrics);

          // Check for alerts
          if (this.alertingService) {
            this.alertingService.checkPerformanceMetrics({
              responseTime: serviceMetrics.responseTime,
              errorRate: serviceMetrics.errorRate,
              cpuUsage: systemMetrics.cpuUsage,
              memoryUsage: systemMetrics.memoryUsage
            });
          }
        }
      }

      // P2P and WebSocket metrics
      await PerformanceMetrics.create({
        timestamp,
        service: 'p2p',
        responseTime: 0,
        throughput: this.metrics.p2p.messages.length / 60,
        errorRate: 0,
        cpuUsage: systemMetrics.cpuUsage,
        memoryUsage: systemMetrics.memoryUsage,
        diskUsage: 0,
        networkIO,
        activeConnections: this.metrics.p2p.connections
      });

      await PerformanceMetrics.create({
        timestamp,
        service: 'websocket',
        responseTime: 0,
        throughput: this.metrics.websocket.messages.length / 60,
        errorRate: 0,
        cpuUsage: systemMetrics.cpuUsage,
        memoryUsage: systemMetrics.memoryUsage,
        diskUsage: 0,
        networkIO,
        activeConnections: this.metrics.websocket.connections
      });

    } catch (error) {
      logger.error(`Error collecting performance metrics: ${error.message}`);
    }
  }

  // Get real-time metrics
  getRealTimeMetrics() {
    const systemMetrics = this.getSystemMetrics();
    const networkIO = this.calculateNetworkIO();

    return {
      system: systemMetrics,
      api: {
        ...this.calculateServiceMetrics('api'),
        totalRequests: this.metrics.api.totalRequests,
        errors: this.metrics.api.errors
      },
      blockchain: {
        ...this.calculateServiceMetrics('blockchain'),
        errors: this.metrics.blockchain.errors
      },
      database: {
        ...this.calculateServiceMetrics('database'),
        errors: this.metrics.database.errors
      },
      p2p: {
        connections: this.metrics.p2p.connections,
        messagesPerMinute: this.metrics.p2p.messages.length
      },
      websocket: {
        connections: this.metrics.websocket.connections,
        messagesPerMinute: this.metrics.websocket.messages.length
      },
      networkIO
    };
  }

  // Get historical metrics
  async getHistoricalMetrics(service, startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const metrics = await PerformanceMetrics.find({
        service,
        timestamp: { $gte: start, $lte: end }
      }).sort({ timestamp: 1 });

      return metrics;

    } catch (error) {
      logger.error(`Error getting historical metrics: ${error.message}`);
      return [];
    }
  }

  // Get service health status
  getServiceHealth() {
    const apiMetrics = this.calculateServiceMetrics('api');
    const blockchainMetrics = this.calculateServiceMetrics('blockchain');
    const databaseMetrics = this.calculateServiceMetrics('database');
    const systemMetrics = this.getSystemMetrics();

    const isHealthy = (metrics) => {
      return metrics.responseTime < 5000 &&
             metrics.errorRate < 5;
    };

    const systemHealthy = systemMetrics.cpuUsage < 80 &&
                         systemMetrics.memoryUsage < 85;

    return {
      overall: isHealthy(apiMetrics) && isHealthy(blockchainMetrics) &&
               isHealthy(databaseMetrics) && systemHealthy ? 'healthy' : 'degraded',
      services: {
        api: isHealthy(apiMetrics) ? 'healthy' : 'degraded',
        blockchain: isHealthy(blockchainMetrics) ? 'healthy' : 'degraded',
        database: isHealthy(databaseMetrics) ? 'healthy' : 'degraded',
        system: systemHealthy ? 'healthy' : 'degraded'
      },
      timestamp: Date.now()
    };
  }

  // Start monitoring
  startMonitoring() {
    // Collect metrics every minute
    setInterval(() => {
      this.collectMetrics();
    }, 60 * 1000);

    // Reset error counters daily
    setInterval(() => {
      this.metrics.api.errors = 0;
      this.metrics.api.totalRequests = 0;
      this.metrics.blockchain.errors = 0;
      this.metrics.database.errors = 0;
    }, 24 * 60 * 60 * 1000);

    logger.info('Performance monitoring started');
  }

  // Clean up old metrics
  async cleanupOldMetrics(daysToKeep = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await PerformanceMetrics.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      logger.info(`Cleaned up ${result.deletedCount} old performance metrics`);
      return result.deletedCount;

    } catch (error) {
      logger.error(`Error cleaning up metrics: ${error.message}`);
      return 0;
    }
  }
}

module.exports = PerformanceMonitor;
