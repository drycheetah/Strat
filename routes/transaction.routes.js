const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { validate, schemas } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

// All transaction routes require authentication
router.use(authenticate);

router.post('/send', validate(schemas.sendTransaction), transactionController.sendTransaction);
router.post('/batch', validate(schemas.sendTransaction), transactionController.batchSend);
router.post('/estimate-fee', transactionController.estimateFee);
router.get('/mempool', transactionController.getMempoolStatus);
router.get('/pending', transactionController.getMempoolStatus); // Alias
router.get('/:hash', transactionController.getTransactionDetails);

module.exports = router;
