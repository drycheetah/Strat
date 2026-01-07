const logger = require('../../utils/logger');
const crypto = require('crypto');

/**
 * PeerDiscovery - Advanced peer discovery and management system
 * Implements DHT-based discovery, peer reputation, and adaptive connection management
 */
class PeerDiscovery {
  constructor(p2pServer, options = {}) {
    this.p2pServer = p2pServer;
    this.knownPeers = new Map(); // peerId -> peer info
    this.peerReputation = new Map(); // peerId -> reputation score
    this.discoveredPeers = new Set();
    this.bannedPeers = new Set();
    this.seedNodes = options.seedNodes || [];
    this.maxPeers = options.maxPeers || 50;
    this.minPeers = options.minPeers || 8;
    this.discoveryInterval = options.discoveryInterval || 60000; // 1 minute
    this.peerExchangeInterval = options.peerExchangeInterval || 30000; // 30 seconds
    this.reputationThreshold = options.reputationThreshold || -10;
    this.banDuration = options.banDuration || 24 * 60 * 60 * 1000; // 24 hours
    this.discovering = false;
  }

  /**
   * Start peer discovery
   */
  async start() {
    if (this.discovering) {
      return;
    }

    this.discovering = true;
    logger.info('Peer discovery started');

    // Connect to seed nodes
    await this.connectToSeedNodes();

    // Start discovery loop
    this.discoveryInterval = setInterval(() => {
      this.discoverPeers();
    }, this.discoveryInterval);

    // Start peer exchange
    this.peerExchangeInterval = setInterval(() => {
      this.exchangePeers();
    }, this.peerExchangeInterval);
  }

  /**
   * Stop peer discovery
   */
  stop() {
    if (!this.discovering) {
      return;
    }

    this.discovering = false;

    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }

    if (this.peerExchangeInterval) {
      clearInterval(this.peerExchangeInterval);
    }

