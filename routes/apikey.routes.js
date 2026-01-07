/**
 * API Key Management Routes
 */

const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create new API key
router.post('/', apiKeyController.createApiKey);

// Get all API keys for user
router.get('/', apiKeyController.getApiKeys);

// Get specific API key
router.get('/:keyId', apiKeyController.getApiKey);

// Update API key
router.put('/:keyId', apiKeyController.updateApiKey);

// Rotate API key
router.post('/:keyId/rotate', apiKeyController.rotateApiKey);

// Revoke API key
router.delete('/:keyId', apiKeyController.revokeApiKey);

// Get API key statistics
router.get('/:keyId/stats', apiKeyController.getApiKeyStats);

module.exports = router;
