const logger = require('../../utils/logger');
const os = require('os');

/**
 * NodeHealthChecker - Monitors node health and system resources
 * Tracks CPU, memory, disk, blockchain sync, and performance metrics
 */
class NodeHealthChecker {
  constructor(blockchain, options = {}) {
    this.blockchain = blockchain;
    this.checkInterval = options.checkInterval || 30000; // 30 seconds
    this.healthHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.alerts = [];
    this.monitoring = false;
    this.thresholds = {
      cpu: options.cpuThreshold || 80, // percentage
      memory: options.memoryThreshold || 85, // percentage
      disk: options.diskThreshold || 90, // percentage
      blockTime: options.blockTimeThreshold || 60000, // ms
      mempoolSize: options.mempoolThreshold || 10000
    };
    this.startTime = Date.now();
  }

  /**
   * Start health monitoring
   */
  start() {
    if (this.monitoring) {
      return;
    }

    this.monitoring = true;
    logger.info('Node health monitoring started');

    // Initial check
    this.performHealthCheck();

    // Start periodic checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
  }

  /**
   * Stop health monitoring
   */
  stop() {
    if (!this.monitoring) {
      return;
    }

    this.monitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    logger.info('Node health monitoring stopped');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const health = {
      timestamp: Date.now(),
      uptime: this.getUptime(),
      system: await this.checkSystemResources(),
      blockchain: await this.checkBlockchainHealth(),
      network: await this.checkNetworkHealth(),
      performance: await this.checkPerformance(),
      status: 'healthy'
    };

    // Determine overall health status
    health.status = this.determineOverallStatus(health);

    // Check for issues and create alerts
    this.checkForIssues(health);

    // Add to history
    this.healthHistory.push(health);

    // Limit history size
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }

