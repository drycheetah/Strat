const crypto = require('crypto');

/**
 * Anti-Cheat System for games
 * Implements various detection mechanisms to prevent cheating
 */
class AntiCheatSystem {
  constructor() {
    this.violations = new Map(); // address -> violations array
    this.activeSessions = new Map(); // sessionId -> session data
    this.banList = new Set(); // banned addresses
    this.suspiciousPatterns = new Map(); // address -> pattern data
  }

  /**
   * Initialize anti-cheat for a game session
   * @param {string} sessionId - Game session ID
   * @param {Array} players - Array of player addresses
   * @returns {object} Session tracking data
   */
  initSession(sessionId, players) {
    const session = {
      sessionId,
      players: new Map(),
      startTime: Date.now(),
      checksPerformed: 0,
      violations: []
    };

    for (const player of players) {
      session.players.set(player, {
        address: player,
        checksums: [],
        actions: [],
        movements: [],
        lastHeartbeat: Date.now(),
        suspicious: false,
        violationCount: 0
      });
    }

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Verify game client integrity
   * @param {string} sessionId - Session ID
   * @param {string} address - Player address
   * @param {string} clientChecksum - Client's game files checksum
   * @param {string} expectedChecksum - Expected checksum
   * @returns {object} Verification result
   */
  verifyClientIntegrity(sessionId, address, clientChecksum, expectedChecksum) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    const player = session.players.get(address);
    if (!player) {
      return { valid: false, reason: 'Player not found' };
    }

    const isValid = clientChecksum === expectedChecksum;

    player.checksums.push({
      timestamp: Date.now(),
      provided: clientChecksum,
      expected: expectedChecksum,
      valid: isValid
    });

    session.checksPerformed++;

    if (!isValid) {
      this.recordViolation(sessionId, address, 'CLIENT_INTEGRITY', {
        checksum: clientChecksum,
        expected: expectedChecksum
      });
    }

    return {
      valid: isValid,
      reason: isValid ? 'Client integrity verified' : 'Client integrity check failed'
    };
  }

  /**
   * Detect speed hacks by analyzing movement
   * @param {string} sessionId - Session ID
   * @param {string} address - Player address
   * @param {object} movement - Movement data {x, y, z, timestamp}
   * @param {number} maxSpeed - Maximum allowed speed
   * @returns {object} Detection result
   */
  detectSpeedHack(sessionId, address, movement, maxSpeed) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return { detected: false };

    const player = session.players.get(address);
    if (!player) return { detected: false };

    player.movements.push(movement);

    // Need at least 2 positions to calculate speed
    if (player.movements.length < 2) {
      return { detected: false };
    }

    const lastMovement = player.movements[player.movements.length - 2];
    const timeDiff = (movement.timestamp - lastMovement.timestamp) / 1000; // seconds

    if (timeDiff === 0) return { detected: false };

    // Calculate distance
    const dx = movement.x - lastMovement.x;
    const dy = movement.y - lastMovement.y;
    const dz = movement.z - lastMovement.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const speed = distance / timeDiff;
    const isSpeedHack = speed > maxSpeed * 1.5; // 50% tolerance

    if (isSpeedHack) {
      this.recordViolation(sessionId, address, 'SPEED_HACK', {
        speed,
        maxSpeed,
        distance,
        timeDiff,
        position: movement
      });
    }

