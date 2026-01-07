const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema({
  avatarId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  nftId: {
    type: String,
    unique: true,
    sparse: true,
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
    enum: ['HUMANOID', 'ROBOT', 'ALIEN', 'FANTASY', 'ANIMAL', 'CUSTOM'],
    default: 'HUMANOID'
  },
  rarity: {
    type: String,
    enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'UNIQUE'],
    default: 'COMMON'
  },
  appearance: {
    body: {
      model3D: String,
      skinColor: String,
      height: {
        type: Number,
        default: 1.75
      },
      build: {
        type: String,
        enum: ['SLIM', 'AVERAGE', 'ATHLETIC', 'MUSCULAR', 'LARGE'],
        default: 'AVERAGE'
      }
    },
    head: {
      model3D: String,
      faceShape: String,
      eyeColor: String,
      hairStyle: String,
      hairColor: String,
      facialHair: String
    },
    clothing: {
      hat: {
        itemId: String,
        model3D: String,
        color: String
      },
      top: {
        itemId: String,
        model3D: String,
        color: String
      },
      bottom: {
        itemId: String,
        model3D: String,
        color: String
      },
      shoes: {
        itemId: String,
        model3D: String,
        color: String
      },
      accessories: [{
        itemId: String,
        type: String,
        model3D: String,
        position: String
      }]
    }
  },
  equipped: {
    weapon: {
      itemId: String,
      name: String,
      model3D: String,
      type: String
    },
    armor: {
      itemId: String,
      name: String,
      model3D: String,
      defense: Number
    },
    gadgets: [{
      itemId: String,
      name: String,
      type: String,
      slot: Number
    }],
    pet: {
      petId: String,
      name: String,
      model3D: String,
      type: String
    },
    vehicle: {
      vehicleId: String,
      name: String,
      model3D: String,
      type: String
    }
  },
  attributes: {
    level: {
      type: Number,
      default: 1
    },
    experience: {
      type: Number,
      default: 0
    },
    strength: {
      type: Number,
      default: 10
    },
    agility: {
      type: Number,
      default: 10
    },
    intelligence: {
      type: Number,
      default: 10
    },
    charisma: {
      type: Number,
      default: 10
    },
    luck: {
      type: Number,
      default: 10
    }
  },
  animations: [{
    animationId: String,
    name: String,
    type: {
      type: String,
      enum: ['EMOTE', 'DANCE', 'GESTURE', 'ACTION', 'IDLE']
    },
    file: String,
    unlocked: {
      type: Boolean,
      default: false
    }
  }],
  currentLocation: {
    world: String,
    landId: String,
    coordinates: {
      x: Number,
      y: Number,
      z: Number
    },
    rotation: {
      x: Number,
      y: Number,
      z: Number
    }
  },
  inventory: [{
    itemId: String,
    name: String,
    type: String,
    quantity: {
      type: Number,
      default: 1
    }
  }],
  achievements: [{
    achievementId: String,
    name: String,
    unlockedAt: Date
  }],
  titles: [{
    titleId: String,
    name: String,
    active: {
      type: Boolean,
      default: false
    }
  }],
  badges: [{
    badgeId: String,
    name: String,
    icon: String,
    earnedAt: Date
  }],
  tradable: {
    type: Boolean,
    default: false
  },
  marketValue: {
    type: Number,
    default: 0
  },
  forSale: {
    type: Boolean,
    default: false,
    index: true
  },
  salePrice: Number,
  statistics: {
    totalPlayTime: {
      type: Number,
      default: 0
    },
    worldsVisited: {
      type: Number,
      default: 0
    },
    socialInteractions: {
      type: Number,
      default: 0
    },
    eventsAttended: {
      type: Number,
      default: 0
    },
    itemsCollected: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    preview: String,
    thumbnail: String,
    fullBody: String,
    showcase: [String]
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'BANNED', 'DELETED'],
    default: 'ACTIVE',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: Date
});

avatarSchema.index({ owner: 1, status: 1 });
avatarSchema.index({ rarity: 1, forSale: 1 });

module.exports = mongoose.model('Avatar', avatarSchema);
