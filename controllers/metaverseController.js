const VirtualLand = require('../models/VirtualLand');
const Avatar = require('../models/Avatar');
const MetaverseEvent = require('../models/MetaverseEvent');
const VirtualAsset = require('../models/VirtualAsset');
const NFT = require('../models/NFT');
const crypto = require('crypto');

// ============= VIRTUAL LAND =============

exports.mintLand = async (req, res) => {
  try {
    const {
      name,
      description,
      world,
      coordinates,
      size,
      type,
      terrain,
      owner
    } = req.body;

    // Check if coordinates are already taken
    const existing = await VirtualLand.findOne({
      'location.world': world,
      'location.coordinates.x': coordinates.x,
      'location.coordinates.y': coordinates.y
    });

    if (existing) {
      return res.status(400).json({ error: 'Land already claimed at these coordinates' });
    }

    const landId = `land_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const nftId = `nft_land_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // Create NFT for the land
    const nft = new NFT({
      nftId,
      name: `Virtual Land - ${name}`,
      description: description || `Land parcel in ${world}`,
      owner,
      creator: owner,
      type: 'LAND',
      metadata: {
        world,
        coordinates,
        size,
        landId
      },
      rarity: req.body.rarity || 'COMMON',
      price: req.body.price || 0
    });

    await nft.save();

    // Create virtual land
    const land = new VirtualLand({
      landId,
      nftId: nft.nftId,
      owner,
      name,
      description,
      location: {
        world,
        coordinates,
        region: req.body.region,
        district: req.body.district
      },
      size: {
        ...size,
        totalArea: size.width * size.height
      },
      type: type || 'RESIDENTIAL',
      terrain: terrain || 'FLAT',
      price: {
        purchasePrice: req.body.price || 0,
        currentValue: req.body.price || 0
      }
    });

    await land.save();

    res.json({
      success: true,
      landId,
      nftId: nft.nftId,
      land,
      nft
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLand = async (req, res) => {
  try {
    const land = await VirtualLand.findOne({ landId: req.params.landId });
    if (!land) {
      return res.status(404).json({ error: 'Land not found' });
    }

    res.json(land);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateLand = async (req, res) => {
  try {
    const { landId } = req.params;
    const updates = req.body;

    const land = await VirtualLand.findOne({ landId });
    if (!land) {
      return res.status(404).json({ error: 'Land not found' });
    }

    // Verify ownership
    if (land.owner !== req.user?.address && land.owner !== req.body.owner) {
      return res.status(403).json({ error: 'Not land owner' });
    }

    // Update allowed fields
    if (updates.name) land.name = updates.name;
    if (updates.description) land.description = updates.description;
    if (updates.buildings) land.buildings = updates.buildings;
    if (updates.assets) land.assets = updates.assets;
    if (updates.permissions) land.permissions = updates.permissions;
    if (updates.forSale !== undefined) land.forSale = updates.forSale;
    if (updates.salePrice) land.salePrice = updates.salePrice;

    land.updatedAt = Date.now();
    await land.save();

    res.json({
      success: true,
      land
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listLand = async (req, res) => {
  try {
    const { world, type, forSale, owner, limit = 50, offset = 0 } = req.query;
    const query = {};

    if (world) query['location.world'] = world;
    if (type) query.type = type;
    if (forSale !== undefined) query.forSale = forSale === 'true';
    if (owner) query.owner = owner;

    const lands = await VirtualLand.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await VirtualLand.countDocuments(query);

    res.json({
      lands,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.visitLand = async (req, res) => {
  try {
    const { landId } = req.params;
    const { visitor } = req.body;

    const land = await VirtualLand.findOne({ landId });
    if (!land) {
      return res.status(404).json({ error: 'Land not found' });
    }

    // Check permissions
    if (!land.permissions.public && !land.permissions.allowVisitors) {
      if (!land.permissions.whitelist.includes(visitor)) {
        return res.status(403).json({ error: 'Land is private' });
      }
    }

    // Update statistics
    land.statistics.totalVisits++;
    land.statistics.uniqueVisitors = (land.statistics.uniqueVisitors || 0) + 1;
    await land.save();

    res.json({
      success: true,
      land: {
        landId: land.landId,
        name: land.name,
        location: land.location,
        buildings: land.buildings,
        assets: land.assets,
        permissions: land.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============= AVATARS =============

exports.createAvatar = async (req, res) => {
  try {
    const {
      owner,
      name,
      type,
      appearance,
      rarity,
      asNFT
    } = req.body;

    const avatarId = `avatar_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    let nftId = null;

    // Optionally create as NFT
    if (asNFT) {
      nftId = `nft_avatar_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      const nft = new NFT({
        nftId,
        name: `Avatar - ${name}`,
        description: `Custom ${type} avatar`,
        owner,
        creator: owner,
        type: 'AVATAR',
        metadata: {
          avatarId,
          type,
          rarity
        },
        rarity: rarity || 'COMMON'
      });

      await nft.save();
    }

    const avatar = new Avatar({
      avatarId,
      nftId,
      owner,
      name,
      type: type || 'HUMANOID',
      rarity: rarity || 'COMMON',
      appearance: appearance || {}
    });

    await avatar.save();

    res.json({
      success: true,
      avatarId,
      nftId,
      avatar
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAvatar = async (req, res) => {
  try {
    const avatar = await Avatar.findOne({ avatarId: req.params.avatarId });
    if (!avatar) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    res.json(avatar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    const { avatarId } = req.params;
    const updates = req.body;

    const avatar = await Avatar.findOne({ avatarId });
    if (!avatar) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    // Verify ownership
    if (avatar.owner !== req.user?.address && avatar.owner !== req.body.owner) {
      return res.status(403).json({ error: 'Not avatar owner' });
    }

    // Update allowed fields
    if (updates.name) avatar.name = updates.name;
    if (updates.appearance) avatar.appearance = { ...avatar.appearance, ...updates.appearance };
    if (updates.equipped) avatar.equipped = { ...avatar.equipped, ...updates.equipped };
    if (updates.currentLocation) avatar.currentLocation = updates.currentLocation;

    avatar.updatedAt = Date.now();
    avatar.lastUsed = Date.now();
    await avatar.save();

    res.json({
      success: true,
      avatar
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listAvatars = async (req, res) => {
  try {
    const { owner, type, rarity, forSale, limit = 50, offset = 0 } = req.query;
    const query = {};

    if (owner) query.owner = owner;
    if (type) query.type = type;
    if (rarity) query.rarity = rarity;
    if (forSale !== undefined) query.forSale = forSale === 'true';

    const avatars = await Avatar.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Avatar.countDocuments(query);

    res.json({
      avatars,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============= METAVERSE EVENTS =============

exports.createEvent = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      location,
      schedule,
      capacity,
      ticketing,
      organizer
    } = req.body;

    const eventId = `event_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const event = new MetaverseEvent({
      eventId,
      name,
      description,
      type,
      organizer: {
        address: organizer || req.user?.address,
        name: req.body.organizerName
      },
      location,
      schedule,
      capacity: capacity || { maxAttendees: 1000 },
      ticketing: ticketing || { free: true }
    });

    await event.save();

    res.json({
      success: true,
      eventId,
      event
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const event = await MetaverseEvent.findOne({ eventId: req.params.eventId });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { address, username, avatarId, ticketTier } = req.body;

    const event = await MetaverseEvent.findOne({ eventId });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check capacity
    if (event.capacity.currentAttendees >= event.capacity.maxAttendees) {
      return res.status(400).json({ error: 'Event is full' });
    }

    // Check if already registered
    if (event.attendees.find(a => a.address === address)) {
      return res.status(400).json({ error: 'Already registered' });
    }

    // Add attendee
    event.attendees.push({
      address,
      username,
      avatarId,
      ticketTier: ticketTier || 'GENERAL',
      registeredAt: Date.now()
    });

    event.capacity.currentAttendees++;
    await event.save();

    res.json({
      success: true,
      eventId,
      ticketNumber: event.attendees.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listEvents = async (req, res) => {
  try {
    const { type, status, world, upcoming, limit = 50, offset = 0 } = req.query;
    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (world) query['location.world'] = world;
    if (upcoming === 'true') {
      query['schedule.startTime'] = { $gt: new Date() };
    }

    const events = await MetaverseEvent.find(query)
      .sort({ 'schedule.startTime': 1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await MetaverseEvent.countDocuments(query);

    res.json({
      events,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============= VIRTUAL ASSETS =============

exports.createVirtualAsset = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      category,
      creator,
      model,
      dimensions,
      rarity
    } = req.body;

    const assetId = `vasset_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const asset = new VirtualAsset({
      assetId,
      name,
      description,
      type,
      category,
      creator: {
        address: creator || req.user?.address,
        name: req.body.creatorName
      },
      owner: creator || req.user?.address,
      model,
      dimensions,
      rarity: rarity || 'COMMON'
    });

    await asset.save();

    res.json({
      success: true,
      assetId,
      asset
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVirtualAsset = async (req, res) => {
  try {
    const asset = await VirtualAsset.findOne({ assetId: req.params.assetId });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Update view count
    asset.usage.totalViews++;
    await asset.save();

    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listVirtualAssets = async (req, res) => {
  try {
    const { type, category, creator, forSale, rarity, featured, limit = 50, offset = 0 } = req.query;
    const query = {};

    if (type) query.type = type;
    if (category) query.category = category;
    if (creator) query['creator.address'] = creator;
    if (forSale !== undefined) query['marketplace.forSale'] = forSale === 'true';
    if (rarity) query.rarity = rarity;
    if (featured !== undefined) query.featured = featured === 'true';

    const assets = await VirtualAsset.find(query)
      .sort({ featured: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await VirtualAsset.countDocuments(query);

    res.json({
      assets,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.purchaseVirtualAsset = async (req, res) => {
  try {
    const { assetId } = req.params;
    const { buyer } = req.body;

    const asset = await VirtualAsset.findOne({ assetId });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (!asset.marketplace.forSale) {
      return res.status(400).json({ error: 'Asset not for sale' });
    }

    const price = asset.marketplace.price;
    const royalty = asset.marketplace.royalty.enabled
      ? (price * asset.marketplace.royalty.percentage / 100)
      : 0;

    // TODO: Process blockchain transaction

    // Update ownership
    const previousOwner = asset.owner;
    asset.owner = buyer;
    asset.marketplace.forSale = false;
    asset.usage.downloads++;
    await asset.save();

    res.json({
      success: true,
      asset,
      transaction: {
        price,
        royalty,
        seller: previousOwner,
        buyer
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============= STATISTICS =============

exports.getMetaverseStats = async (req, res) => {
  try {
    const totalLands = await VirtualLand.countDocuments();
    const totalAvatars = await Avatar.countDocuments();
    const totalEvents = await MetaverseEvent.countDocuments();
    const totalAssets = await VirtualAsset.countDocuments();

    const activeEvents = await MetaverseEvent.countDocuments({ status: 'LIVE' });
    const upcomingEvents = await MetaverseEvent.countDocuments({
      status: 'UPCOMING',
      'schedule.startTime': { $gt: new Date() }
    });

    const landsForSale = await VirtualLand.countDocuments({ forSale: true });
    const avatarsForSale = await Avatar.countDocuments({ forSale: true });
    const assetsForSale = await VirtualAsset.countDocuments({ 'marketplace.forSale': true });

    res.json({
      totals: {
        lands: totalLands,
        avatars: totalAvatars,
        events: totalEvents,
        assets: totalAssets
      },
      events: {
        active: activeEvents,
        upcoming: upcomingEvents
      },
      marketplace: {
        landsForSale,
        avatarsForSale,
        assetsForSale
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;
