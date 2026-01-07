const express = require('express');
const router = express.Router();
const governanceController = require('../controllers/governanceController');

// Proposal routes
router.post('/proposals', governanceController.createProposal);
router.get('/proposals', governanceController.getProposals);
router.get('/proposals/:proposalId', governanceController.getProposalDetails);
router.post('/proposals/:proposalId/execute', governanceController.executeProposal);

// Voting routes
router.post('/proposals/:proposalId/vote', governanceController.vote);
router.get('/voting-history/:address', governanceController.getVotingHistory);
router.get('/voting-power/:address', governanceController.getVotingPower);

// Delegation routes
router.post('/delegate', governanceController.delegateVotingPower);
router.post('/delegations/:delegationId/revoke', governanceController.revokeDelegation);

// Statistics
router.get('/stats', governanceController.getGovernanceStats);

module.exports = router;
