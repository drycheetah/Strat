const Game = require('../models/Game');
const GameSession = require('../models/GameSession');
const GameAsset = require('../models/GameAsset');
const Tournament = require('../models/Tournament');
const Leaderboard = require('../models/Leaderboard');
const Achievement = require('../models/Achievement');
const ProvablyFairRNG = require('../utils/provablyFairRNG');
const MatchmakingSystem = require('../utils/matchmaking');
const AntiCheatSystem = require('../utils/antiCheat');
const GameStateManager = require('../utils/gameState');
const ReplaySystem = require('../utils/replaySystem');
const crypto = require('crypto');

// Initialize systems
const matchmaking = new MatchmakingSystem();
const antiCheat = new AntiCheatSystem();
const gameState = new GameStateManager();
const replaySystem = new ReplaySystem();

// ============= GAME REGISTRATION =============

exports.registerGame = async (req, res) => {
  try {
    const {
      name,
      type,
      description,
      minPlayers,
      maxPlayers,
      entryFee,
      playToEarn,
      nftIntegration,
      metadata,
      settings
    } = req.body;

    const gameId = `game_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const game = new Game({
      gameId,
      name,
      type,
      description,
      developer: req.user?.address || req.body.developer,
      minPlayers,
      maxPlayers,
      entryFee: entryFee || 0,
      playToEarn: playToEarn || { enabled: true },
      nftIntegration: nftIntegration || { enabled: true },
      metadata: metadata || {},
      settings: settings || {}
    });

    await game.save();

    res.json({
      success: true,
      gameId: game.gameId,
      game
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getGame = async (req, res) => {
  try {
    const game = await Game.findOne({ gameId: req.params.gameId });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listGames = async (req, res) => {
  try {
    const { type, status, developer, limit = 50, offset = 0 } = req.query;
    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (developer) query.developer = developer;

    const games = await Game.find(query)
      .sort({ 'metadata.totalPlays': -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Game.countDocuments(query);

    res.json({
      games,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============= GAME SESSIONS =============

exports.createSession = async (req, res) => {
  try {
    const { gameId, players, prizePool, tournament } = req.body;

    const game = await Game.findOne({ gameId });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const sessionId = `session_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // Initialize RNG session
    const rngSession = ProvablyFairRNG.createSession();

    const session = new GameSession({
      sessionId,
      gameId,
      players: players.map(p => ({
        address: p.address,
        username: p.username,
        joinedAt: Date.now()
      })),
      prizePool: prizePool || 0,
      tournament,
      rng: {
        seed: rngSession.serverSeedHash,
        algorithm: 'PROVABLY_FAIR',
        verificationHash: rngSession.serverSeedHash
      }
    });

    await session.save();

    // Initialize game state
    gameState.initializeState(sessionId, {
      gameId,
      players: players.map(p => p.address),
      startTime: Date.now()
    });

    // Initialize anti-cheat
    antiCheat.initSession(sessionId, players.map(p => p.address));

    // Start replay recording
    replaySystem.startRecording(sessionId, {
      gameId,
      players,
      startTime: Date.now()
    });

    // Update game stats
    game.metadata.totalPlays++;
    await game.save();

    res.json({
      success: true,
      sessionId,
      session,
      rngSeed: rngSession.serverSeedHash
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSession = async (req, res) => {
  try {
    const session = await GameSession.findOne({ sessionId: req.params.sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;

    const session = await GameSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update game state
    gameState.updateState(sessionId, updates.gameState || {}, req.user?.address);

    // Record replay event
    if (updates.event) {
      replaySystem.recordEvent(sessionId, updates.event.type, updates.event.data);
    }

    // Update session
    Object.assign(session, updates);
    session.updatedAt = Date.now();
    await session.save();

    res.json({
      success: true,
      session
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { winner, finalStats, duration } = req.body;

    const session = await GameSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.status = 'COMPLETED';
    session.endedAt = Date.now();
    session.duration = duration || (session.endedAt - session.createdAt);
    session.winner = winner;

    // Calculate rewards for play-to-earn
    const game = await Game.findOne({ gameId: session.gameId });
    const rewards = [];

    if (game.playToEarn.enabled) {
      for (const player of session.players) {
        let reward = game.playToEarn.rewardPerGame || 0;

        if (player.address === winner.address) {
          reward += game.playToEarn.rewardPerWin || 0;
        }

        reward += (player.kills || 0) * (game.playToEarn.rewardPerKill || 0);
        reward += (player.level - 1) * (game.playToEarn.rewardPerLevel || 0);

        player.rewards = reward;
        rewards.push({ address: player.address, amount: reward });

        // TODO: Actually transfer tokens on blockchain
      }
    }

    await session.save();

    // Stop replay recording
    const replayInfo = await replaySystem.stopRecording(sessionId, finalStats);

    // Generate anti-cheat report
    const antiCheatReport = antiCheat.generateReport(sessionId);

    res.json({
      success: true,
      session,
      rewards,
      replayId: replayInfo?.replayId,
      antiCheatReport
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============= GAME ASSETS =============

exports.createAsset = async (req, res) => {
  try {
    const {
      gameId,
      owner,
      name,
      type,
      rarity,
      attributes,
      metadata,
      acquiredFrom
    } = req.body;

    const assetId = `asset_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const asset = new GameAsset({
      assetId,
      gameId,
      owner,
      name,
      type,
      rarity: rarity || 'COMMON',
      attributes: attributes || {},
      metadata: metadata || {},
      acquiredFrom: acquiredFrom || 'PURCHASE'
    });

    await asset.save();

    res.json({
      success: true,
      assetId,
      asset
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAsset = async (req, res) => {
  try {
    const asset = await GameAsset.findOne({ assetId: req.params.assetId });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPlayerAssets = async (req, res) => {
  try {
    const { address } = req.params;
    const { gameId, type, rarity, equipped } = req.query;

    const query = { owner: address };
    if (gameId) query.gameId = gameId;
    if (type) query.type = type;
    if (rarity) query.rarity = rarity;
    if (equipped !== undefined) query.equipped = equipped === 'true';

    const assets = await GameAsset.find(query).sort({ acquiredAt: -1 });

    res.json({ assets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.transferAsset = async (req, res) => {
  try {
    const { assetId } = req.params;
    const { from, to } = req.body;

    const asset = await GameAsset.findOne({ assetId });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.owner !== from) {
      return res.status(403).json({ error: 'Not asset owner' });
    }

    if (!asset.tradable) {
      return res.status(400).json({ error: 'Asset not tradable' });
    }

    asset.owner = to;
    await asset.save();

    res.json({
      success: true,
      asset
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============= MATCHMAKING =============

exports.joinQueue = async (req, res) => {
  try {
    const { gameId, address, preferences } = req.body;

    const player = {
      address,
      username: req.body.username,
      preferences
    };

    const result = matchmaking.joinQueue(gameId, player);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.leaveQueue = async (req, res) => {
  try {
    const { gameId, address } = req.body;

    const success = matchmaking.leaveQueue(gameId, address);

    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getQueueStatus = async (req, res) => {
  try {
    const { gameId } = req.params;

    const status = matchmaking.getQueueStatus(gameId);

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============= LEADERBOARDS =============

exports.getLeaderboard = async (req, res) => {
  try {
    const { leaderboardId } = req.params;
    const { limit = 100 } = req.query;

    const leaderboard = await Leaderboard.findOne({ leaderboardId });
    if (!leaderboard) {
      return res.status(404).json({ error: 'Leaderboard not found' });
    }

    const entries = leaderboard.entries
      .sort((a, b) => b.value - a.value)
      .slice(0, parseInt(limit));

    res.json({
      leaderboardId,
      name: leaderboard.name,
      type: leaderboard.type,
      entries
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateLeaderboard = async (req, res) => {
  try {
    const { leaderboardId } = req.params;
    const { address, value } = req.body;

    const leaderboard = await Leaderboard.findOne({ leaderboardId });
    if (!leaderboard) {
      return res.status(404).json({ error: 'Leaderboard not found' });
    }

    let entry = leaderboard.entries.find(e => e.address === address);

    if (entry) {
      entry.previousRank = entry.rank;
      entry.value = value;
      entry.updatedAt = Date.now();
    } else {
      entry = {
        address,
        value,
        rank: leaderboard.entries.length + 1,
        gamesPlayed: 1,
        updatedAt: Date.now()
      };
      leaderboard.entries.push(entry);
    }

    // Recalculate ranks
    leaderboard.entries.sort((a, b) => b.value - a.value);
    leaderboard.entries.forEach((e, index) => {
      e.rank = index + 1;
    });

    leaderboard.lastUpdate = Date.now();
    await leaderboard.save();

    res.json({
      success: true,
      rank: entry.rank,
      entry
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============= RNG =============

exports.generateRandom = async (req, res) => {
  try {
    const { min, max, sessionId } = req.body;

    const session = await GameSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const result = ProvablyFairRNG.generateNumber(
      session.rng.seed,
      req.body.clientSeed || ProvablyFairRNG.generateClientSeed(),
      session.rng.nonce || 0,
      min,
      max
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============= ANTI-CHEAT =============

exports.verifyIntegrity = async (req, res) => {
  try {
    const { sessionId, address, checksum } = req.body;

    const result = antiCheat.verifyClientIntegrity(
      sessionId,
      address,
      checksum,
      req.body.expectedChecksum
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.reportAction = async (req, res) => {
  try {
    const { sessionId, address, action, data } = req.body;

    antiCheat.detectImpossibleAction(sessionId, address, action, data.minCooldown || 1000);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============= REPLAY =============

exports.getReplay = async (req, res) => {
  try {
    const { replayId } = req.params;

    const replay = await replaySystem.getReplay(replayId);
    if (!replay) {
      return res.status(404).json({ error: 'Replay not found' });
    }

    res.json(replay);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listReplays = async (req, res) => {
  try {
    const replays = replaySystem.listReplays();

    res.json({ replays });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;
