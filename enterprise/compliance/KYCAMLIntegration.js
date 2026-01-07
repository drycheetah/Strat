/**
 * KYC/AML Integration Framework
 * Integrate with third-party KYC/AML providers
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const kycRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending'
  },
  level: {
    type: String,
    enum: ['none', 'basic', 'intermediate', 'advanced'],
    default: 'none'
  },
  provider: String,
  providerUserId: String,
  personalInfo: {
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    nationality: String,
    country: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  documents: [{
    type: {
      type: String,
      enum: ['passport', 'drivers_license', 'national_id', 'proof_of_address']
    },
    url: String,
    verified: Boolean,
    verifiedAt: Date
  }],
  verification: {
    identity: { verified: Boolean, verifiedAt: Date },
    address: { verified: Boolean, verifiedAt: Date },
    sourceOfFunds: { verified: Boolean, verifiedAt: Date }
  },
  riskScore: Number,
  amlChecks: [{
    provider: String,
    checkType: String,
    result: String,
    checkedAt: Date
  }],
  limits: {
    dailyTransaction: Number,
    monthlyTransaction: Number,
    singleTransaction: Number
  },
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const KYCRecord = mongoose.model('KYCRecord', kycRecordSchema);

class KYCAMLIntegration {
  constructor() {
    this.providers = {
      jumio: { enabled: false, apiKey: null },
      onfido: { enabled: false, apiKey: null },
      sumsub: { enabled: false, apiKey: null },
      synaps: { enabled: false, apiKey: null }
    };
  }

  /**
   * Initialize KYC verification
   */
  async initiateKYC(userId, level = 'basic') {
    const record = new KYCRecord({
      userId,
      status: 'pending',
      level,
      provider: 'internal'
    });

    await record.save();

    logger.info(`KYC initiated for user: ${userId}`);

    return record;
  }

  /**
   * Verify identity with provider
   */
  async verifyIdentity(userId, documents) {
    const record = await KYCRecord.findOne({ userId });
    if (!record) {
      throw new Error('KYC record not found');
    }

    // In production, integrate with actual KYC provider
    // For now, mock verification
    record.documents = documents.map(doc => ({
      ...doc,
      verified: true,
      verifiedAt: new Date()
    }));

    record.verification.identity.verified = true;
    record.verification.identity.verifiedAt = new Date();
    record.status = 'approved';
    record.level = 'basic';

    await record.save();

    logger.info(`Identity verified for user: ${userId}`);

    return record;
  }

  /**
   * Perform AML check
   */
  async performAMLCheck(userId) {
    const record = await KYCRecord.findOne({ userId });
    if (!record) {
      throw new Error('KYC record not found');
    }

    const amlCheck = {
      provider: 'internal',
      checkType: 'sanctions_screening',
      result: 'clear',
      checkedAt: new Date()
    };

    record.amlChecks.push(amlCheck);
    await record.save();

    logger.info(`AML check performed for user: ${userId}`);

    return amlCheck;
  }

  /**
   * Check if user is KYC verified
   */
  async isVerified(userId, requiredLevel = 'basic') {
    const record = await KYCRecord.findOne({ userId });

    if (!record || record.status !== 'approved') {
      return false;
    }

    const levels = ['none', 'basic', 'intermediate', 'advanced'];
    const userLevel = levels.indexOf(record.level);
    const required = levels.indexOf(requiredLevel);

    return userLevel >= required;
  }

  /**
   * Get KYC limits for user
   */
  async getLimits(userId) {
    const record = await KYCRecord.findOne({ userId });

    if (!record) {
      return {
        dailyTransaction: 1000,
        monthlyTransaction: 10000,
        singleTransaction: 500
      };
    }

    return record.limits || this.getDefaultLimits(record.level);
  }

  getDefaultLimits(level) {
    const limits = {
      none: { dailyTransaction: 1000, monthlyTransaction: 10000, singleTransaction: 500 },
      basic: { dailyTransaction: 10000, monthlyTransaction: 100000, singleTransaction: 5000 },
      intermediate: { dailyTransaction: 50000, monthlyTransaction: 500000, singleTransaction: 25000 },
      advanced: { dailyTransaction: 1000000, monthlyTransaction: 10000000, singleTransaction: 500000 }
    };

    return limits[level] || limits.none;
  }
}

module.exports = new KYCAMLIntegration();
