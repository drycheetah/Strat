const mongoose = require('mongoose');

const virtualAssetSchema = new mongoose.Schema({
  assetId: {
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
  name: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    required: true,
    enum: [
      'BUILDING',
      'FURNITURE',
      'DECORATION',
      'VEHICLE',
      'CLOTHING',
      'ACCESSORY',
      'WEAPON',
      'TOOL',
      'PET',
      'PLANT',
      'ARTWORK',
      'COLLECTIBLE',
      'CUSTOM'
    ]
  },
  category: {
    type: String,
    required: true
  },
  subCategory: String,
  creator: {
    address: {
      type: String,
      required: true,
      index: true
    },
    name: String,
    verified: {
      type: Boolean,
      default: false
    }
  },
  owner: {
    type: String,
    required: true,
    index: true
  },
  model: {
    format: {
      type: String,
      enum: ['GLB', 'GLTF', 'FBX', 'OBJ', 'USDZ', 'VRM'],
      required: true
    },
    file: {
      type: String,
      required: true
    },
    fileSize: Number,
    polyCount: Number,
    textures: [{
      name: String,
      file: String,
      type: String,
      size: Number
    }],
    animations: [{
      name: String,
      file: String,
      duration: Number
    }],
    lod: [{
      level: Number,
      file: String,
      polyCount: Number
    }]
  },
  dimensions: {
    width: Number,
    height: Number,
    depth: Number,
    scale: {
      type: Number,
      default: 1
    }
  },
  rarity: {
    type: String,
    enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'UNIQUE'],
    default: 'COMMON'
  },
  attributes: {
    interactive: {
      type: Boolean,
      default: false
    },
    animated: {
      type: Boolean,
      default: false
    },
    physics: {
      type: Boolean,
      default: false
    },
    scripted: {
      type: Boolean,
      default: false
    },
    sound: {
      enabled: {
        type: Boolean,
        default: false
      },
      files: [String]
    },
    particles: {
      enabled: {
        type: Boolean,
        default: false
      },
      effects: [String]
    },
    custom: mongoose.Schema.Types.Mixed
  },
  compatibility: {
    worlds: [String],
    engines: [String],
    platforms: [String],
    minSpec: String
  },
  marketplace: {
    forSale: {
      type: Boolean,
      default: false,
      index: true
    },
    price: {
      type: Number,
      default: 0
    },
    originalPrice: Number,
    discount: Number,
    currency: {
      type: String,
      default: 'STRAT'
    },
    royalty: {
      enabled: {
        type: Boolean,
        default: true
      },
      percentage: {
        type: Number,
        default: 5
      },
      recipient: String
    }
  },
  licensing: {
    type: {
      type: String,
      enum: ['PERSONAL', 'COMMERCIAL', 'EXCLUSIVE', 'OPEN'],
      default: 'PERSONAL'
    },
    resellable: {
      type: Boolean,
      default: true
    },
    modifiable: {
      type: Boolean,
      default: false
    },
    redistributable: {
      type: Boolean,
      default: false
    }
  },
  usage: {
    totalInstances: {
      type: Number,
      default: 0
    },
    activeInstances: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    favorites: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    }
  },
  reviews: {
    averageRating: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    ratings: {
      five: { type: Number, default: 0 },
      four: { type: Number, default: 0 },
      three: { type: Number, default: 0 },
      two: { type: Number, default: 0 },
      one: { type: Number, default: 0 }
    }
  },
  media: {
    thumbnail: {
      type: String,
      required: true
    },
    preview: String,
    images: [String],
    video: String,
    demo: String
  },
  tags: [String],
  collection: {
    collectionId: String,
    name: String,
    series: Number
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  changelog: [{
    version: String,
    changes: String,
    date: Date
  }],
  moderation: {
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'],
      default: 'PENDING'
    },
    reviewer: String,
    reviewedAt: Date,
    notes: String
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'DEPRECATED', 'BANNED'],
    default: 'ACTIVE',
    index: true
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  featuredUntil: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

virtualAssetSchema.index({ type: 1, category: 1, status: 1 });
virtualAssetSchema.index({ creator: 1, createdAt: -1 });
virtualAssetSchema.index({ 'marketplace.forSale': 1, 'marketplace.price': 1 });
virtualAssetSchema.index({ rarity: 1, featured: 1 });

module.exports = mongoose.model('VirtualAsset', virtualAssetSchema);
