/**
 * Matchmaking System for multiplayer games
 * Implements ELO-based matchmaking with skill rating
 */
class MatchmakingSystem {
  constructor() {
    this.queue = new Map(); // gameId -> array of players waiting
    this.playerStats = new Map(); // address -> player stats
    this.activeMatches = new Map(); // matchId -> match data
  }

  /**
   * Calculate ELO rating change
   * @param {number} playerRating - Current player rating
   * @param {number} opponentRating - Opponent's rating
   * @param {number} score - 1 for win, 0.5 for draw, 0 for loss
   * @param {number} kFactor - K-factor (default 32)
   * @returns {number} Rating change
   */
  calculateELOChange(playerRating, opponentRating, score, kFactor = 32) {
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    return Math.round(kFactor * (score - expectedScore));
  }

  /**
   * Get or create player stats
   * @param {string} address - Player address
   * @returns {object} Player stats
   */
  getPlayerStats(address) {
    if (!this.playerStats.has(address)) {
      this.playerStats.set(address, {
        address,
        rating: 1000,
        wins: 0,
        losses: 0,
        draws: 0,
        totalGames: 0,
        winStreak: 0,
        bestWinStreak: 0,
        loseStreak: 0,
        averageGameDuration: 0,
        preferredRole: null,
        lastActive: Date.now(),
        joinedAt: Date.now()
      });
    }
    return this.playerStats.get(address);
  }

  /**
   * Update player stats after a match
   * @param {string} address - Player address
   * @param {string} result - 'WIN', 'LOSS', or 'DRAW'
   * @param {number} ratingChange - ELO change
   * @param {number} gameDuration - Game duration in seconds
   */
  updatePlayerStats(address, result, ratingChange, gameDuration) {
    const stats = this.getPlayerStats(address);

    stats.rating += ratingChange;
    stats.totalGames++;
    stats.lastActive = Date.now();

    // Update average game duration
    stats.averageGameDuration = Math.round(
      (stats.averageGameDuration * (stats.totalGames - 1) + gameDuration) / stats.totalGames
    );

    if (result === 'WIN') {
      stats.wins++;
      stats.winStreak++;
      stats.loseStreak = 0;
      if (stats.winStreak > stats.bestWinStreak) {
        stats.bestWinStreak = stats.winStreak;
      }
    } else if (result === 'LOSS') {
      stats.losses++;
      stats.loseStreak++;
      stats.winStreak = 0;
    } else if (result === 'DRAW') {
      stats.draws++;
      stats.winStreak = 0;
      stats.loseStreak = 0;
    }

    return stats;
  }

  /**
   * Add player to matchmaking queue
   * @param {string} gameId - Game ID
   * @param {object} player - Player data
   * @returns {object} Queue status
   */
  joinQueue(gameId, player) {
    if (!this.queue.has(gameId)) {
      this.queue.set(gameId, []);
    }

    const queue = this.queue.get(gameId);
    const stats = this.getPlayerStats(player.address);

    const queueEntry = {
      ...player,
      rating: stats.rating,
      queuedAt: Date.now(),
      preferences: player.preferences || {}
    };

    queue.push(queueEntry);

    // Try to find a match
    const match = this.findMatch(gameId);

    return {
      queued: true,
      position: queue.length,
      estimatedWait: this.estimateWaitTime(gameId),
      matchFound: match !== null,
      match: match
    };
  }

