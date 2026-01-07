const mongoose = require('mongoose');

const metaverseEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['CONCERT', 'CONFERENCE', 'EXHIBITION', 'PARTY', 'GAMING', 'AUCTION', 'MEETUP', 'LAUNCH', 'CUSTOM'],
    required: true
  },
  organizer: {
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
  location: {
    world: {
      type: String,
      required: true
    },
    landId: {
      type: String,
      required: true,
      index: true
    },
    coordinates: {
      x: Number,
      y: Number,
      z: Number
    },
    spawnPoints: [{
      x: Number,
      y: Number,
      z: Number
    }]
  },
  schedule: {
    startTime: {
      type: Date,
      required: true,
      index: true
    },
    endTime: {
      type: Date,
      required: true
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    duration: Number
  },
  capacity: {
    maxAttendees: {
      type: Number,
      default: 1000
    },
    currentAttendees: {
      type: Number,
      default: 0
    },
    vipSlots: {
      type: Number,
      default: 0
    },
    reservedSlots: {
      type: Number,
      default: 0
    }
  },
  ticketing: {
    required: {
      type: Boolean,
      default: false
    },
    free: {
      type: Boolean,
      default: true
    },
    tiers: [{
      name: String,
      price: Number,
      supply: Number,
      sold: {
        type: Number,
        default: 0
      },
      benefits: [String],
      nftTicket: {
        type: Boolean,
        default: false
      }
    }]
  },
  attendees: [{
    address: String,
    username: String,
    avatarId: String,
    ticketTier: String,
    checkedIn: {
      type: Boolean,
      default: false
    },
    checkinTime: Date,
    checkoutTime: Date,
    duration: Number,
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  performers: [{
    name: String,
    address: String,
    avatarId: String,
    role: String,
    bio: String,
    image: String
  }],
  sponsors: [{
    name: String,
    address: String,
    tier: {
      type: String,
      enum: ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE']
    },
    contribution: Number,
    logo: String,
    benefits: [String]
  }],
  media: {
    banner: String,
    poster: String,
    thumbnail: String,
    trailer: String,
    gallery: [String],
    liveStream: {
      enabled: {
        type: Boolean,
        default: false
      },
      url: String,
      platforms: [{
        name: String,
        url: String
      }]
    }
  },
  features: {
    voiceChat: {
      type: Boolean,
      default: true
    },
    spatialAudio: {
      type: Boolean,
      default: true
    },
    recording: {
      type: Boolean,
      default: false
    },
    photography: {
      type: Boolean,
      default: true
    },
    nftDrops: {
      enabled: {
        type: Boolean,
        default: false
      },
      items: [{
        nftId: String,
        name: String,
        quantity: Number,
        dropTime: Date,
        claimable: {
          type: Boolean,
          default: true
        }
      }]
    },
    games: [{
      gameId: String,
      name: String,
      active: {
        type: Boolean,
        default: false
      }
    }]
  },
  rewards: {
    attendanceReward: {
      enabled: {
        type: Boolean,
        default: false
      },
      amount: Number,
      token: String
    },
    achievements: [{
      achievementId: String,
      name: String,
      criteria: String
    }],
    poaps: [{
      poapId: String,
      name: String,
      image: String,
      issued: {
        type: Number,
        default: 0
      }
    }]
  },
  revenue: {
    totalTicketSales: {
      type: Number,
      default: 0
    },
    totalSponsorship: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    expenses: {
      type: Number,
      default: 0
    },
    profit: {
      type: Number,
      default: 0
    }
  },
  statistics: {
    totalAttendees: {
      type: Number,
      default: 0
    },
    peakConcurrent: {
      type: Number,
      default: 0
    },
    averageDuration: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    socialMentions: {
      type: Number,
      default: 0
    },
    rating: {
      average: {
        type: Number,
        default: 0
      },
      count: {
        type: Number,
        default: 0
      }
    }
  },
  status: {
    type: String,
    enum: ['UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED', 'POSTPONED'],
    default: 'UPCOMING',
    index: true
  },
  tags: [String],
  ageRating: {
    type: String,
    enum: ['ALL', 'TEEN', 'MATURE', 'ADULT'],
    default: 'ALL'
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

metaverseEventSchema.index({ 'location.world': 1, 'schedule.startTime': 1 });
metaverseEventSchema.index({ type: 1, status: 1, 'schedule.startTime': 1 });
metaverseEventSchema.index({ 'organizer.address': 1, createdAt: -1 });

module.exports = mongoose.model('MetaverseEvent', metaverseEventSchema);
