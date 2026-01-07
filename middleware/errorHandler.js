// Error handling middleware for STRAT blockchain

const logger = require('../utils/logger');
const { ERROR_CODES } = require('../utils/constants');

/**
 * Custom error classes
 */
class BlockchainError extends Error {
  constructor(message, code = ERROR_CODES.CHAIN_SYNC_FAILED, statusCode = 500) {
    super(message);
    this.name = 'BlockchainError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

class ValidationError extends Error {
  constructor(message, field = null, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = ERROR_CODES.INVALID_TRANSACTION;
    this.statusCode = statusCode;
  }
}

class InsufficientFundsError extends Error {
  constructor(message = 'Insufficient funds', statusCode = 400) {
    super(message);
    this.name = 'InsufficientFundsError';
    this.code = ERROR_CODES.INSUFFICIENT_FUNDS;
    this.statusCode = statusCode;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized', statusCode = 401) {
    super(message);
    this.name = 'UnauthorizedError';
    this.code = ERROR_CODES.UNAUTHORIZED;
    this.statusCode = statusCode;
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden', statusCode = 403) {
    super(message);
    this.name = 'ForbiddenError';
    this.code = ERROR_CODES.FORBIDDEN;
    this.statusCode = statusCode;
  }
}

class NotFoundError extends Error {
  constructor(resource = 'Resource', statusCode = 404) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.code = 404;
    this.statusCode = statusCode;
  }
}

class RateLimitError extends Error {
  constructor(message = 'Rate limit exceeded', statusCode = 429) {
    super(message);
    this.name = 'RateLimitError';
    this.code = ERROR_CODES.RATE_LIMIT_EXCEEDED;
    this.statusCode = statusCode;
  }
}

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error(`${err.name}: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user?.address || 'anonymous'
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Determine error code
  const errorCode = err.code || ERROR_CODES.CHAIN_SYNC_FAILED;

  // Build error response
  const errorResponse = {
    success: false,
    error: {
      message: err.message,
      code: errorCode,
      name: err.name
    }
  };

  // Add field for validation errors
  if (err.field) {
    errorResponse.error.field = err.field;
  }

  // Add details for development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err.details || null;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.url} not found`,
      code: 404,
      name: 'NotFoundError'
    }
  });
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error formatter
 */
const formatValidationErrors = (errors) => {
  return errors.map(err => ({
    field: err.field || err.param,
    message: err.message || err.msg,
    value: err.value
  }));
};

/**
 * Error response helper
 */
const sendError = (res, statusCode, message, code = null) => {
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: code || statusCode,
      timestamp: Date.now()
    }
  });
};

/**
 * Success response helper
 */
const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = {
    success: true,
    data,
    timestamp: Date.now()
  };

  if (message) {
    response.message = message;
  }

  res.status(statusCode).json(response);
};

/**
 * Pagination response helper
 */
const sendPaginatedResponse = (res, data, pagination) => {
  res.status(200).json({
    success: true,
    data,
    pagination,
    timestamp: Date.now()
  });
};

module.exports = {
  // Error classes
  BlockchainError,
  ValidationError,
  InsufficientFundsError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,

  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,

  // Helpers
  formatValidationErrors,
  sendError,
  sendSuccess,
  sendPaginatedResponse
};
