const crypto = require('crypto');

/**
 * Game State Management System
 * Handles state synchronization, validation, and persistence
 */
class GameStateManager {
  constructor() {
    this.states = new Map(); // sessionId -> state data
    this.stateHistory = new Map(); // sessionId -> array of state snapshots
    this.checkpoints = new Map(); // sessionId -> checkpoints
  }

  /**
   * Initialize game state for a session
   * @param {string} sessionId - Session ID
   * @param {object} initialState - Initial game state
   * @param {object} config - Configuration
   * @returns {object} Initialized state
   */
  initializeState(sessionId, initialState, config = {}) {
    const state = {
      sessionId,
      version: 1,
      data: initialState,
      players: new Map(),
      timestamp: Date.now(),
      checksum: this.calculateChecksum(initialState),
      locked: false,
      config: {
        historyLimit: config.historyLimit || 1000,
        snapshotInterval: config.snapshotInterval || 5000,
        validateChecksums: config.validateChecksums !== false,
        enableRollback: config.enableRollback !== false
      }
    };

    this.states.set(sessionId, state);
    this.stateHistory.set(sessionId, []);
    this.checkpoints.set(sessionId, []);

    // Take initial snapshot
    this.takeSnapshot(sessionId);

    return state;
  }

  /**
   * Update game state
   * @param {string} sessionId - Session ID
   * @param {object} updates - State updates
   * @param {string} playerId - Player making the update
   * @returns {object} Updated state
   */
  updateState(sessionId, updates, playerId = null) {
    const state = this.states.get(sessionId);
    if (!state) {
      throw new Error('Session not found');
    }

    if (state.locked) {
      throw new Error('State is locked');
    }

    // Record previous state in history
    this.recordHistory(sessionId, state.data, playerId);

    // Apply updates
    state.data = this.mergeState(state.data, updates);
    state.version++;
    state.timestamp = Date.now();
    state.checksum = this.calculateChecksum(state.data);

    // Auto-snapshot at intervals
    if (this.shouldTakeSnapshot(sessionId)) {
      this.takeSnapshot(sessionId);
    }

    return {
      version: state.version,
      checksum: state.checksum,
      timestamp: state.timestamp
    };
  }

  /**
   * Get current game state
   * @param {string} sessionId - Session ID
   * @returns {object} Current state
   */
  getState(sessionId) {
    const state = this.states.get(sessionId);
    if (!state) return null;

    return {
      version: state.version,
      data: JSON.parse(JSON.stringify(state.data)), // Deep copy
      timestamp: state.timestamp,
      checksum: state.checksum
    };
  }

  /**
   * Validate state checksum
   * @param {string} sessionId - Session ID
   * @param {string} clientChecksum - Client's checksum
   * @returns {boolean} Is valid
   */
  validateChecksum(sessionId, clientChecksum) {
    const state = this.states.get(sessionId);
    if (!state) return false;

    return state.checksum === clientChecksum;
  }

  /**
   * Take a state snapshot
   * @param {string} sessionId - Session ID
   * @returns {object} Snapshot
   */
  takeSnapshot(sessionId) {
    const state = this.states.get(sessionId);
    if (!state) return null;

    const snapshot = {
      version: state.version,
      data: JSON.parse(JSON.stringify(state.data)),
      timestamp: Date.now(),
      checksum: state.checksum
    };

    const checkpoints = this.checkpoints.get(sessionId);
    checkpoints.push(snapshot);

    // Limit checkpoint history
    if (checkpoints.length > 100) {
      checkpoints.shift();
    }

    return snapshot;
  }

  /**
   * Rollback to previous state
   * @param {string} sessionId - Session ID
   * @param {number} version - Version to rollback to (optional)
   * @returns {object} Restored state
   */
  rollback(sessionId, version = null) {
    const state = this.states.get(sessionId);
    if (!state || !state.config.enableRollback) {
      throw new Error('Rollback not available');
    }

    const checkpoints = this.checkpoints.get(sessionId);
    let targetCheckpoint;

    if (version) {
      targetCheckpoint = checkpoints.find(c => c.version === version);
    } else {
      targetCheckpoint = checkpoints[checkpoints.length - 2]; // Previous checkpoint
    }

    if (!targetCheckpoint) {
      throw new Error('Target checkpoint not found');
    }

    state.data = JSON.parse(JSON.stringify(targetCheckpoint.data));
    state.version = targetCheckpoint.version + 1; // Increment from checkpoint
    state.timestamp = Date.now();
    state.checksum = this.calculateChecksum(state.data);

    return this.getState(sessionId);
  }

  /**
   * Lock state (prevent updates)
   * @param {string} sessionId - Session ID
   */
  lockState(sessionId) {
    const state = this.states.get(sessionId);
    if (state) {
      state.locked = true;
    }
  }

  /**
   * Unlock state
   * @param {string} sessionId - Session ID
   */
  unlockState(sessionId) {
    const state = this.states.get(sessionId);
    if (state) {
      state.locked = false;
    }
  }

