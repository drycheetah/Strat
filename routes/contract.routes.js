const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { validate, schemas } = require('../middleware/validation');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/', contractController.listContracts);
router.get('/:address', contractController.getContract);
router.get('/:address/state', contractController.getContractState);

// Protected routes
router.post('/deploy', authenticate, validate(schemas.deployContract), contractController.deployContract);
router.post('/call', authenticate, validate(schemas.callContract), contractController.callContract);

module.exports = router;
