const mongoose = require('mongoose');

const virtualLandSchema = new mongoose.Schema({
  landId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  nftId: {
    type: String,
    required: true,
    unique: true,
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
  description: String,
  location: {
    world: {
      type: String,
      required: true,
      index: true
    },
    coordinates: {
      x: {
        type: Number,
        required: true
      },
      y: {
        type: Number,
        required: true
      },
      z: {
        type: Number,
        default: 0
      }
    },
    region: String,
    district: String
  },
  size: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
    depth: {
      type: Number,
      default: 100
    },
    totalArea: Number
  },
  type: {
    type: String,
    enum: ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'ENTERTAINMENT', 'PARK', 'PLAZA', 'EVENT_SPACE', 'CUSTOM'],
    default: 'RESIDENTIAL'
  },
  rarity: {
    type: String,
    enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
    default: 'COMMON'
  },
  terrain: {
    type: String,
    enum: ['FLAT', 'HILLS', 'MOUNTAINS', 'WATER', 'BEACH', 'FOREST', 'DESERT', 'URBAN'],
    default: 'FLAT'
  },
  buildings: [{
    buildingId: String,
    name: String,
    type: String,
    position: {
      x: Number,
      y: Number,
      z: Number
    },
    rotation: {
      x: Number,
      y: Number,
      z: Number
    },
    scale: {
      x: Number,
      y: Number,
      z: Number
    },
    model3D: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  assets: [{
    assetId: String,
    type: String,
    position: {
      x: Number,
      y: Number,
      z: Number
    },
    rotation: {
      x: Number,
      y: Number,
      z: Number
    }
  }],
  permissions: {
    public: {
      type: Boolean,
      default: true
    },
    allowVisitors: {
      type: Boolean,
      default: true
    },
    allowBuilding: {
      type: Boolean,
      default: false
    },
    allowEvents: {
      type: Boolean,
      default: false
    },
    whitelist: [String],
    blacklist: [String]
  },
  price: {
    purchasePrice: {
      type: Number,
      default: 0
    },
    currentValue: {
      type: Number,
      default: 0
    },
    rentalPrice: {
      type: Number,
      default: 0
    },
    rentalPeriod: {
      type: String,
      enum: ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'],
      default: 'DAILY'
    }
  },
  rental: {
    isRented: {
      type: Boolean,
      default: false
    },
    tenant: String,
    startDate: Date,
    endDate: Date,
    autoRenew: {
      type: Boolean,
      default: false
    }
  },
  forSale: {
    type: Boolean,
    default: false,
    index: true
  },
  salePrice: Number,
  statistics: {
    totalVisits: {
      type: Number,
      default: 0
    },
    uniqueVisitors: {
      type: Number,
      default: 0
    },
    averageVisitDuration: {
      type: Number,
      default: 0
    },
    eventsHosted: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    thumbnail: String,
    images: [String],
    video: String,
    virtualTour: String,
    tags: [String]
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'UNDER_CONSTRUCTION', 'PRIVATE', 'SUSPENDED'],
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
  }
});

virtualLandSchema.index({ 'location.world': 1, 'location.coordinates.x': 1, 'location.coordinates.y': 1 });
virtualLandSchema.index({ owner: 1, status: 1 });
virtualLandSchema.index({ forSale: 1, salePrice: 1 });

module.exports = mongoose.model('VirtualLand', virtualLandSchema);
