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

/**
 * Contract deployment rate limiter (expensive operation)
 */
const contractDeployLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 contract deployments per hour
  message: {
    error: 'Contract deployment rate limit exceeded'
  },
  handler: (req, res) => {
    logger.warn(`Contract deployment rate limit exceeded for user: ${req.user?._id}`);
    res.status(429).json({
      error: 'Too many contract deployments',
      message: 'Please wait before deploying more contracts'
    });
  }
});

/**
 * Explorer rate limiter (more lenient)
 */
const explorerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    error: 'Explorer rate limit exceeded'
  }
});

/**
 * DDoS detection middleware
 * Monitors for suspicious patterns
 */
const ddosDetection = () => {
  const requestCounts = new Map();
  const suspiciousIPs = new Set();

  // Clean up old entries every 5 minutes
  setInterval(() => {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    for (let [ip, data] of requestCounts) {
      if (data.timestamp < fiveMinutesAgo) {
        requestCounts.delete(ip);
        suspiciousIPs.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Skip DDoS protection entirely in development mode
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    // Also skip for localhost IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      return next();
    }

    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, {
        count: 1,
        timestamp: now,
        endpoints: new Set([req.path])
      });
      return next();
    }

    const data = requestCounts.get(ip);

    // Reset counter if more than 1 minute has passed
    if (now - data.timestamp > 60000) {
      data.count = 1;
      data.timestamp = now;
      data.endpoints.clear();
    } else {
      data.count++;
      data.endpoints.add(req.path);
    }

    // Detect DDoS patterns (only in production)
    // 1. Too many requests per second (>200 req/min, increased from 100)
    if (data.count > 200) {
      suspiciousIPs.add(ip);
      logger.error(`DDoS detected from IP ${ip}: ${data.count} requests/min`);
      return res.status(429).json({
        error: 'Suspicious activity detected',
        message: 'Your IP has been temporarily blocked due to suspicious activity.'
      });
    }

    // 2. Scanning multiple endpoints rapidly (>50 unique endpoints/min, increased from 30)
    if (data.endpoints.size > 50) {
      suspiciousIPs.add(ip);
      logger.error(`Endpoint scanning detected from IP ${ip}: ${data.endpoints.size} unique endpoints`);
      return res.status(429).json({
        error: 'Suspicious activity detected',
        message: 'Endpoint scanning detected. Your IP has been temporarily blocked.'
      });
    }

    // If IP was previously marked as suspicious, enforce strict limits
    if (suspiciousIPs.has(ip) && data.count > 20) {
      logger.warn(`Blocked suspicious IP ${ip}: ${data.count} requests`);
      return res.status(429).json({
        error: 'IP blocked',
        message: 'Your IP is temporarily blocked. Please try again later.'
      });
    }

    next();
  };
};

/**
 * Request size limiter to prevent payload attacks
 */
const requestSizeLimiter = (maxSize = 1000000) => {
  return (req, res, next) => {
    const contentLength = req.headers['content-length'];

    if (contentLength && parseInt(contentLength) > maxSize) {
      logger.warn(`Large payload rejected from IP ${req.ip}: ${contentLength} bytes`);
      return res.status(413).json({
        error: 'Payload too large',
        message: `Request body must be less than ${(maxSize / 1000000).toFixed(1)}MB`,
        maxSize
      });
    }

    next();
  };
};

module.exports = {
  apiLimiter,
  authLimiter,
  transactionLimiter,
  miningLimiter,
  contractDeployLimiter,
  explorerLimiter,
  ddosDetection,
  requestSizeLimiter
};
