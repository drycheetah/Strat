/**
 * STRAT Gaming SDK
 * Complete SDK for integrating games with STRAT blockchain
 */
class STRATGamingSDK {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || 'http://localhost:3000/api';
    this.gameId = config.gameId;
    this.apiKey = config.apiKey;
    this.address = config.address;
    this.sessionId = null;
    this.eventListeners = new Map();
  }

  /**
   * Initialize the SDK
   */
  async initialize() {
    if (!this.gameId) {
      throw new Error('Game ID is required');
    }

    // Verify game registration
    const game = await this.getGameInfo();
    if (!game) {
      throw new Error('Game not registered');
    }

    return {
      initialized: true,
      game,
      playToEarn: game.playToEarn.enabled
    };
  }

  // ============= GAME SESSION MANAGEMENT =============

  /**
   * Create a new game session
   * @param {object} options - Session options
   */
  async createSession(options = {}) {
    const response = await this.request('POST', '/gaming/sessions', {
      gameId: this.gameId,
      players: options.players || [{ address: this.address }],
      ...options
    });

    this.sessionId = response.sessionId;
    return response;
  }

  /**
   * Join an existing session
   * @param {string} sessionId - Session ID
   */
  async joinSession(sessionId) {
    const response = await this.request('POST', `/gaming/sessions/${sessionId}/join`, {
      address: this.address
    });

    this.sessionId = sessionId;
    return response;
  }

  /**
   * Leave current session
   */
  async leaveSession() {
    if (!this.sessionId) return;

    await this.request('POST', `/gaming/sessions/${this.sessionId}/leave`, {
      address: this.address
    });

    this.sessionId = null;
  }

  /**
   * Update game session state
   * @param {object} updates - State updates
   */
  async updateSession(updates) {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    return await this.request('PATCH', `/gaming/sessions/${this.sessionId}`, updates);
  }

  /**
   * End game session
   * @param {object} results - Final results
   */
  async endSession(results) {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    const response = await this.request('POST', `/gaming/sessions/${this.sessionId}/end`, results);
    this.sessionId = null;
    return response;
  }

  // ============= PLAYER MANAGEMENT =============

  /**
   * Get player profile
   * @param {string} address - Player address
   */
  async getPlayerProfile(address = this.address) {
    return await this.request('GET', `/gaming/players/${address}`);
  }

  /**
   * Update player stats
   * @param {object} stats - Stats to update
   */
  async updatePlayerStats(stats) {
    return await this.request('POST', `/gaming/players/${this.address}/stats`, stats);
  }

  /**
   * Get player assets
   * @param {string} address - Player address
   */
  async getPlayerAssets(address = this.address) {
    return await this.request('GET', `/gaming/players/${address}/assets`, {
      gameId: this.gameId
    });
  }

  // ============= PLAY-TO-EARN =============

  /**
   * Award tokens to player
   * @param {string} address - Player address
   * @param {number} amount - Amount to award
   * @param {string} reason - Reason for award
   */
  async awardTokens(address, amount, reason) {
    return await this.request('POST', '/gaming/rewards/tokens', {
      gameId: this.gameId,
      address,
      amount,
      reason,
      sessionId: this.sessionId
    });
  }

  /**
   * Award NFT to player
   * @param {string} address - Player address
   * @param {object} nftData - NFT data
   */
  async awardNFT(address, nftData) {
    return await this.request('POST', '/gaming/rewards/nft', {
      gameId: this.gameId,
      address,
      ...nftData,
      sessionId: this.sessionId
    });
  }

  /**
   * Award achievement to player
   * @param {string} address - Player address
   * @param {string} achievementId - Achievement ID
   */
  async awardAchievement(address, achievementId) {
    return await this.request('POST', '/gaming/rewards/achievement', {
      gameId: this.gameId,
      address,
      achievementId,
      sessionId: this.sessionId
    });
  }

  // ============= GAME ASSETS =============

  /**
   * Create in-game asset
   * @param {object} assetData - Asset data
   */
  async createAsset(assetData) {
    return await this.request('POST', '/gaming/assets', {
      gameId: this.gameId,
      ...assetData
    });
  }

  /**
   * Mint asset as NFT
   * @param {string} assetId - Asset ID
   */
  async mintAssetNFT(assetId) {
    return await this.request('POST', `/gaming/assets/${assetId}/mint`, {
      gameId: this.gameId
    });
  }

  /**
   * Transfer asset
   * @param {string} assetId - Asset ID
   * @param {string} from - From address
   * @param {string} to - To address
   */
  async transferAsset(assetId, from, to) {
    return await this.request('POST', `/gaming/assets/${assetId}/transfer`, {
      from,
      to
    });
  }

  /**
   * Equip asset
   * @param {string} assetId - Asset ID
   */
  async equipAsset(assetId) {
    return await this.request('POST', `/gaming/assets/${assetId}/equip`, {
      address: this.address
    });
  }

  // ============= MATCHMAKING =============

  /**
   * Join matchmaking queue
   * @param {object} preferences - Player preferences
   */
  async joinQueue(preferences = {}) {
    return await this.request('POST', '/gaming/matchmaking/queue', {
      gameId: this.gameId,
      address: this.address,
      preferences
    });
  }

  /**
   * Leave matchmaking queue
   */
  async leaveQueue() {
    return await this.request('DELETE', '/gaming/matchmaking/queue', {
      gameId: this.gameId,
      address: this.address
    });
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    return await this.request('GET', `/gaming/matchmaking/queue/${this.gameId}`);
  }

  // ============= TOURNAMENTS =============

  /**
   * Create tournament
   * @param {object} tournamentData - Tournament data
   */
  async createTournament(tournamentData) {
    return await this.request('POST', '/gaming/tournaments', {
      gameId: this.gameId,
      organizer: this.address,
      ...tournamentData
    });
  }

  /**
   * Register for tournament
   * @param {string} tournamentId - Tournament ID
   */
  async registerForTournament(tournamentId) {
    return await this.request('POST', `/gaming/tournaments/${tournamentId}/register`, {
      address: this.address
    });
  }

  /**
   * Get tournament info
   * @param {string} tournamentId - Tournament ID
   */
  async getTournament(tournamentId) {
    return await this.request('GET', `/gaming/tournaments/${tournamentId}`);
  }

  /**
   * List tournaments
   * @param {object} filters - Filter options
   */
  async listTournaments(filters = {}) {
    return await this.request('GET', '/gaming/tournaments', {
      gameId: this.gameId,
      ...filters
    });
  }

  // ============= LEADERBOARDS =============

  /**
   * Get leaderboard
   * @param {string} leaderboardId - Leaderboard ID
   * @param {number} limit - Number of entries
   */
  async getLeaderboard(leaderboardId, limit = 100) {
    return await this.request('GET', `/gaming/leaderboards/${leaderboardId}`, {
      limit
    });
  }

  /**
   * Update leaderboard entry
   * @param {string} leaderboardId - Leaderboard ID
   * @param {number} value - New value
   */
  async updateLeaderboard(leaderboardId, value) {
    return await this.request('POST', `/gaming/leaderboards/${leaderboardId}/update`, {
      address: this.address,
      value
    });
  }

  /**
   * Get player rank
   * @param {string} leaderboardId - Leaderboard ID
   */
  async getPlayerRank(leaderboardId) {
    return await this.request('GET', `/gaming/leaderboards/${leaderboardId}/rank/${this.address}`);
  }

  // ============= RANDOM NUMBER GENERATION =============

  /**
   * Generate random number
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   */
  async generateRandom(min, max) {
    return await this.request('POST', '/gaming/rng/number', {
      gameId: this.gameId,
      sessionId: this.sessionId,
      min,
      max
    });
  }

  /**
   * Generate random deck
   * @param {number} deckSize - Size of deck
   */
  async shuffleDeck(deckSize = 52) {
    return await this.request('POST', '/gaming/rng/deck', {
      gameId: this.gameId,
      sessionId: this.sessionId,
      deckSize
    });
  }

  /**
   * Weighted random selection
   * @param {Array} items - Items with weights
   */
  async weightedRandom(items) {
    return await this.request('POST', '/gaming/rng/weighted', {
      gameId: this.gameId,
      sessionId: this.sessionId,
      items
    });
  }

  // ============= ANTI-CHEAT =============

  /**
   * Verify client integrity
   * @param {string} checksum - Client checksum
   */
  async verifyIntegrity(checksum) {
    return await this.request('POST', '/gaming/anticheat/verify', {
      sessionId: this.sessionId,
      address: this.address,
      checksum
    });
  }

  /**
   * Report player action
   * @param {string} action - Action type
   * @param {object} data - Action data
   */
  async reportAction(action, data) {
    return await this.request('POST', '/gaming/anticheat/action', {
      sessionId: this.sessionId,
      address: this.address,
      action,
      data
    });
  }

  // ============= REPLAY SYSTEM =============

  /**
   * Start recording
   */
  async startRecording() {
    return await this.request('POST', '/gaming/replay/start', {
      sessionId: this.sessionId,
      gameId: this.gameId
    });
  }

  /**
   * Record event
   * @param {string} eventType - Event type
   * @param {object} data - Event data
   */
  async recordEvent(eventType, data) {
    return await this.request('POST', '/gaming/replay/event', {
      sessionId: this.sessionId,
      eventType,
      data
    });
  }

  /**
   * Stop recording
   */
  async stopRecording() {
    return await this.request('POST', '/gaming/replay/stop', {
      sessionId: this.sessionId
    });
  }

  /**
   * Get replay
   * @param {string} replayId - Replay ID
   */
  async getReplay(replayId) {
    return await this.request('GET', `/gaming/replay/${replayId}`);
  }

  // ============= UTILITIES =============

  /**
   * Get game info
   */
  async getGameInfo() {
    return await this.request('GET', `/gaming/games/${this.gameId}`);
  }

  /**
   * Make HTTP request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request data
   */
  async request(method, endpoint, data = null) {
    const url = `${this.apiUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Game-Id': this.gameId,
        'X-API-Key': this.apiKey || ''
      }
    };

    if (data) {
      if (method === 'GET') {
        const params = new URLSearchParams(data);
        url += `?${params}`;
      } else {
        options.body = JSON.stringify(data);
      }
    }

    const response = await fetch(url, options);
    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error || 'Request failed');
    }

    return json;
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event) || [];
    for (const callback of listeners) {
      callback(data);
    }
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = STRATGamingSDK;
} else {
  window.STRATGamingSDK = STRATGamingSDK;
}
