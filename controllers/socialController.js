const Post = require('../models/Post');
const Achievement = require('../models/Achievement');
const Referral = require('../models/Referral');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Create a new post
 */
const createPost = async (req, res) => {
  try {
    const { content, type = 'general', visibility = 'public', metadata, relatedTransaction, relatedAchievement } = req.body;

    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Content is required',
        message: 'Post content cannot be empty'
      });
    }

    const post = new Post({
      user: req.user._id,
      content: content.trim(),
      type,
      visibility,
      metadata,
      relatedTransaction,
      relatedAchievement
    });

    await post.save();
    await post.populate('user', 'username email');

    logger.info(`Post created by user ${req.user.email}: ${post._id}`);

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    logger.error(`Create post error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to create post',
      message: error.message
    });
  }
};

/**
 * Get posts from global feed
 */
const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = { visibility: 'public' };

    if (type) {
      filter.type = type;
    }

    if (userId) {
      filter.user = userId;
    }

    const posts = await Post.getGlobalFeed(parseInt(limit), skip, filter);
    const total = await Post.countDocuments(filter);

    res.json({
      success: true,
      posts,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error(`Get posts error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch posts',
      message: error.message
    });
  }
};

/**
 * Get posts from user feed
 */
const getUserFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.getUserFeed(req.user._id, parseInt(limit), skip);
    const total = await Post.countDocuments({
      user: req.user._id,
      visibility: { $in: ['public', 'friends'] }
    });

    res.json({
      success: true,
      posts,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error(`Get user feed error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch user feed',
      message: error.message
    });
  }
};

/**
 * Get trending posts
 */
const getTrendingPosts = async (req, res) => {
  try {
    const { days = 7, limit = 10 } = req.query;

    const posts = await Post.getTrendingPosts(parseInt(days), parseInt(limit));

    res.json({
      success: true,
      posts,
      metadata: {
        trendingPeriod: `${days} days`,
        count: posts.length
      }
    });
  } catch (error) {
    logger.error(`Get trending posts error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch trending posts',
      message: error.message
    });
  }
};

/**
 * Like a post
 */
const likePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        error: 'Post not found',
        message: 'The requested post does not exist'
      });
    }

    // Check if already liked
    if (post.likes.users.includes(req.user._id)) {
      return res.status(400).json({
        error: 'Already liked',
        message: 'You have already liked this post'
      });
    }

    const likeCount = await post.addLike(req.user._id);

    logger.info(`User ${req.user.email} liked post ${postId}`);

    res.json({
      success: true,
      message: 'Post liked successfully',
      likeCount
    });
  } catch (error) {
    logger.error(`Like post error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to like post',
      message: error.message
    });
  }
};

/**
 * Unlike a post
 */
const unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        error: 'Post not found',
        message: 'The requested post does not exist'
      });
    }

    // Check if already liked
    if (!post.likes.users.includes(req.user._id)) {
      return res.status(400).json({
        error: 'Not liked',
        message: 'You have not liked this post'
      });
    }

    const likeCount = await post.removeLike(req.user._id);

    logger.info(`User ${req.user.email} unliked post ${postId}`);

    res.json({
      success: true,
      message: 'Post unliked successfully',
      likeCount
    });
  } catch (error) {
    logger.error(`Unlike post error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to unlike post',
      message: error.message
    });
  }
};

/**
 * Add comment to post
 */
const commentOnPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Comment content is required',
        message: 'Comment cannot be empty'
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        error: 'Post not found',
        message: 'The requested post does not exist'
      });
    }

    const comment = await post.addComment(req.user._id, content.trim());

    logger.info(`User ${req.user.email} commented on post ${postId}`);

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    logger.error(`Comment on post error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to add comment',
      message: error.message
    });
  }
};

/**
 * Get user profile
 */
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params || req.user._id;
    const targetUserId = userId || req.user._id;

    const user = await User.findById(targetUserId)
      .select('-password -resetPasswordToken -resetPasswordExpires -twoFactorSecret -verificationToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    // Get user achievements
    const achievements = await Achievement.find({ user: targetUserId, visibility: true });
    const totalPoints = await Achievement.getUserTotalPoints(targetUserId);

    // Get referral stats
    const referralStats = await Referral.getReferrerStats(targetUserId);

    // Get post count
    const postCount = await Post.countDocuments({ user: targetUserId, visibility: 'public' });

    const profile = {
      ...user,
      stats: {
        postCount,
        achievementCount: achievements.length,
        totalPoints,
        referrals: referralStats
      }
    };

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    logger.error(`Get user profile error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch user profile',
      message: error.message
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Your user account does not exist'
      });
    }

    // Check if username is already taken
    if (username && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) {
        return res.status(409).json({
          error: 'Username already taken',
          message: 'This username is already in use'
        });
      }
      user.username = username;
    }

    // Check if email is already taken
    if (email && email !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({
          error: 'Email already in use',
          message: 'This email is already registered'
        });
      }
      user.email = email.toLowerCase();
    }

    await user.save();

    logger.info(`User ${req.user.email} updated profile`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
};

