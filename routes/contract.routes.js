const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { validate, schemas } = require('../middleware/validation');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/search', contractController.searchContracts);
router.get('/popular', contractController.getPopularContracts);
router.get('/list', contractController.listContracts);
router.get('/address/:address', contractController.getContract);
router.get('/address/:address/state', contractController.getContractState);
router.post('/estimate-gas', contractController.estimateContractGas);
router.get('/gas/price', contractController.getGasPrice);

// Protected routes - User's contracts
router.get('/user/contracts', authenticate, contractController.getUserContracts);
router.get('/user/details/:contractId', authenticate, contractController.getContractDetails);

// Protected routes - Contract management
router.post('/deploy', authenticate, validate(schemas.deployContract), contractController.deployContract);
router.post('/call', authenticate, validate(schemas.callContract), contractController.callContract);
router.post('/verify', authenticate, contractController.verifyContract);
router.patch('/:contractId/metadata', authenticate, contractController.updateContractMetadata);
router.delete('/:contractId', authenticate, contractController.deleteContract);

module.exports = router;
