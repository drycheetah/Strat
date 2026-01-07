const express = require('express');
const router = express.Router();
const stakingController = require('../controllers/stakingController');

// Get staking info (lock periods, APYs)
router.get('/info', stakingController.getStakingInfo);

// Get global staking statistics
router.get('/stats', stakingController.getGlobalStats);

// Get top stakers leaderboard
router.get('/leaderboard', stakingController.getTopStakers);

// Create a new stake
router.post('/stake', stakingController.createStake);

// Get stakes for an address
router.get('/address/:address', stakingController.getAddressStakes);

// Unlock a stake
router.post('/unlock/:stakeId', stakingController.unlockStake);

// Withdraw an unlocked stake
router.post('/withdraw/:stakeId', stakingController.withdrawStake);

// Claim rewards without withdrawing
router.post('/claim/:stakeId', stakingController.claimRewards);

module.exports = router;
