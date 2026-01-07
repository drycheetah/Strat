/**
 * Consortium Blockchain Manager
 * Manage multi-organization blockchain consortiums
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const consortiumSchema = new mongoose.Schema({
  consortiumId: {
    type: String,
    required: true,
    unique: true
  },
  name: String,
  description: String,
  members: [{
    organizationId: String,
    name: String,
    role: {
      type: String,
      enum: ['founder', 'member', 'observer']
    },
    votingPower: Number,
    joinedAt: Date,
    status: {
      type: String,
      enum: ['active', 'suspended', 'removed']
    }
  }],
  governance: {
    votingThreshold: { type: Number, default: 0.66 },
    proposalDuration: { type: Number, default: 7 * 24 * 60 * 60 * 1000 },
    quorum: { type: Number, default: 0.51 }
  },
  blockchain: {
    networkId: String,
    consensus: { type: String, default: 'poa' }
  },
  createdAt: { type: Date, default: Date.now }
});

const Consortium = mongoose.model('Consortium', consortiumSchema);

class ConsortiumManager {
  async createConsortium(data) {
    const consortiumId = `consortium_${Date.now()}`;

    const consortium = new Consortium({
      consortiumId,
      name: data.name,
      description: data.description,
      members: data.members.map(m => ({
        ...m,
        status: 'active',
        joinedAt: new Date()
      })),
      governance: data.governance,
      blockchain: {
        networkId: consortiumId,
        consensus: data.consensus || 'poa'
      }
    });

    await consortium.save();

    logger.info(`Consortium created: ${consortiumId}`);

    return consortium;
  }

  async addMember(consortiumId, member) {
    const consortium = await Consortium.findOne({ consortiumId });
    if (!consortium) {
      throw new Error('Consortium not found');
    }

    consortium.members.push({
      ...member,
      joinedAt: new Date(),
      status: 'active'
    });

    await consortium.save();

    logger.info(`Member added to consortium ${consortiumId}: ${member.organizationId}`);

    return consortium;
  }
}

module.exports = new ConsortiumManager();