  /**
   * Calculate state checksum
   * @param {object} data - State data
   * @returns {string} Checksum
   */
  calculateChecksum(data) {
    const json = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Merge state updates
   * @param {object} current - Current state
   * @param {object} updates - Updates to apply
   * @returns {object} Merged state
   */
  mergeState(current, updates) {
    const merged = JSON.parse(JSON.stringify(current));

    for (const [key, value] of Object.entries(updates)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = this.mergeState(merged[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Record state change in history
   * @param {string} sessionId - Session ID
   * @param {object} data - State data
   * @param {string} playerId - Player ID
   */
  recordHistory(sessionId, data, playerId) {
    const state = this.states.get(sessionId);
    if (!state) return;

    const history = this.stateHistory.get(sessionId);
    history.push({
      version: state.version,
      data: JSON.parse(JSON.stringify(data)),
      timestamp: Date.now(),
      playerId
    });

    // Limit history size
    if (history.length > state.config.historyLimit) {
      history.shift();
    }
  }

  /**
   * Check if snapshot should be taken
   * @param {string} sessionId - Session ID
   * @returns {boolean} Should take snapshot
   */
  shouldTakeSnapshot(sessionId) {
    const checkpoints = this.checkpoints.get(sessionId);
    if (!checkpoints || checkpoints.length === 0) return true;

    const state = this.states.get(sessionId);
    const lastCheckpoint = checkpoints[checkpoints.length - 1];
    const timeSinceSnapshot = Date.now() - lastCheckpoint.timestamp;

    return timeSinceSnapshot >= state.config.snapshotInterval;
  }

  /**
   * Get state history
   * @param {string} sessionId - Session ID
   * @param {number} limit - Max entries to return
   * @returns {Array} History entries
   */
  getHistory(sessionId, limit = 100) {
    const history = this.stateHistory.get(sessionId) || [];
    return history.slice(-limit);
  }

  /**
   * Get diff between two state versions
   * @param {string} sessionId - Session ID
   * @param {number} fromVersion - From version
   * @param {number} toVersion - To version
   * @returns {object} Diff
   */
  getDiff(sessionId, fromVersion, toVersion) {
    const history = this.stateHistory.get(sessionId);
    if (!history) return null;

    const fromState = history.find(h => h.version === fromVersion);
    const toState = history.find(h => h.version === toVersion);

    if (!fromState || !toState) return null;

    return this.calculateDiff(fromState.data, toState.data);
  }

  /**
   * Calculate diff between two objects
   * @param {object} from - From object
   * @param {object} to - To object
   * @returns {object} Diff
   */
  calculateDiff(from, to) {
    const diff = {
      added: {},
      modified: {},
      removed: {}
    };

    // Check for modifications and additions
    for (const [key, value] of Object.entries(to)) {
      if (!(key in from)) {
        diff.added[key] = value;
      } else if (JSON.stringify(from[key]) !== JSON.stringify(value)) {
        diff.modified[key] = { from: from[key], to: value };
      }
    }

    // Check for removals
    for (const key of Object.keys(from)) {
      if (!(key in to)) {
        diff.removed[key] = from[key];
      }
    }

    return diff;
  }

  /**
   * Synchronize state between clients
   * @param {string} sessionId - Session ID
   * @param {string} playerId - Player ID
   * @param {number} clientVersion - Client's state version
   * @returns {object} Sync data
   */
  syncState(sessionId, playerId, clientVersion) {
    const state = this.states.get(sessionId);
    if (!state) {
      return { error: 'Session not found' };
    }

    // Client is up to date
    if (clientVersion === state.version) {
      return {
        upToDate: true,
        version: state.version,
        checksum: state.checksum
      };
    }

    // Client is behind
    if (clientVersion < state.version) {
      return {
        upToDate: false,
        version: state.version,
        data: state.data,
        checksum: state.checksum,
        diff: this.getDiff(sessionId, clientVersion, state.version)
      };
    }

    // Client is ahead (shouldn't happen)
    return {
      error: 'Client version ahead of server',
      serverVersion: state.version,
      clientVersion
    };
  }

  /**
   * Export state for persistence
   * @param {string} sessionId - Session ID
   * @returns {object} Exported state
   */
  exportState(sessionId) {
    const state = this.states.get(sessionId);
    const history = this.stateHistory.get(sessionId);
    const checkpoints = this.checkpoints.get(sessionId);

    if (!state) return null;

    return {
      sessionId,
      state: {
        version: state.version,
        data: state.data,
        timestamp: state.timestamp,
        checksum: state.checksum,
        config: state.config
      },
      history: history || [],
      checkpoints: checkpoints || []
    };
  }

  /**
   * Import state from persistence
   * @param {object} exported - Exported state
   * @returns {boolean} Success
   */
  importState(exported) {
    if (!exported || !exported.sessionId) return false;

    const state = {
      sessionId: exported.sessionId,
      version: exported.state.version,
      data: exported.state.data,
      players: new Map(),
      timestamp: exported.state.timestamp,
      checksum: exported.state.checksum,
      locked: false,
      config: exported.state.config
    };

    this.states.set(exported.sessionId, state);
    this.stateHistory.set(exported.sessionId, exported.history || []);
    this.checkpoints.set(exported.sessionId, exported.checkpoints || []);

    return true;
  }

  /**
   * Clean up old sessions
   * @param {number} maxAge - Max age in milliseconds
   */
  cleanup(maxAge = 3600000) {
    const now = Date.now();

    for (const [sessionId, state] of this.states) {
      if (now - state.timestamp > maxAge) {
        this.states.delete(sessionId);
        this.stateHistory.delete(sessionId);
        this.checkpoints.delete(sessionId);
      }
    }
  }

  /**
   * Get statistics
   * @returns {object} Statistics
   */
  getStats() {
    return {
      activeSessions: this.states.size,
      totalCheckpoints: Array.from(this.checkpoints.values()).reduce((sum, c) => sum + c.length, 0),
      totalHistory: Array.from(this.stateHistory.values()).reduce((sum, h) => sum + h.length, 0)
    };
  }
}

module.exports = GameStateManager;
