/**
 * API Key Controller
 * Enterprise API key management and administration
 */

const ApiKey = require('../models/ApiKey');
const logger = require('../utils/logger');

/**
 * Create new API key
 */
exports.createApiKey = async (req, res) => {
  try {
    const {
      name,
      description,
      tier = 'free',
      permissions = [],
      ipWhitelist = [],
      allowedOrigins = [],
      expiresInDays,
      environment = 'development'
    } = req.body;

    // Generate API key
    const key = ApiKey.generateKey(tier);
    const hashedKey = ApiKey.hashKey(key);

    // Set expiration
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create API key
    const apiKey = new ApiKey({
      key: key.substring(0, 20) + '...', // Store masked version
      hashedKey,
      name,
      description,
      userId: req.user._id,
      organizationId: req.user.organizationId,
      tier,
      permissions,
      ipWhitelist,
      allowedOrigins,
      expiresAt,
      environment
    });

    await apiKey.save();

    logger.info(`API key created: ${apiKey._id} by user ${req.user._id}`);

    res.status(201).json({
      success: true,
      data: {
        id: apiKey._id,
        key: key, // Only returned once!
        name: apiKey.name,
        tier: apiKey.tier,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt
      },
      message: 'API key created successfully. Save this key securely - it will not be shown again!'
    });
  } catch (error) {
    logger.error(`Error creating API key: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to create API key',
      message: error.message
    });
  }
};

/**
 * Get all API keys for user
 */
exports.getApiKeys = async (req, res) => {
  try {
    const apiKeys = await ApiKey.find({
      userId: req.user._id,
      status: { $ne: 'revoked' }
    })
    .select('-hashedKey')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: apiKeys,
      total: apiKeys.length
    });
  } catch (error) {
    logger.error(`Error fetching API keys: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys'
    });
  }
};

/**
 * Get API key details
 */
exports.getApiKey = async (req, res) => {
  try {
    const { keyId } = req.params;

    const apiKey = await ApiKey.findOne({
      _id: keyId,
      userId: req.user._id
    }).select('-hashedKey');

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    // Include usage statistics
    const stats = {
      totalRequests: apiKey.usage.totalRequests,
      successRate: apiKey.usage.totalRequests > 0
        ? (apiKey.usage.successfulRequests / apiKey.usage.totalRequests * 100).toFixed(2)
        : 0,
      dailyUsage: apiKey.usage.dailyUsage,
      monthlyUsage: apiKey.usage.monthlyUsage,
      quotaStatus: apiKey.checkQuota()
    };

    res.json({
      success: true,
      data: {
        ...apiKey.toObject(),
        stats
      }
    });
  } catch (error) {
    logger.error(`Error fetching API key: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API key'
    });
  }
};

/**
 * Update API key
 */
exports.updateApiKey = async (req, res) => {
  try {
    const { keyId } = req.params;
    const {
      name,
      description,
      permissions,
      ipWhitelist,
      allowedOrigins,
      status
    } = req.body;

    const apiKey = await ApiKey.findOne({
      _id: keyId,
      userId: req.user._id
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    // Update fields
    if (name) apiKey.name = name;
    if (description) apiKey.description = description;
    if (permissions) apiKey.permissions = permissions;
    if (ipWhitelist) apiKey.ipWhitelist = ipWhitelist;
    if (allowedOrigins) apiKey.allowedOrigins = allowedOrigins;
    if (status) apiKey.status = status;

    await apiKey.save();

    logger.info(`API key updated: ${keyId}`);

    res.json({
      success: true,
      data: apiKey,
      message: 'API key updated successfully'
    });
  } catch (error) {
    logger.error(`Error updating API key: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to update API key'
    });
  }
};

/**
 * Rotate API key
 */
exports.rotateApiKey = async (req, res) => {
  try {
    const { keyId } = req.params;

    const oldKey = await ApiKey.findOne({
      _id: keyId,
      userId: req.user._id
    });

    if (!oldKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    // Generate new key
    const newKeyString = ApiKey.generateKey(oldKey.tier);
    const hashedKey = ApiKey.hashKey(newKeyString);

    // Update old key
    oldKey.hashedKey = hashedKey;
    oldKey.key = newKeyString.substring(0, 20) + '...';
    oldKey.lastRotated = new Date();

    await oldKey.save();

    logger.info(`API key rotated: ${keyId}`);

    res.json({
      success: true,
      data: {
        id: oldKey._id,
        key: newKeyString, // Only shown once
        name: oldKey.name,
        tier: oldKey.tier
      },
      message: 'API key rotated successfully. Save this key securely!'
    });
  } catch (error) {
    logger.error(`Error rotating API key: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to rotate API key'
    });
  }
};

/**
 * Revoke API key
 */
exports.revokeApiKey = async (req, res) => {
  try {
    const { keyId } = req.params;

    const apiKey = await ApiKey.findOne({
      _id: keyId,
      userId: req.user._id
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    apiKey.status = 'revoked';
    await apiKey.save();

    logger.info(`API key revoked: ${keyId}`);

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    logger.error(`Error revoking API key: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke API key'
    });
  }
};

/**
 * Get API key usage statistics
 */
exports.getApiKeyStats = async (req, res) => {
  try {
    const { keyId } = req.params;
    const { period = 'daily' } = req.query;

    const apiKey = await ApiKey.findOne({
      _id: keyId,
      userId: req.user._id
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    const stats = {
      key: {
        id: apiKey._id,
        name: apiKey.name,
        tier: apiKey.tier
      },
      usage: {
        total: apiKey.usage.totalRequests,
        successful: apiKey.usage.successfulRequests,
        failed: apiKey.usage.failedRequests,
        successRate: apiKey.usage.totalRequests > 0
          ? (apiKey.usage.successfulRequests / apiKey.usage.totalRequests * 100).toFixed(2)
          : 0,
        daily: apiKey.usage.dailyUsage,
        monthly: apiKey.usage.monthlyUsage,
        lastUsed: apiKey.usage.lastUsed
      },
      quota: apiKey.checkQuota(),
      rateLimit: apiKey.rateLimit,
      status: {
        active: apiKey.isActive(),
        expired: apiKey.isExpired(),
        needsRotation: apiKey.needsRotation()
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`Error fetching API key stats: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
};

/**
 * Validate API key (for internal use)
 */
exports.validateApiKey = async (key) => {
  try {
    const apiKey = await ApiKey.findByKey(key);

    if (!apiKey) {
      return {
        valid: false,
        error: 'Invalid API key'
      };
    }

    if (!apiKey.isActive()) {
      return {
        valid: false,
        error: 'API key is inactive or expired'
      };
    }

    const quotaCheck = apiKey.checkQuota();
    if (!quotaCheck.allowed) {
      return {
        valid: false,
        error: 'API key quota exceeded',
        quota: quotaCheck
      };
    }

    // Update usage
    apiKey.incrementUsage();
    await apiKey.save();

    return {
      valid: true,
      apiKey: {
        id: apiKey._id,
        userId: apiKey.userId,
        tier: apiKey.tier,
        permissions: apiKey.permissions,
        quota: quotaCheck
      }
    };
  } catch (error) {
    logger.error(`Error validating API key: ${error.message}`);
    return {
      valid: false,
      error: 'Validation error'
    };
  }
};

module.exports = exports;
