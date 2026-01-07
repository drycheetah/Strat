const mongoose = require('mongoose');

const gameAssetSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  gameId: {
    type: String,
    required: true,
    index: true
  },
  nftId: {
    type: String,
    index: true
  },
  owner: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['WEAPON', 'ARMOR', 'SKIN', 'CHARACTER', 'VEHICLE', 'POWERUP', 'CONSUMABLE', 'COLLECTIBLE', 'LAND', 'BUILDING', 'PET', 'CUSTOM']
  },
  rarity: {
    type: String,
    enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'],
    default: 'COMMON'
  },
  level: {
    type: Number,
    default: 1
  },
  experience: {
    type: Number,
    default: 0
  },
  attributes: {
    strength: Number,
    defense: Number,
    speed: Number,
    intelligence: Number,
    luck: Number,
    durability: Number,
    maxDurability: Number,
    custom: mongoose.Schema.Types.Mixed
  },
  bonuses: [{
    type: String,
    value: Number,
    percentage: Boolean
  }],
  requirements: {
    minLevel: Number,
    minScore: Number,
    achievements: [String]
  },
  tradable: {
    type: Boolean,
    default: true
  },
  marketValue: {
    type: Number,
    default: 0
  },
  metadata: {
    description: String,
    image: String,
    animation: String,
    model3D: String,
    sound: String
  },
  equipped: {
    type: Boolean,
    default: false
  },
  quantity: {
    type: Number,
    default: 1
  },
  acquiredFrom: {
    type: String,
    enum: ['PURCHASE', 'REWARD', 'CRAFT', 'TRADE', 'AIRDROP', 'ACHIEVEMENT', 'LOOT'],
    required: true
  },
  acquiredAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: Date,
  usageCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'LOCKED', 'BURNED', 'STAKED'],
    default: 'ACTIVE'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

gameAssetSchema.index({ gameId: 1, owner: 1, type: 1 });
gameAssetSchema.index({ rarity: 1, type: 1 });
gameAssetSchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model('GameAsset', gameAssetSchema);
