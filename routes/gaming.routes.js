const express = require('express');
const router = express.Router();
const gamingController = require('../controllers/gamingController');

// ============= GAMES =============
router.post('/games', gamingController.registerGame);
router.get('/games/:gameId', gamingController.getGame);
router.get('/games', gamingController.listGames);

// ============= GAME SESSIONS =============
router.post('/sessions', gamingController.createSession);
router.get('/sessions/:sessionId', gamingController.getSession);
router.patch('/sessions/:sessionId', gamingController.updateSession);
router.post('/sessions/:sessionId/end', gamingController.endSession);

// ============= GAME ASSETS =============
router.post('/assets', gamingController.createAsset);
router.get('/assets/:assetId', gamingController.getAsset);
router.get('/players/:address/assets', gamingController.getPlayerAssets);
router.post('/assets/:assetId/transfer', gamingController.transferAsset);

// ============= MATCHMAKING =============
router.post('/matchmaking/queue', gamingController.joinQueue);
router.delete('/matchmaking/queue', gamingController.leaveQueue);
router.get('/matchmaking/queue/:gameId', gamingController.getQueueStatus);

// ============= LEADERBOARDS =============
router.get('/leaderboards/:leaderboardId', gamingController.getLeaderboard);
router.post('/leaderboards/:leaderboardId/update', gamingController.updateLeaderboard);

// ============= RNG =============
router.post('/rng/number', gamingController.generateRandom);

// ============= ANTI-CHEAT =============
router.post('/anticheat/verify', gamingController.verifyIntegrity);
router.post('/anticheat/action', gamingController.reportAction);

// ============= REPLAY =============
router.get('/replay/:replayId', gamingController.getReplay);
router.get('/replays', gamingController.listReplays);

module.exports = router;