/**
 * Get or create referral code for user
 */
const getReferralCode = async (req, res) => {
  try {
    let referral = await Referral.findOne({ referrer: req.user._id, status: 'pending' });

    if (!referral) {
      referral = await Referral.createReferralCode(req.user._id);
    }

    res.json({
      success: true,
      referral: {
        code: referral.referralCode,
        link: referral.referralLink,
        createdAt: referral.createdAt
      }
    });
  } catch (error) {
    logger.error(`Get referral code error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get referral code',
      message: error.message
    });
  }
};

/**
 * Track referral activation
 */
const trackReferral = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Referral code is required',
        message: 'A valid referral code must be provided'
      });
    }

    const referral = await Referral.findOne({ referralCode: code });
    if (!referral) {
      return res.status(404).json({
        error: 'Invalid referral code',
        message: 'The provided referral code does not exist'
      });
    }

    // Check if already activated
    if (referral.referred) {
      return res.status(400).json({
        error: 'Referral already used',
        message: 'This referral code has already been used'
      });
    }

    // Activate referral
    await referral.activate(req.user._id);

    logger.info(`Referral activated: ${code} -> User ${req.user.email}`);

    res.json({
      success: true,
      message: 'Referral activated successfully',
      referral: {
        code: referral.referralCode,
        referrer: referral.referrer,
        activatedAt: referral.activatedAt
      }
    });
  } catch (error) {
    logger.error(`Track referral error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to activate referral',
      message: error.message
    });
  }
};

/**
 * Get referral statistics for user
 */
const getReferralStats = async (req, res) => {
  try {
    const stats = await Referral.getReferrerStats(req.user._id);
    const referralCode = await Referral.findOne({ referrer: req.user._id, status: 'pending' });

    res.json({
      success: true,
      stats,
      referralCode: referralCode?.referralCode || null,
      referralLink: referralCode?.referralLink || null
    });
  } catch (error) {
    logger.error(`Get referral stats error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch referral stats',
      message: error.message
    });
  }
};

/**
 * Get achievements for user
 */
const getAchievements = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId || req.user._id;

    const achievements = await Achievement.getUserAchievements(targetUserId);
    const totalPoints = await Achievement.getUserTotalPoints(targetUserId);
    const breakdown = await Achievement.getUserAchievementBreakdown(targetUserId);

    res.json({
      success: true,
      achievements,
      summary: {
        total: achievements.length,
        totalPoints,
        rarityBreakdown: breakdown
      }
    });
  } catch (error) {
    logger.error(`Get achievements error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch achievements',
      message: error.message
    });
  }
};

/**
 * Get leaderboard
 */
const getLeaderboard = async (req, res) => {
  try {
    const { type = 'achievements', limit = 10 } = req.query;

    let leaderboard;
    let title;

    if (type === 'achievements') {
      leaderboard = await Achievement.getPointsLeaderboard(parseInt(limit));
      title = 'Achievement Points Leaderboard';
    } else if (type === 'referrals') {
      leaderboard = await Referral.getReferralLeaderboard(parseInt(limit));
      title = 'Referral Leaderboard';
    } else {
      return res.status(400).json({
        error: 'Invalid leaderboard type',
        message: 'Type must be either "achievements" or "referrals"'
      });
    }

    res.json({
      success: true,
      title,
      type,
      leaderboard,
      count: leaderboard.length
    });
  } catch (error) {
    logger.error(`Get leaderboard error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch leaderboard',
      message: error.message
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  getUserFeed,
  getTrendingPosts,
  likePost,
  unlikePost,
  commentOnPost,
  getUserProfile,
  updateProfile,
  getReferralCode,
  trackReferral,
  getReferralStats,
  getAchievements,
  getLeaderboard
};