    return {
      detected: isSpeedHack,
      speed,
      maxSpeed,
      violation: isSpeedHack ? 'Player moving too fast' : null
    };
  }

  /**
   * Detect impossible actions (e.g., actions too fast)
   * @param {string} sessionId - Session ID
   * @param {string} address - Player address
   * @param {string} action - Action type
   * @param {number} minCooldown - Minimum time between actions (ms)
   * @returns {object} Detection result
   */
  detectImpossibleAction(sessionId, address, action, minCooldown) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return { detected: false };

    const player = session.players.get(address);
    if (!player) return { detected: false };

    const now = Date.now();
    const lastAction = player.actions.filter(a => a.type === action).pop();

    player.actions.push({
      type: action,
      timestamp: now
    });

    // Keep only recent actions (last minute)
    player.actions = player.actions.filter(a => now - a.timestamp < 60000);

    if (lastAction) {
      const timeSinceLastAction = now - lastAction.timestamp;
      const isTooFast = timeSinceLastAction < minCooldown;

      if (isTooFast) {
        this.recordViolation(sessionId, address, 'IMPOSSIBLE_ACTION', {
          action,
          timeSinceLastAction,
          minCooldown,
          violation: 'Action performed too quickly'
        });

        return {
          detected: true,
          timeSinceLastAction,
          minCooldown,
          violation: 'Action cooldown not respected'
        };
      }
    }

    return { detected: false };
  }

  /**
   * Detect automated play (botting)
   * @param {string} sessionId - Session ID
   * @param {string} address - Player address
   * @returns {object} Detection result
   */
  detectBotting(sessionId, address) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return { detected: false, confidence: 0 };

    const player = session.players.get(address);
    if (!player || player.actions.length < 50) {
      return { detected: false, confidence: 0 };
    }

    let suspicionScore = 0;
    const recentActions = player.actions.slice(-100);

    // Check for perfect timing patterns
    const timings = [];
    for (let i = 1; i < recentActions.length; i++) {
      const diff = recentActions[i].timestamp - recentActions[i - 1].timestamp;
      timings.push(diff);
    }

    // Calculate timing variance
    const avgTiming = timings.reduce((sum, t) => sum + t, 0) / timings.length;
    const variance = timings.reduce((sum, t) => sum + Math.pow(t - avgTiming, 2), 0) / timings.length;
    const stdDev = Math.sqrt(variance);

    // Very low variance suggests automated play
    if (stdDev < 50 && timings.length > 20) {
      suspicionScore += 40;
    }

    // Check for repetitive action sequences
    const actionSequence = recentActions.map(a => a.type).join(',');
    const sequencePattern = actionSequence.match(/(.{3,})\1{3,}/);
    if (sequencePattern) {
      suspicionScore += 30;
    }

    // Check for inhuman consistency (e.g., perfect headshot percentage)
    const successRate = this.calculateSuccessRate(player.actions);
    if (successRate > 0.95) {
      suspicionScore += 30;
    }

    const detected = suspicionScore > 60;

    if (detected) {
      this.recordViolation(sessionId, address, 'BOTTING', {
        suspicionScore,
        timingVariance: stdDev,
        hasRepetitivePattern: !!sequencePattern,
        successRate
      });
    }

    return {
      detected,
      confidence: Math.min(suspicionScore, 100),
      reasons: {
        lowTimingVariance: stdDev < 50,
        repetitivePattern: !!sequencePattern,
        inhumanConsistency: successRate > 0.95
      }
    };
  }

  /**
   * Detect wallhacks/aimbots through statistical analysis
   * @param {string} sessionId - Session ID
   * @param {string} address - Player address
   * @param {object} combatStats - Combat statistics
   * @returns {object} Detection result
   */
  detectAimAssist(sessionId, address, combatStats) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return { detected: false, confidence: 0 };

    let suspicionScore = 0;

    // Headshot percentage (>80% is suspicious)
    if (combatStats.headshotPercentage > 80) {
      suspicionScore += 40;
    } else if (combatStats.headshotPercentage > 65) {
      suspicionScore += 20;
    }

    // Hit rate (>90% is suspicious)
    if (combatStats.hitRate > 90) {
      suspicionScore += 30;
    } else if (combatStats.hitRate > 75) {
      suspicionScore += 15;
    }

    // Tracking suspicious movement (e.g., following enemies through walls)
    if (combatStats.wallTrackingScore > 0.7) {
      suspicionScore += 30;
    }

    const detected = suspicionScore > 50;

    if (detected) {
      this.recordViolation(sessionId, address, 'AIM_ASSIST', {
        suspicionScore,
        headshotPercentage: combatStats.headshotPercentage,
        hitRate: combatStats.hitRate,
        wallTrackingScore: combatStats.wallTrackingScore
      });
    }

    return {
      detected,
      confidence: Math.min(suspicionScore, 100),
      headshotPercentage: combatStats.headshotPercentage,
      hitRate: combatStats.hitRate
    };
  }

  /**
   * Heartbeat check to ensure client is responsive
   * @param {string} sessionId - Session ID
   * @param {string} address - Player address
   * @param {number} maxInterval - Max time between heartbeats (ms)
   * @returns {object} Check result
   */
  checkHeartbeat(sessionId, address, maxInterval = 5000) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return { alive: false };

    const player = session.players.get(address);
    if (!player) return { alive: false };

    const now = Date.now();
    const timeSinceLastHeartbeat = now - player.lastHeartbeat;
    const isResponsive = timeSinceLastHeartbeat < maxInterval;

    if (!isResponsive) {
      this.recordViolation(sessionId, address, 'NO_HEARTBEAT', {
        timeSinceLastHeartbeat,
        maxInterval
      });
    }

    player.lastHeartbeat = now;

    return {
      alive: isResponsive,
      timeSinceLastHeartbeat
    };
  }

  /**
   * Record a violation
   * @param {string} sessionId - Session ID
   * @param {string} address - Player address
   * @param {string} type - Violation type
   * @param {object} details - Violation details
   */
  recordViolation(sessionId, address, type, details) {
    const violation = {
      sessionId,
      address,
      type,
      details,
      timestamp: Date.now(),
      severity: this.getSeverity(type)
    };

    // Add to session violations
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.violations.push(violation);
      const player = session.players.get(address);
      if (player) {
        player.violationCount++;
        player.suspicious = player.violationCount > 2;
      }
    }

    // Add to player's violation history
    if (!this.violations.has(address)) {
      this.violations.set(address, []);
    }
    this.violations.get(address).push(violation);

    // Auto-ban on severe violations
    if (violation.severity === 'CRITICAL' || this.violations.get(address).length > 10) {
      this.banPlayer(address, `Automatic ban: ${type}`);
    }
  }

  /**
   * Get severity level for violation type
   * @param {string} type - Violation type
   * @returns {string} Severity level
   */
  getSeverity(type) {
    const severityMap = {
      'CLIENT_INTEGRITY': 'CRITICAL',
      'SPEED_HACK': 'HIGH',
      'IMPOSSIBLE_ACTION': 'MEDIUM',
      'BOTTING': 'HIGH',
      'AIM_ASSIST': 'HIGH',
      'NO_HEARTBEAT': 'LOW'
    };
    return severityMap[type] || 'LOW';
  }

  /**
   * Ban a player
   * @param {string} address - Player address
   * @param {string} reason - Ban reason
   * @returns {object} Ban result
   */
  banPlayer(address, reason) {
    this.banList.add(address);

    return {
      banned: true,
      address,
      reason,
      timestamp: Date.now(),
      violations: this.violations.get(address) || []
    };
  }

  /**
   * Check if player is banned
   * @param {string} address - Player address
   * @returns {boolean} Is banned
   */
  isBanned(address) {
    return this.banList.has(address);
  }

  /**
   * Get player's violation history
   * @param {string} address - Player address
   * @returns {Array} Violations
   */
  getViolations(address) {
    return this.violations.get(address) || [];
  }

  /**
   * Calculate success rate from actions
   * @param {Array} actions - Player actions
   * @returns {number} Success rate (0-1)
   */
  calculateSuccessRate(actions) {
    const successActions = actions.filter(a => a.success);
    return actions.length > 0 ? successActions.length / actions.length : 0;
  }

  /**
   * Generate anti-cheat report for session
   * @param {string} sessionId - Session ID
   * @returns {object} Report
   */
  generateReport(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    const report = {
      sessionId,
      duration: Date.now() - session.startTime,
      checksPerformed: session.checksPerformed,
      violations: session.violations,
      players: []
    };

    for (const [address, player] of session.players) {
      report.players.push({
        address,
        violationCount: player.violationCount,
        suspicious: player.suspicious,
        checksumVerifications: player.checksums.length,
        actionsTracked: player.actions.length,
        movementsTracked: player.movements.length
      });
    }

    return report;
  }

  /**
   * Clean up old session data
   * @param {number} maxAge - Maximum age in milliseconds
   */
  cleanup(maxAge = 3600000) { // Default 1 hour
    const now = Date.now();

    for (const [sessionId, session] of this.activeSessions) {
      if (now - session.startTime > maxAge) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

module.exports = AntiCheatSystem;
