const express = require('express');
const router = express.Router();
const metaverseController = require('../controllers/metaverseController');

// ============= VIRTUAL LAND =============
router.post('/land/mint', metaverseController.mintLand);
router.get('/land/:landId', metaverseController.getLand);
router.patch('/land/:landId', metaverseController.updateLand);
router.get('/land', metaverseController.listLand);
router.post('/land/:landId/visit', metaverseController.visitLand);

// ============= AVATARS =============
router.post('/avatars', metaverseController.createAvatar);
router.get('/avatars/:avatarId', metaverseController.getAvatar);
router.patch('/avatars/:avatarId', metaverseController.updateAvatar);
router.get('/avatars', metaverseController.listAvatars);

// ============= EVENTS =============
router.post('/events', metaverseController.createEvent);
router.get('/events/:eventId', metaverseController.getEvent);
router.post('/events/:eventId/register', metaverseController.registerForEvent);
router.get('/events', metaverseController.listEvents);

// ============= VIRTUAL ASSETS =============
router.post('/assets', metaverseController.createVirtualAsset);
router.get('/assets/:assetId', metaverseController.getVirtualAsset);
router.get('/assets', metaverseController.listVirtualAssets);
router.post('/assets/:assetId/purchase', metaverseController.purchaseVirtualAsset);

// ============= STATISTICS =============
router.get('/stats', metaverseController.getMetaverseStats);

module.exports = router;
