const Joi = require('joi');

/**
 * Validation middleware factory
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
};

/**
 * Validation schemas
 */
const schemas = {
  // User registration
  register: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'string.min': 'Password must be at least 8 characters long'
      })
  }),

  // User login
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Create wallet
  createWallet: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    password: Joi.string().min(8).required(),
    type: Joi.string().valid('standard', 'hd', 'multisig').default('hd')
  }),

  // Restore wallet
  restoreWallet: Joi.object({
    mnemonic: Joi.string().required(),
    name: Joi.string().min(1).max(50).required(),
    password: Joi.string().min(8).required()
  }),

  // Send transaction
  sendTransaction: Joi.object({
    fromWalletId: Joi.string().required(),
    toAddress: Joi.string().required(),
    amount: Joi.number().positive().required(),
    password: Joi.string().required(),
    fee: Joi.number().positive().optional()
  }),

  // Deploy contract
  deployContract: Joi.object({
    walletId: Joi.string().required(),
    code: Joi.string().required(),
    password: Joi.string().required(),
    gasLimit: Joi.number().positive().default(100000),
    gasPrice: Joi.number().positive().default(1)
  }),

  // Call contract
  callContract: Joi.object({
    walletId: Joi.string().required(),
    contractAddress: Joi.string().required(),
    methodName: Joi.string().required(),
    params: Joi.object().default({}),
    password: Joi.string().required(),
    gasLimit: Joi.number().positive().default(100000),
    gasPrice: Joi.number().positive().default(1)
  }),

  // Connect to peer
  connectPeer: Joi.object({
    peerUrl: Joi.string().uri({
      scheme: ['ws', 'wss']
    }).required()
  }),

  // Create post
  createPost: Joi.object({
    content: Joi.string().min(1).max(5000).required(),
    type: Joi.string().valid('transaction', 'achievement', 'general', 'milestone').default('general'),
    visibility: Joi.string().valid('public', 'friends', 'private').default('public'),
    metadata: Joi.object().optional(),
    relatedTransaction: Joi.string().optional(),
    relatedAchievement: Joi.string().optional()
  }),

  // Comment on post
  commentOnPost: Joi.object({
    content: Joi.string().min(1).max(1000).required()
  }),

  // Update profile
  updateProfile: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    email: Joi.string().email().optional()
  }),

  // Track referral
  trackReferral: Joi.object({
    code: Joi.string().required()
  })
};

module.exports = { validate, schemas };
