const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please slow down and try again later'
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // 100 for dev, 5 for production
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts, please try again later'
  },
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Account temporarily locked. Try again in 15 minutes.'
    });
  }
});

/**
 * Transaction rate limiter
 */
const transactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 transactions per minute
  message: {
    error: 'Transaction rate limit exceeded'
  },
  handler: (req, res) => {
    logger.warn(`Transaction rate limit exceeded for user: ${req.user?._id}`);
    res.status(429).json({
      error: 'Too many transactions',
      message: 'Please wait before sending more transactions'
    });
  }
});

/**
 * Mining rate limiter (prevent spam mining)
 */
const miningLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 1, // 1 mining request per 10 seconds
  message: {
    error: 'Mining rate limit exceeded'
  },
  handler: (req, res) => {
    logger.warn(`Mining rate limit exceeded for user: ${req.user?._id}`);
    res.status(429).json({
      error: 'Mining too frequently',
      message: 'Please wait before mining another block'
    });
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  transactionLimiter,
  miningLimiter
};
