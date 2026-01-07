const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const { validate, schemas } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

// Posts endpoints
router.post('/posts', authenticate, socialController.createPost);
router.get('/posts', socialController.getPosts); // Public feed
router.get('/posts/trending', socialController.getTrendingPosts);
router.get('/posts/feed', authenticate, socialController.getUserFeed); // User's feed
router.post('/posts/:postId/like', authenticate, socialController.likePost);
router.post('/posts/:postId/unlike', authenticate, socialController.unlikePost);
router.post('/posts/:postId/comments', authenticate, socialController.commentOnPost);

// Profile endpoints
router.get('/profile/:userId', socialController.getUserProfile); // Public profile
router.get('/profile', authenticate, socialController.getUserProfile); // Own profile
router.put('/profile', authenticate, socialController.updateProfile);

// Referral endpoints
router.get('/referrals/code', authenticate, socialController.getReferralCode);
router.post('/referrals/track', authenticate, socialController.trackReferral);
router.get('/referrals/stats', authenticate, socialController.getReferralStats);

// Achievement endpoints
router.get('/achievements/:userId', socialController.getAchievements); // Public achievements
router.get('/achievements', authenticate, socialController.getAchievements); // Own achievements

// Leaderboard endpoints
router.get('/leaderboard', socialController.getLeaderboard);

module.exports = router;
