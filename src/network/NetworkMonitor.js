const logger = require('../../utils/logger');

/**
 * NetworkMonitor - Monitors blockchain network health and performance
 * Tracks peers, network latency, bandwidth, and sync status
 */
class NetworkMonitor {
  constructor(p2pServer, options = {}) {
    this.p2pServer = p2pServer;
    this.peers = new Map(); // peerId -> peer info
    this.metrics = {
      totalPeers: 0,
      activePeers: 0,
      inboundPeers: 0,
      outboundPeers: 0,
      totalBandwidth: 0,
      avgLatency: 0
    };
    this.metricsHistory = [];
    this.alerts = [];
    this.healthChecks = [];
    this.updateInterval = options.updateInterval || 10000; // 10 seconds
    this.monitoring = false;
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.alertThresholds = {
      minPeers: options.minPeers || 3,
      maxLatency: options.maxLatency || 5000, // 5 seconds
      minSyncSpeed: options.minSyncSpeed || 10 // blocks/sec
    };
  }

  /**
   * Start network monitoring
   */
  start() {
    if (this.monitoring) {
      return;
    }

    this.monitoring = true;
    logger.info('Network monitoring started');

    // Start periodic updates
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.checkHealth();
    }, this.updateInterval);
  }

  /**
   * Stop network monitoring
   */
  stop() {
    if (!this.monitoring) {
      return;
    }

    this.monitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    logger.info('Network monitoring stopped');
  }

  /**
   * Update network metrics
   */
  updateMetrics() {
    if (!this.p2pServer) {
      return;
    }

    const peers = this.p2pServer.peers || [];
    let activePeers = 0;
    let inboundPeers = 0;
    let outboundPeers = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    // Update peer information
    for (let peer of peers) {
      const peerId = peer.id || peer.url;

      if (!this.peers.has(peerId)) {
        this.peers.set(peerId, {
          id: peerId,
          url: peer.url,
          connectedAt: Date.now(),
          messagesReceived: 0,
          messagesSent: 0,
          bytesReceived: 0,
          bytesSent: 0,
          latency: 0,
          lastSeen: Date.now()
        });
      }

      const peerInfo = this.peers.get(peerId);
      peerInfo.lastSeen = Date.now();

      // Check if peer is active (seen in last minute)
      if (Date.now() - peerInfo.lastSeen < 60000) {
        activePeers++;
      }

      // Count inbound/outbound
      if (peer.inbound) {
        inboundPeers++;
      } else {
        outboundPeers++;
      }

      // Track latency
      if (peerInfo.latency > 0) {
        totalLatency += peerInfo.latency;
        latencyCount++;
      }
    }

    // Update metrics
    this.metrics = {
      totalPeers: this.peers.size,
      activePeers,
      inboundPeers,
      outboundPeers,
      totalBandwidth: this.calculateTotalBandwidth(),
      avgLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
      timestamp: Date.now()
    };

    // Add to history
    this.metricsHistory.push({ ...this.metrics });

    // Limit history size
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Calculate total bandwidth usage
   */
  calculateTotalBandwidth() {
    let totalBandwidth = 0;

    for (let [peerId, peer] of this.peers) {
      totalBandwidth += peer.bytesReceived + peer.bytesSent;
    }

    return totalBandwidth;
  }

  /**
   * Record message sent to peer
   */
  recordMessageSent(peerId, messageType, size) {
    const peer = this.peers.get(peerId);

    if (peer) {
      peer.messagesSent++;
      peer.bytesSent += size;
    }
  }

  /**
   * Record message received from peer
   */
  recordMessageReceived(peerId, messageType, size) {
    const peer = this.peers.get(peerId);

    if (peer) {
      peer.messagesReceived++;
      peer.bytesReceived += size;
      peer.lastSeen = Date.now();
    }
  }

  /**
   * Measure peer latency
   */
  async measureLatency(peerId) {
    const peer = this.peers.get(peerId);

    if (!peer) {
      return -1;
    }

    const startTime = Date.now();

    try {
      // Send ping and wait for pong (simplified)
      // In production, this would send actual ping message
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

      const latency = Date.now() - startTime;
      peer.latency = latency;

      return latency;

    } catch (error) {
      logger.error(`Failed to measure latency for peer ${peerId}: ${error.message}`);
      return -1;
    }
  }

  /**
   * Check network health
   */
  checkHealth() {
    const checks = [];

    // Check peer count
    if (this.metrics.activePeers < this.alertThresholds.minPeers) {
      this.createAlert('warning', 'LOW_PEER_COUNT',
        `Low peer count: ${this.metrics.activePeers} (minimum: ${this.alertThresholds.minPeers})`);

      checks.push({
        name: 'Peer Count',
        status: 'warning',
        value: this.metrics.activePeers,
        threshold: this.alertThresholds.minPeers
      });
    } else {
      checks.push({
        name: 'Peer Count',
        status: 'healthy',
        value: this.metrics.activePeers
      });
    }

    // Check average latency
    if (this.metrics.avgLatency > this.alertThresholds.maxLatency) {
      this.createAlert('warning', 'HIGH_LATENCY',
        `High network latency: ${this.metrics.avgLatency}ms`);

      checks.push({
        name: 'Network Latency',
        status: 'warning',
        value: this.metrics.avgLatency,
        threshold: this.alertThresholds.maxLatency
      });
    } else {
      checks.push({
        name: 'Network Latency',
        status: 'healthy',
        value: this.metrics.avgLatency
      });
    }

    // Check for stale peers
    const stalePeers = this.findStalePeers();
    if (stalePeers.length > 0) {
      this.createAlert('info', 'STALE_PEERS',
        `${stalePeers.length} stale peer(s) detected`);

      checks.push({
        name: 'Stale Peers',
        status: 'info',
        value: stalePeers.length
      });
    }

    this.healthChecks.push({
      timestamp: Date.now(),
      checks,
      overallStatus: checks.every(c => c.status === 'healthy') ? 'healthy' : 'degraded'
    });

    // Limit health check history
    if (this.healthChecks.length > 100) {
      this.healthChecks.shift();
    }
  }

  /**
   * Find stale peers
   */
  findStalePeers() {
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    const stalePeers = [];

    for (let [peerId, peer] of this.peers) {
      if (now - peer.lastSeen > staleThreshold) {
        stalePeers.push(peerId);
      }
    }

    return stalePeers;
  }

  /**
   * Remove stale peers
   */
  removeStalePeers() {
    const stalePeers = this.findStalePeers();

    for (let peerId of stalePeers) {
      this.peers.delete(peerId);
      logger.info(`Removed stale peer: ${peerId}`);
    }

    return stalePeers.length;
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

    logger.warn(`Network alert [${severity}]: ${message}`);

    return alert;
  }

  /**
   * Get network metrics
   */
  getMetrics() {
    return {
      current: this.metrics,
      history: this.metricsHistory.slice(-100)
    };
  }

  /**
   * Get peer information
   */
  getPeerInfo(peerId) {
    return this.peers.get(peerId);
  }

  /**
   * Get all peers
   */
  getAllPeers() {
    return Array.from(this.peers.values());
  }

  /**
   * Get peer statistics
   */
  getPeerStats() {
    const peers = Array.from(this.peers.values());

    // Sort by various metrics
    const mostActive = [...peers]
      .sort((a, b) => (b.messagesReceived + b.messagesSent) - (a.messagesReceived + a.messagesSent))
      .slice(0, 10);

    const lowestLatency = [...peers]
      .filter(p => p.latency > 0)
      .sort((a, b) => a.latency - b.latency)
      .slice(0, 10);

    const highestBandwidth = [...peers]
      .sort((a, b) => (b.bytesReceived + b.bytesSent) - (a.bytesReceived + a.bytesSent))
      .slice(0, 10);

    return {
      mostActive,
      lowestLatency,
      highestBandwidth,
      totalPeers: peers.length
    };
  }

  /**
   * Get network health status
   */
  getHealthStatus() {
    const latestCheck = this.healthChecks[this.healthChecks.length - 1];

    return {
      status: latestCheck?.overallStatus || 'unknown',
      lastCheck: latestCheck?.timestamp || null,
      checks: latestCheck?.checks || [],
      alerts: this.getRecentAlerts(10)
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 10) {
    return this.alerts.slice(-limit).reverse();
  }

  /**
   * Get network topology
   */
  getNetworkTopology() {
    const nodes = [];
    const connections = [];

    for (let [peerId, peer] of this.peers) {
      nodes.push({
        id: peerId,
        url: peer.url,
        latency: peer.latency,
        active: Date.now() - peer.lastSeen < 60000
      });

      // In production, track actual connections between peers
      // For now, assume all peers connect to us
      connections.push({
        source: 'self',
        target: peerId,
        latency: peer.latency
      });
    }

    return {
      nodes,
      connections,
      timestamp: Date.now()
    };
  }

  /**
   * Get bandwidth statistics
   */
  getBandwidthStats() {
    let totalReceived = 0;
    let totalSent = 0;

    for (let [peerId, peer] of this.peers) {
      totalReceived += peer.bytesReceived;
      totalSent += peer.bytesSent;
    }

    const recentHistory = this.metricsHistory.slice(-60); // Last 10 minutes
    const bandwidthHistory = recentHistory.map(m => ({
      timestamp: m.timestamp,
      bandwidth: m.totalBandwidth
    }));

    return {
      totalReceived,
      totalSent,
      total: totalReceived + totalSent,
      history: bandwidthHistory,
      avgPerPeer: (totalReceived + totalSent) / (this.peers.size || 1)
    };
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    // In production, track actual sync progress
    // This is simplified
    return {
      syncing: false,
      currentBlock: this.p2pServer?.blockchain?.chain.length || 0,
      highestBlock: this.p2pServer?.blockchain?.chain.length || 0,
      syncProgress: 100,
      peersWithHigherChain: 0
    };
  }

  /**
   * Export monitoring data
   */
  exportData() {
    return {
      metrics: this.metrics,
      peers: Array.from(this.peers.values()),
      alerts: this.alerts,
      healthChecks: this.healthChecks.slice(-10),
      exportedAt: Date.now()
    };
  }

  /**
   * Get comprehensive network report
   */
  getNetworkReport() {
    return {
      overview: this.metrics,
      health: this.getHealthStatus(),
      peers: {
        total: this.peers.size,
        active: this.metrics.activePeers,
        stats: this.getPeerStats()
      },
      bandwidth: this.getBandwidthStats(),
      sync: this.getSyncStats(),
      topology: this.getNetworkTopology(),
      generatedAt: Date.now()
    };
  }

  /**
   * Clear old data
   */
  cleanup() {
    // Remove stale peers
    const removed = this.removeStalePeers();

    // Clear old alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Clear old health checks
    if (this.healthChecks.length > 100) {
      this.healthChecks = this.healthChecks.slice(-100);
    }

    // Clear old metrics history
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }

    logger.info(`Network monitor cleanup: removed ${removed} stale peers`);

    return { removedPeers: removed };
  }
}

module.exports = NetworkMonitor;