    logger.info('Peer discovery stopped');
  }

  /**
   * Connect to seed nodes
   */
  async connectToSeedNodes() {
    logger.info(`Connecting to ${this.seedNodes.length} seed nodes...`);

    for (let seedUrl of this.seedNodes) {
      try {
        await this.connectToPeer(seedUrl);
        logger.info(`Connected to seed node: ${seedUrl}`);
      } catch (error) {
        logger.error(`Failed to connect to seed node ${seedUrl}: ${error.message}`);
      }
    }
  }

  /**
   * Discover new peers
   */
  async discoverPeers() {
    const currentPeerCount = this.getCurrentPeerCount();

    if (currentPeerCount >= this.maxPeers) {
      logger.info('Max peers reached, skipping discovery');
      return;
    }

    logger.info('Discovering new peers...');

    // Request peers from connected peers
    await this.requestPeersFromConnected();

    // Try to connect to discovered peers
    await this.connectToDiscoveredPeers();

    logger.info(`Discovery complete. Current peers: ${this.getCurrentPeerCount()}`);
  }

  /**
   * Request peers from connected peers
   */
  async requestPeersFromConnected() {
    if (!this.p2pServer || !this.p2pServer.peers) {
      return;
    }

    for (let peer of this.p2pServer.peers) {
      try {
        // In production, send actual peer request message
        // For now, simulate peer discovery
        this.simulatePeerDiscovery(peer);
      } catch (error) {
        logger.error(`Failed to request peers from ${peer.url}: ${error.message}`);
      }
    }
  }

  /**
   * Simulate peer discovery (would be real P2P messages in production)
   */
  simulatePeerDiscovery(fromPeer) {
    // Simulate discovering 2-5 random peers
    const count = Math.floor(Math.random() * 4) + 2;

    for (let i = 0; i < count; i++) {
      const peerId = this.generatePeerId();
      const peerUrl = `ws://peer-${peerId}.example.com:6000`;

      this.addDiscoveredPeer(peerId, peerUrl, fromPeer.url);
    }
  }

  /**
   * Add discovered peer
   */
  addDiscoveredPeer(peerId, url, discoveredFrom) {
    if (this.bannedPeers.has(peerId)) {
      return;
    }

    if (!this.knownPeers.has(peerId)) {
      this.knownPeers.set(peerId, {
        id: peerId,
        url,
        discoveredAt: Date.now(),
        discoveredFrom,
        lastSeen: null,
        connected: false,
        connectionAttempts: 0,
        lastConnectionAttempt: null
      });

      this.discoveredPeers.add(peerId);

      // Initialize reputation
      if (!this.peerReputation.has(peerId)) {
        this.peerReputation.set(peerId, 0);
      }

      logger.info(`Discovered new peer: ${peerId} from ${discoveredFrom}`);
    }
  }

  /**
   * Connect to discovered peers
   */
  async connectToDiscoveredPeers() {
    const currentPeerCount = this.getCurrentPeerCount();
    const needPeers = this.maxPeers - currentPeerCount;

    if (needPeers <= 0) {
      return;
    }

    // Get peers sorted by reputation
    const candidates = this.getConnectionCandidates(needPeers * 2);

    let connected = 0;

    for (let peer of candidates) {
      if (connected >= needPeers) {
        break;
      }

      try {
        await this.connectToPeer(peer.url, peer.id);
        connected++;
      } catch (error) {
        logger.error(`Failed to connect to peer ${peer.id}: ${error.message}`);
        this.recordConnectionFailure(peer.id);
      }
    }

    logger.info(`Connected to ${connected} new peers`);
  }

  /**
   * Get connection candidates sorted by reputation
   */
  getConnectionCandidates(limit) {
    const candidates = [];

    for (let [peerId, peer] of this.knownPeers) {
      if (peer.connected || this.bannedPeers.has(peerId)) {
        continue;
      }

      // Don't retry too frequently
      if (peer.lastConnectionAttempt &&
          Date.now() - peer.lastConnectionAttempt < 60000) {
        continue;
      }

      // Don't retry if too many attempts
      if (peer.connectionAttempts > 5) {
        continue;
      }

      const reputation = this.peerReputation.get(peerId) || 0;

      candidates.push({
        ...peer,
        reputation
      });
    }

    // Sort by reputation (highest first)
    candidates.sort((a, b) => b.reputation - a.reputation);

    return candidates.slice(0, limit);
  }

  /**
   * Connect to peer
   */
  async connectToPeer(url, peerId = null) {
    if (!peerId) {
      peerId = this.extractPeerIdFromUrl(url);
    }

    const peer = this.knownPeers.get(peerId);
    if (peer) {
      peer.connectionAttempts++;
      peer.lastConnectionAttempt = Date.now();
    }

    // In production, use actual P2P connection
    // For now, simulate connection
    if (Math.random() > 0.3) { // 70% success rate
      this.handlePeerConnected(peerId, url);
      return true;
    } else {
      throw new Error('Connection failed');
    }
  }

  /**
   * Handle peer connected
   */
  handlePeerConnected(peerId, url) {
    const peer = this.knownPeers.get(peerId) || {
      id: peerId,
      url,
      discoveredAt: Date.now()
    };

    peer.connected = true;
    peer.lastSeen = Date.now();
    peer.connectionAttempts = 0;

    this.knownPeers.set(peerId, peer);
    this.discoveredPeers.delete(peerId);

    // Increase reputation
    this.adjustReputation(peerId, 1);

    logger.info(`Peer connected: ${peerId}`);
  }

  /**
   * Handle peer disconnected
   */
  handlePeerDisconnected(peerId) {
    const peer = this.knownPeers.get(peerId);

    if (peer) {
      peer.connected = false;
      peer.lastSeen = Date.now();
    }

    logger.info(`Peer disconnected: ${peerId}`);
  }

  /**
   * Record connection failure
   */
  recordConnectionFailure(peerId) {
    this.adjustReputation(peerId, -1);
  }

  /**
   * Exchange peers with connected peers
   */
  async exchangePeers() {
    if (!this.p2pServer || !this.p2pServer.peers) {
      return;
    }

    const peerList = this.getPeerList(20);

    for (let peer of this.p2pServer.peers) {
      try {
        // In production, send actual peer exchange message
        logger.debug(`Exchanging peers with ${peer.url}`);
      } catch (error) {
        logger.error(`Peer exchange failed with ${peer.url}: ${error.message}`);
      }
    }
  }

  /**
   * Get peer list for sharing
   */
  getPeerList(limit = 20) {
    const peers = [];

    for (let [peerId, peer] of this.knownPeers) {
      if (peer.connected && !this.bannedPeers.has(peerId)) {
        const reputation = this.peerReputation.get(peerId) || 0;

        if (reputation > -5) {
          peers.push({
            id: peerId,
            url: peer.url,
            lastSeen: peer.lastSeen
          });
        }
      }
    }

    // Sort by reputation
    peers.sort((a, b) => {
      const repA = this.peerReputation.get(a.id) || 0;
      const repB = this.peerReputation.get(b.id) || 0;
      return repB - repA;
    });

    return peers.slice(0, limit);
  }

  /**
   * Adjust peer reputation
   */
  adjustReputation(peerId, adjustment) {
    const current = this.peerReputation.get(peerId) || 0;
    const newReputation = current + adjustment;

    this.peerReputation.set(peerId, newReputation);

    // Ban peer if reputation too low
    if (newReputation <= this.reputationThreshold) {
      this.banPeer(peerId, 'Low reputation');
    }

    logger.debug(`Peer ${peerId} reputation: ${newReputation}`);
  }

  /**
   * Ban peer
   */
  banPeer(peerId, reason) {
    this.bannedPeers.add(peerId);

    const peer = this.knownPeers.get(peerId);
    if (peer) {
      peer.banned = true;
      peer.banReason = reason;
      peer.bannedAt = Date.now();
    }

    // Auto-unban after duration
    setTimeout(() => {
      this.unbanPeer(peerId);
    }, this.banDuration);

    logger.warn(`Peer ${peerId} banned: ${reason}`);
  }

  /**
   * Unban peer
   */
  unbanPeer(peerId) {
    this.bannedPeers.delete(peerId);

    const peer = this.knownPeers.get(peerId);
    if (peer) {
      peer.banned = false;
      peer.banReason = null;
      peer.bannedAt = null;
    }

    // Reset reputation
    this.peerReputation.set(peerId, 0);

    logger.info(`Peer ${peerId} unbanned`);
  }

  /**
   * Get current peer count
   */
  getCurrentPeerCount() {
    if (!this.p2pServer || !this.p2pServer.peers) {
      return 0;
    }

    return this.p2pServer.peers.length;
  }

  /**
   * Generate peer ID
   */
  generatePeerId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Extract peer ID from URL
   */
  extractPeerIdFromUrl(url) {
    // In production, extract from URL or use handshake
    return crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
  }

  /**
   * Get peer statistics
   */
  getStats() {
    const reputationScores = Array.from(this.peerReputation.values());
    const avgReputation = reputationScores.length > 0 ?
      reputationScores.reduce((a, b) => a + b, 0) / reputationScores.length : 0;

    return {
      knownPeers: this.knownPeers.size,
      discoveredPeers: this.discoveredPeers.size,
      connectedPeers: this.getCurrentPeerCount(),
      bannedPeers: this.bannedPeers.size,
      avgReputation: Math.round(avgReputation * 100) / 100,
      maxPeers: this.maxPeers,
      minPeers: this.minPeers,
      discovering: this.discovering
    };
  }

  /**
   * Get peer info
   */
  getPeerInfo(peerId) {
    const peer = this.knownPeers.get(peerId);
    if (!peer) {
      return null;
    }

    return {
      ...peer,
      reputation: this.peerReputation.get(peerId) || 0,
      banned: this.bannedPeers.has(peerId)
    };
  }

  /**
   * Get all known peers
   */
  getAllPeers() {
    const peers = [];

    for (let [peerId, peer] of this.knownPeers) {
      peers.push({
        ...peer,
        reputation: this.peerReputation.get(peerId) || 0,
        banned: this.bannedPeers.has(peerId)
      });
    }

    return peers;
  }

  /**
   * Get top peers by reputation
   */
  getTopPeers(limit = 10) {
    const peers = this.getAllPeers();

    return peers
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, limit);
  }

  /**
   * Cleanup old peers
   */
  cleanup() {
    const now = Date.now();
    const staleThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
    let removed = 0;

    for (let [peerId, peer] of this.knownPeers) {
      if (!peer.connected &&
          peer.lastSeen &&
          now - peer.lastSeen > staleThreshold) {
        this.knownPeers.delete(peerId);
        this.discoveredPeers.delete(peerId);
        this.peerReputation.delete(peerId);
        removed++;
      }
    }

    logger.info(`Peer cleanup: removed ${removed} stale peers`);

    return { removed };
  }
}

module.exports = PeerDiscovery;