  /**
   * Remove player from queue
   * @param {string} gameId - Game ID
   * @param {string} address - Player address
   */
  leaveQueue(gameId, address) {
    if (!this.queue.has(gameId)) return false;

    const queue = this.queue.get(gameId);
    const index = queue.findIndex(p => p.address === address);

    if (index !== -1) {
      queue.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Find suitable match from queue
   * @param {string} gameId - Game ID
   * @returns {object|null} Match data or null
   */
  findMatch(gameId) {
    const queue = this.queue.get(gameId);
    if (!queue || queue.length < 2) return null;

    // Sort by queue time (oldest first)
    queue.sort((a, b) => a.queuedAt - b.queuedAt);

    const player1 = queue[0];
    const maxRatingDiff = this.calculateMaxRatingDiff(Date.now() - player1.queuedAt);

    // Find best match for player1
    let bestMatch = null;
    let bestScore = -1;

    for (let i = 1; i < queue.length; i++) {
      const player2 = queue[i];
      const ratingDiff = Math.abs(player1.rating - player2.rating);

      if (ratingDiff <= maxRatingDiff) {
        const score = this.calculateMatchScore(player1, player2);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = player2;
        }
      }
    }

    if (bestMatch) {
      // Remove matched players from queue
      this.leaveQueue(gameId, player1.address);
      this.leaveQueue(gameId, bestMatch.address);

      const matchId = this.generateMatchId();
      const match = {
        matchId,
        gameId,
        players: [player1, bestMatch],
        ratingDifference: Math.abs(player1.rating - bestMatch.rating),
        matchScore: bestScore,
        createdAt: Date.now()
      };

      this.activeMatches.set(matchId, match);
      return match;
    }

    return null;
  }

  /**
   * Calculate maximum rating difference based on wait time
   * @param {number} waitTime - Time in queue (ms)
   * @returns {number} Max rating difference
   */
  calculateMaxRatingDiff(waitTime) {
    const baseRatingDiff = 50;
    const waitSeconds = waitTime / 1000;

    // Increase max difference by 10 points every 30 seconds, up to 300
    return Math.min(baseRatingDiff + Math.floor(waitSeconds / 30) * 10, 300);
  }

  /**
   * Calculate match quality score
   * @param {object} player1 - First player
   * @param {object} player2 - Second player
   * @returns {number} Match score (higher is better)
   */
  calculateMatchScore(player1, player2) {
    let score = 100;

    // Rating similarity (most important)
    const ratingDiff = Math.abs(player1.rating - player2.rating);
    score -= ratingDiff / 5;

    // Region preference
    if (player1.preferences?.region && player2.preferences?.region) {
      if (player1.preferences.region === player2.preferences.region) {
        score += 20;
      }
    }

    // Game mode preference
    if (player1.preferences?.mode && player2.preferences?.mode) {
      if (player1.preferences.mode === player2.preferences.mode) {
        score += 10;
      }
    }

    // Avoid recent opponents
    if (player1.recentOpponents?.includes(player2.address)) {
      score -= 15;
    }

    return Math.max(score, 0);
  }

  /**
   * Estimate wait time for a player
   * @param {string} gameId - Game ID
   * @returns {number} Estimated wait time in seconds
   */
  estimateWaitTime(gameId) {
    const queue = this.queue.get(gameId);
    if (!queue || queue.length === 0) return 0;

    // Simple estimation: 30 seconds per position in queue
    return queue.length * 30;
  }

  /**
   * Create team-based match
   * @param {string} gameId - Game ID
   * @param {number} teamSize - Players per team
   * @returns {object|null} Match data or null
   */
  findTeamMatch(gameId, teamSize) {
    const queue = this.queue.get(gameId);
    const requiredPlayers = teamSize * 2;

    if (!queue || queue.length < requiredPlayers) return null;

    // Sort by rating
    queue.sort((a, b) => b.rating - a.rating);

    // Balance teams using snake draft
    const team1 = [];
    const team2 = [];
    let leftToRight = true;

    for (let i = 0; i < requiredPlayers; i++) {
      const player = queue[i];
      if (leftToRight) {
        if (team1.length < teamSize) team1.push(player);
        else team2.push(player);
      } else {
        if (team2.length < teamSize) team2.push(player);
        else team1.push(player);
      }

      if ((i + 1) % teamSize === 0) {
        leftToRight = !leftToRight;
      }
    }

    // Remove matched players from queue
    for (const player of [...team1, ...team2]) {
      this.leaveQueue(gameId, player.address);
    }

    const matchId = this.generateMatchId();
    const match = {
      matchId,
      gameId,
      team1: {
        players: team1,
        averageRating: team1.reduce((sum, p) => sum + p.rating, 0) / team1.length
      },
      team2: {
        players: team2,
        averageRating: team2.reduce((sum, p) => sum + p.rating, 0) / team2.length
      },
      teamSize,
      createdAt: Date.now()
    };

    this.activeMatches.set(matchId, match);
    return match;
  }

  /**
   * Battle Royale matchmaking (many players)
   * @param {string} gameId - Game ID
   * @param {number} minPlayers - Minimum players
   * @param {number} maxPlayers - Maximum players
   * @returns {object|null} Match data or null
   */
  findBattleRoyaleMatch(gameId, minPlayers, maxPlayers) {
    const queue = this.queue.get(gameId);

    if (!queue || queue.length < minPlayers) return null;

    // Take up to maxPlayers
    const players = queue.slice(0, maxPlayers);

    // Remove matched players from queue
    for (const player of players) {
      this.leaveQueue(gameId, player.address);
    }

    const matchId = this.generateMatchId();
    const match = {
      matchId,
      gameId,
      players,
      playerCount: players.length,
      averageRating: players.reduce((sum, p) => sum + p.rating, 0) / players.length,
      type: 'BATTLE_ROYALE',
      createdAt: Date.now()
    };

    this.activeMatches.set(matchId, match);
    return match;
  }

  /**
   * Ranked matchmaking with divisions
   * @param {number} rating - Player rating
   * @returns {object} Division info
   */
  getRankDivision(rating) {
    if (rating < 800) return { division: 'BRONZE', tier: 3, name: 'Bronze III' };
    if (rating < 900) return { division: 'BRONZE', tier: 2, name: 'Bronze II' };
    if (rating < 1000) return { division: 'BRONZE', tier: 1, name: 'Bronze I' };
    if (rating < 1100) return { division: 'SILVER', tier: 3, name: 'Silver III' };
    if (rating < 1200) return { division: 'SILVER', tier: 2, name: 'Silver II' };
    if (rating < 1300) return { division: 'SILVER', tier: 1, name: 'Silver I' };
    if (rating < 1400) return { division: 'GOLD', tier: 3, name: 'Gold III' };
    if (rating < 1500) return { division: 'GOLD', tier: 2, name: 'Gold II' };
    if (rating < 1600) return { division: 'GOLD', tier: 1, name: 'Gold I' };
    if (rating < 1700) return { division: 'PLATINUM', tier: 3, name: 'Platinum III' };
    if (rating < 1800) return { division: 'PLATINUM', tier: 2, name: 'Platinum II' };
    if (rating < 1900) return { division: 'PLATINUM', tier: 1, name: 'Platinum I' };
    if (rating < 2000) return { division: 'DIAMOND', tier: 3, name: 'Diamond III' };
    if (rating < 2100) return { division: 'DIAMOND', tier: 2, name: 'Diamond II' };
    if (rating < 2200) return { division: 'DIAMOND', tier: 1, name: 'Diamond I' };
    return { division: 'MASTER', tier: 1, name: 'Master' };
  }

  /**
   * Generate unique match ID
   */
  generateMatchId() {
    return `match_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get queue status
   * @param {string} gameId - Game ID
   */
  getQueueStatus(gameId) {
    const queue = this.queue.get(gameId) || [];

    return {
      playersInQueue: queue.length,
      averageWaitTime: this.estimateWaitTime(gameId),
      averageRating: queue.length > 0
        ? Math.round(queue.reduce((sum, p) => sum + p.rating, 0) / queue.length)
        : 0,
      oldestWaitTime: queue.length > 0
        ? Math.floor((Date.now() - queue[0].queuedAt) / 1000)
        : 0
    };
  }

  /**
   * Get active matches count
   */
  getActiveMatchesCount() {
    return this.activeMatches.size;
  }

  /**
   * End match and update ratings
   * @param {string} matchId - Match ID
   * @param {object} results - Match results
   */
  endMatch(matchId, results) {
    const match = this.activeMatches.get(matchId);
    if (!match) return null;

    const updates = [];

    // Update ratings for each player
    if (match.players && match.players.length === 2) {
      const [player1, player2] = match.players;

      const score1 = results.winner === player1.address ? 1 : 0;
      const score2 = results.winner === player2.address ? 1 : 0;

      const change1 = this.calculateELOChange(player1.rating, player2.rating, score1);
      const change2 = this.calculateELOChange(player2.rating, player1.rating, score2);

      const result1 = results.winner === player1.address ? 'WIN' : 'LOSS';
      const result2 = results.winner === player2.address ? 'WIN' : 'LOSS';

      updates.push(this.updatePlayerStats(player1.address, result1, change1, results.duration));
      updates.push(this.updatePlayerStats(player2.address, result2, change2, results.duration));
    }

    this.activeMatches.delete(matchId);

    return {
      matchId,
      duration: results.duration,
      updates
    };
  }
}

module.exports = MatchmakingSystem;