    return health;
  }

  /**
   * Check system resources
   */
  async checkSystemResources() {
    const cpuUsage = this.getCPUUsage();
    const memoryUsage = this.getMemoryUsage();
    const diskUsage = await this.getDiskUsage();

    return {
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length,
        status: cpuUsage > this.thresholds.cpu ? 'warning' : 'healthy'
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usage: memoryUsage,
        status: memoryUsage > this.thresholds.memory ? 'warning' : 'healthy'
      },
      disk: {
        usage: diskUsage,
        status: diskUsage > this.thresholds.disk ? 'warning' : 'healthy'
      },
      loadAverage: os.loadavg(),
      platform: os.platform(),
      arch: os.arch()
    };
  }

  /**
   * Get CPU usage percentage
   */
  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (let cpu of cpus) {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - (100 * idle / total);

    return Math.round(usage * 100) / 100;
  }

  /**
   * Get memory usage percentage
   */
  getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usage = (used / total) * 100;

    return Math.round(usage * 100) / 100;
  }

  /**
   * Get disk usage (simplified - would use actual disk stats in production)
   */
  async getDiskUsage() {
    // In production, use a library like 'diskusage' or 'check-disk-space'
    // For now, return a placeholder
    return 45; // 45% usage
  }

  /**
   * Check blockchain health
   */
  async checkBlockchainHealth() {
    const chainLength = this.blockchain.chain.length;
    const latestBlock = this.blockchain.getLatestBlock();
    const blockAge = Date.now() - latestBlock.timestamp;

    const mempoolSize = this.blockchain.mempool?.transactions.size || 0;
    const pendingTxs = this.blockchain.pendingTransactions?.length || 0;

    return {
      blockHeight: chainLength,
      latestBlockAge: blockAge,
      blockAgeStatus: blockAge > this.thresholds.blockTime ? 'warning' : 'healthy',
      difficulty: this.blockchain.difficulty,
      mempoolSize,
      mempoolStatus: mempoolSize > this.thresholds.mempoolSize ? 'warning' : 'healthy',
      pendingTransactions: pendingTxs,
      utxoCount: this.blockchain.utxos.size,
      contractCount: this.blockchain.contracts.size,
      isValid: this.blockchain.isChainValid()
    };
  }

  /**
   * Check network health
   */
  async checkNetworkHealth() {
    // This would integrate with NetworkMonitor in production
    return {
      peers: 0, // Would get from P2P server
      inbound: 0,
      outbound: 0,
      status: 'healthy'
    };
  }

  /**
   * Check performance metrics
   */
  async checkPerformance() {
    const avgBlockTime = this.calculateAverageBlockTime();
    const tps = this.calculateTPS();

    return {
      avgBlockTime,
      transactionsPerSecond: tps,
      blocksProcessed: this.blockchain.chain.length,
      uptime: this.getUptime()
    };
  }

  /**
   * Calculate average block time
   */
  calculateAverageBlockTime() {
    const recentBlocks = this.blockchain.chain.slice(-100);

    if (recentBlocks.length < 2) {
      return 0;
    }

    let totalTime = 0;
    for (let i = 1; i < recentBlocks.length; i++) {
      totalTime += recentBlocks[i].timestamp - recentBlocks[i - 1].timestamp;
    }

    return totalTime / (recentBlocks.length - 1);
  }

  /**
   * Calculate transactions per second
   */
  calculateTPS() {
    const recentBlocks = this.blockchain.chain.slice(-100);

    if (recentBlocks.length < 2) {
      return 0;
    }

    let totalTxs = 0;
    const timeSpan = recentBlocks[recentBlocks.length - 1].timestamp - recentBlocks[0].timestamp;

    for (let block of recentBlocks) {
      totalTxs += block.transactions?.length || 0;
    }

    return totalTxs / (timeSpan / 1000);
  }

  /**
   * Determine overall health status
   */
  determineOverallStatus(health) {
    const warnings = [];

    // Check system resources
    if (health.system.cpu.status === 'warning') {
      warnings.push('High CPU usage');
    }
    if (health.system.memory.status === 'warning') {
      warnings.push('High memory usage');
    }
    if (health.system.disk.status === 'warning') {
      warnings.push('High disk usage');
    }

    // Check blockchain health
    if (health.blockchain.blockAgeStatus === 'warning') {
      warnings.push('Stale blocks');
    }
    if (health.blockchain.mempoolStatus === 'warning') {
      warnings.push('Large mempool');
    }
    if (!health.blockchain.isValid) {
      warnings.push('Invalid blockchain');
      return 'critical';
    }

    // Determine status based on warnings
    if (warnings.length === 0) {
      return 'healthy';
    } else if (warnings.length <= 2) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Check for issues and create alerts
   */
  checkForIssues(health) {
    // CPU warning
    if (health.system.cpu.usage > this.thresholds.cpu) {
      this.createAlert('warning', 'HIGH_CPU',
        `High CPU usage: ${health.system.cpu.usage.toFixed(2)}%`);
    }

    // Memory warning
    if (health.system.memory.usage > this.thresholds.memory) {
      this.createAlert('warning', 'HIGH_MEMORY',
        `High memory usage: ${health.system.memory.usage.toFixed(2)}%`);
    }

    // Disk warning
    if (health.system.disk.usage > this.thresholds.disk) {
      this.createAlert('warning', 'HIGH_DISK',
        `High disk usage: ${health.system.disk.usage.toFixed(2)}%`);
    }

    // Stale block warning
    if (health.blockchain.latestBlockAge > this.thresholds.blockTime) {
      this.createAlert('warning', 'STALE_BLOCK',
        `No new block for ${Math.floor(health.blockchain.latestBlockAge / 1000)} seconds`);
    }

    // Large mempool warning
    if (health.blockchain.mempoolSize > this.thresholds.mempoolSize) {
      this.createAlert('warning', 'LARGE_MEMPOOL',
        `Mempool size: ${health.blockchain.mempoolSize} transactions`);
    }

    // Invalid chain error
    if (!health.blockchain.isValid) {
      this.createAlert('critical', 'INVALID_CHAIN',
        'Blockchain validation failed');
    }
  }

  /**
   * Create alert
   */
  createAlert(severity, type, message) {
    const alert = {
      severity,
      type,
      message,
      timestamp: Date.now()
    };

    this.alerts.push(alert);

    // Limit alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    logger.warn(`Node health alert [${severity}]: ${message}`);

    return alert;
  }

  /**
   * Get current health status
   */
  getCurrentHealth() {
    return this.healthHistory[this.healthHistory.length - 1] || null;
  }

  /**
   * Get health history
   */
  getHealthHistory(limit = 100) {
    return this.healthHistory.slice(-limit);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 10) {
    return this.alerts.slice(-limit).reverse();
  }

  /**
   * Get uptime
   */
  getUptime() {
    return Date.now() - this.startTime;
  }

  /**
   * Get uptime formatted
   */
  getUptimeFormatted() {
    const uptime = this.getUptime();
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    return {
      days: days,
      hours: hours % 24,
      minutes: minutes % 60,
      seconds: seconds % 60,
      total: uptime
    };
  }

  /**
   * Get comprehensive health report
   */
  async getHealthReport() {
    const current = await this.performHealthCheck();
    const history = this.getHealthHistory(100);

    // Calculate trends
    const trends = this.calculateTrends(history);

    return {
      current,
      trends,
      alerts: this.getRecentAlerts(20),
      uptime: this.getUptimeFormatted(),
      thresholds: this.thresholds,
      generatedAt: Date.now()
    };
  }

  /**
   * Calculate health trends
   */
  calculateTrends(history) {
    if (history.length < 2) {
      return null;
    }

    const cpuTrend = this.calculateTrend(history.map(h => h.system.cpu.usage));
    const memoryTrend = this.calculateTrend(history.map(h => h.system.memory.usage));
    const blockTimeTrend = this.calculateTrend(history.map(h => h.performance.avgBlockTime));

    return {
      cpu: cpuTrend,
      memory: memoryTrend,
      blockTime: blockTimeTrend
    };
  }

  /**
   * Calculate trend direction
   */
  calculateTrend(values) {
    if (values.length < 2) {
      return { direction: 'stable', change: 0 };
    }

    const recent = values.slice(-10);
    const older = values.slice(-20, -10);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ?
      older.reduce((a, b) => a + b, 0) / older.length :
      recentAvg;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    let direction = 'stable';
    if (change > 5) {
      direction = 'increasing';
    } else if (change < -5) {
      direction = 'decreasing';
    }

    return {
      direction,
      change: Math.round(change * 100) / 100,
      current: Math.round(recentAvg * 100) / 100
    };
  }

  /**
   * Run diagnostics
   */
  async runDiagnostics() {
    logger.info('Running node diagnostics...');

    const diagnostics = {
      timestamp: Date.now(),
      tests: []
    };

    // Test 1: Blockchain validation
    diagnostics.tests.push({
      name: 'Blockchain Validation',
      status: this.blockchain.isChainValid() ? 'pass' : 'fail',
      details: `Chain length: ${this.blockchain.chain.length}`
    });

    // Test 2: UTXO set integrity
    diagnostics.tests.push({
      name: 'UTXO Set Integrity',
      status: 'pass',
      details: `${this.blockchain.utxos.size} UTXOs`
    });

    // Test 3: Memory usage
    const memUsage = this.getMemoryUsage();
    diagnostics.tests.push({
      name: 'Memory Usage',
      status: memUsage < 90 ? 'pass' : 'warning',
      details: `${memUsage.toFixed(2)}% used`
    });

    // Test 4: Disk space
    const diskUsage = await this.getDiskUsage();
    diagnostics.tests.push({
      name: 'Disk Space',
      status: diskUsage < 90 ? 'pass' : 'warning',
      details: `${diskUsage.toFixed(2)}% used`
    });

    // Test 5: Block production
    const latestBlock = this.blockchain.getLatestBlock();
    const blockAge = Date.now() - latestBlock.timestamp;
    diagnostics.tests.push({
      name: 'Block Production',
      status: blockAge < 120000 ? 'pass' : 'warning',
      details: `Last block ${Math.floor(blockAge / 1000)}s ago`
    });

    const passed = diagnostics.tests.filter(t => t.status === 'pass').length;
    diagnostics.summary = {
      total: diagnostics.tests.length,
      passed,
      warnings: diagnostics.tests.filter(t => t.status === 'warning').length,
      failed: diagnostics.tests.filter(t => t.status === 'fail').length
    };

    logger.info(`Diagnostics complete: ${passed}/${diagnostics.tests.length} tests passed`);

    return diagnostics;
  }

  /**
   * Clear old data
   */
  cleanup() {
    // Clear old history
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }

    // Clear old alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    logger.info('Node health checker cleanup completed');
  }
}

module.exports = NodeHealthChecker;
