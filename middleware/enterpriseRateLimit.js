/**
 * Enterprise API Rate Limiting Middleware
 * Advanced rate limiting with tiers, quotas, and analytics
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const logger = require('../utils/logger');

// Rate limit tiers
const RATE_LIMIT_TIERS = {
  free: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Free tier rate limit exceeded. Upgrade to increase limits.'
  },
  basic: {
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Basic tier rate limit exceeded.'
  },
  professional: {
    windowMs: 15 * 60 * 1000,
    max: 10000,
    message: 'Professional tier rate limit exceeded.'
  },
  enterprise: {
    windowMs: 15 * 60 * 1000,
    max: 100000,
    message: 'Enterprise tier rate limit exceeded.'
  },
  unlimited: {
    windowMs: 15 * 60 * 1000,
    max: 0, // No limit
    message: ''
  }
};

// Endpoint-specific rate limits
const ENDPOINT_LIMITS = {
  '/api/transactions': {
    windowMs: 60 * 1000, // 1 minute
    max: 10 // 10 transactions per minute
  },
  '/api/contracts/deploy': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100 // 100 contract deployments per hour
  },
  '/api/mining/submit': {
    windowMs: 60 * 1000,
    max: 60 // 60 block submissions per minute
  }
};

/**
 * Get rate limit tier from API key
 */
async function getRateLimitTier(apiKey) {
  // In production, this would query a database
  // For now, return based on key prefix
  if (!apiKey) return 'free';

  if (apiKey.startsWith('ent_')) return 'enterprise';
  if (apiKey.startsWith('pro_')) return 'professional';
  if (apiKey.startsWith('bas_')) return 'basic';
  if (apiKey.startsWith('unl_')) return 'unlimited';

  return 'free';
}

/**
 * Create rate limiter for specific tier
 */
function createRateLimiter(tier = 'free', options = {}) {
  const tierConfig = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.free;

  return rateLimit({
    windowMs: tierConfig.windowMs,
    max: tierConfig.max || 0,
    message: {
      error: tierConfig.message,
      tier: tier,
      limit: tierConfig.max,
      windowMs: tierConfig.windowMs,
      retryAfter: Math.ceil(tierConfig.windowMs / 1000)
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for unlimited tier
      return tier === 'unlimited' || tierConfig.max === 0;
    },
    keyGenerator: (req) => {
      // Use API key or IP address as key
      return req.headers['x-api-key'] || req.ip;
    },
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded: ${req.ip} - ${req.path}`);

      res.status(429).json({
        error: 'Rate limit exceeded',
        message: tierConfig.message,
        tier: tier,
        limit: tierConfig.max,
        windowMs: tierConfig.windowMs,
        retryAfter: Math.ceil(tierConfig.windowMs / 1000),
        timestamp: Date.now()
      });
    },
    onLimitReached: (req, res, options) => {
      logger.warn(`Rate limit reached: ${req.ip} - ${req.path}`);
    },
    ...options
  });
}

/**
 * Dynamic rate limiter middleware
 */
async function dynamicRateLimiter(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    const tier = await getRateLimitTier(apiKey);

    // Store tier info on request
    req.rateLimitTier = tier;

    // Check if endpoint has specific limits
    const endpointLimit = ENDPOINT_LIMITS[req.path];
    if (endpointLimit) {
      const limiter = createRateLimiter(tier, endpointLimit);
      return limiter(req, res, next);
    }

    // Use tier-based limits
    const limiter = createRateLimiter(tier);
    limiter(req, res, next);
  } catch (error) {
    logger.error(`Rate limiter error: ${error.message}`);
    next(error);
  }
}

/**
 * Cost-based rate limiting
 * Different operations have different "costs"
 */
class CostBasedRateLimiter {
  constructor() {
    this.costs = new Map();
    this.budgets = new Map();
  }

  // Set cost for an endpoint
  setCost(endpoint, cost) {
    this.costs.set(endpoint, cost);
  }

  // Set budget for a tier
  setBudget(tier, budget) {
    this.budgets.set(tier, budget);
  }

  // Middleware
  middleware() {
    return async (req, res, next) => {
      try {
        const apiKey = req.headers['x-api-key'];
        const tier = await getRateLimitTier(apiKey);
        const budget = this.budgets.get(tier) || 1000;
        const cost = this.costs.get(req.path) || 1;

        // Track usage (in production, use Redis)
        const key = apiKey || req.ip;
        const currentUsage = this.getCurrentUsage(key);

        if (currentUsage + cost > budget) {
          return res.status(429).json({
            error: 'Cost budget exceeded',
            currentUsage,
            cost,
            budget,
            remaining: Math.max(0, budget - currentUsage)
          });
        }

        // Add cost to usage
        this.addUsage(key, cost);

        // Add headers
        res.set('X-RateLimit-Cost', String(cost));
        res.set('X-RateLimit-Budget', String(budget));
        res.set('X-RateLimit-Remaining', String(Math.max(0, budget - currentUsage - cost)));

        next();
      } catch (error) {
        logger.error(`Cost-based rate limiter error: ${error.message}`);
        next(error);
      }
    };
  }

  getCurrentUsage(key) {
    // In production, fetch from Redis
    return 0;
  }

  addUsage(key, cost) {
    // In production, increment in Redis
  }
}

/**
 * IP-based rate limiting
 */
const ipRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per IP
  message: {
    error: 'Too many requests from this IP',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`IP rate limit exceeded: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP',
      ip: req.ip,
      retryAfter: 900
    });
  }
});

/**
 * Concurrent request limiter
 */
class ConcurrentRequestLimiter {
  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
    this.active = new Map();
  }

  middleware() {
    return (req, res, next) => {
      const key = req.headers['x-api-key'] || req.ip;
      const current = this.active.get(key) || 0;

      if (current >= this.maxConcurrent) {
        return res.status(429).json({
          error: 'Too many concurrent requests',
          maxConcurrent: this.maxConcurrent,
          current
        });
      }

      // Increment counter
      this.active.set(key, current + 1);

      // Decrement on response
      res.on('finish', () => {
        const count = this.active.get(key) || 0;
        if (count > 0) {
          this.active.set(key, count - 1);
        }
      });

      next();
    };
  }
}

/**
 * Burst protection
 */
const burstProtection = rateLimit({
  windowMs: 1000, // 1 second
  max: 20, // 20 requests per second
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  message: {
    error: 'Request burst detected',
    message: 'Too many requests in a short time'
  }
});

module.exports = {
  createRateLimiter,
  dynamicRateLimiter,
  CostBasedRateLimiter,
  ipRateLimiter,
  ConcurrentRequestLimiter,
  burstProtection,
  RATE_LIMIT_TIERS,
  getRateLimitTier
};
