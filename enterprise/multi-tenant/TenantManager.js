/**
 * Multi-Tenant Architecture Manager
 * Enables multiple organizations to use isolated blockchain instances
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// Tenant Schema
const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  domain: {
    type: String,
    unique: true,
    sparse: true
  },
  subdomain: {
    type: String,
    unique: true
  },
  configuration: {
    blockchain: {
      networkId: String,
      consensusType: {
        type: String,
        enum: ['pow', 'pos', 'poa'],
        default: 'pow'
      },
      blockTime: {
        type: Number,
        default: 60000
      },
      difficulty: {
        type: Number,
        default: 4
      },
      blockReward: {
        type: Number,
        default: 50
      }
    },
    features: {
      mining: { type: Boolean, default: true },
      staking: { type: Boolean, default: true },
      smartContracts: { type: Boolean, default: true },
      nfts: { type: Boolean, default: true },
      governance: { type: Boolean, default: false },
      defi: { type: Boolean, default: false }
    },
    limits: {
      maxUsers: { type: Number, default: 1000 },
      maxTransactionsPerBlock: { type: Number, default: 1000 },
      maxContractSize: { type: Number, default: 50000 },
      storageQuota: { type: Number, default: 10737418240 } // 10GB
    },
    security: {
      requireKYC: { type: Boolean, default: false },
      allowedCountries: [String],
      blockedCountries: [String],
      twoFactorAuth: { type: Boolean, default: false }
    }
  },
  database: {
    connectionString: String,
    name: String,
    isolated: { type: Boolean, default: true }
  },
  storage: {
    provider: {
      type: String,
      enum: ['local', 's3', 'azure', 'gcp'],
      default: 'local'
    },
    bucket: String,
    region: String,
    usedSpace: { type: Number, default: 0 }
  },
  billing: {
    plan: {
      type: String,
      enum: ['trial', 'starter', 'business', 'enterprise'],
      default: 'trial'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly'
    },
    nextBillingDate: Date,
    customerId: String,
    subscriptionId: String
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'trial', 'cancelled'],
    default: 'trial'
  },
  metrics: {
    totalBlocks: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    totalUsers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Tenant = mongoose.model('Tenant', tenantSchema);

class TenantManager {
  constructor() {
    this.tenants = new Map();
    this.blockchains = new Map();
  }

  /**
   * Create new tenant
   */
  async createTenant(data) {
    try {
      const tenantId = this.generateTenantId();
      const subdomain = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]/g, '');

      const tenant = new Tenant({
        tenantId,
        name: data.name,
        slug: subdomain,
        subdomain,
        organizationId: data.organizationId,
        domain: data.domain,
        configuration: {
          blockchain: data.blockchain || {},
          features: data.features || {},
          limits: data.limits || {},
          security: data.security || {}
        },
        database: {
          name: `strat_tenant_${tenantId}`,
          isolated: data.isolatedDatabase !== false
        },
        billing: data.billing || {}
      });

      await tenant.save();

      // Initialize tenant blockchain
      await this.initializeTenantBlockchain(tenant);

      // Cache tenant
      this.tenants.set(tenantId, tenant);

      logger.info(`Tenant created: ${tenantId} - ${tenant.name}`);

      return tenant;
    } catch (error) {
      logger.error(`Error creating tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Initialize blockchain for tenant
   */
  async initializeTenantBlockchain(tenant) {
    try {
      const Blockchain = require('../../src/blockchain');

      // Create isolated blockchain instance
      const blockchain = new Blockchain({
        networkId: tenant.configuration.blockchain.networkId || tenant.tenantId,
        difficulty: tenant.configuration.blockchain.difficulty,
        blockReward: tenant.configuration.blockchain.blockReward
      });

      // Store blockchain instance
      this.blockchains.set(tenant.tenantId, blockchain);

      logger.info(`Blockchain initialized for tenant: ${tenant.tenantId}`);

      return blockchain;
    } catch (error) {
      logger.error(`Error initializing tenant blockchain: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId) {
    // Check cache first
    if (this.tenants.has(tenantId)) {
      return this.tenants.get(tenantId);
    }

    // Load from database
    const tenant = await Tenant.findOne({ tenantId });
    if (tenant) {
      this.tenants.set(tenantId, tenant);
    }

    return tenant;
  }

  /**
   * Get tenant by domain or subdomain
   */
  async getTenantByDomain(domain) {
    const tenant = await Tenant.findOne({
      $or: [
        { domain },
        { subdomain: domain.split('.')[0] }
      ]
    });

    if (tenant) {
      this.tenants.set(tenant.tenantId, tenant);
    }

    return tenant;
  }

  /**
   * Get tenant blockchain
   */
  getBlockchain(tenantId) {
    return this.blockchains.get(tenantId);
  }

  /**
   * Update tenant configuration
   */
  async updateTenant(tenantId, updates) {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Update fields
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          if (key === 'configuration') {
            tenant.configuration = {
              ...tenant.configuration,
              ...updates.configuration
            };
          } else {
            tenant[key] = updates[key];
          }
        }
      });

      await tenant.save();

      // Update cache
      this.tenants.set(tenantId, tenant);

      logger.info(`Tenant updated: ${tenantId}`);

      return tenant;
    } catch (error) {
      logger.error(`Error updating tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(tenantId, reason) {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      tenant.status = 'suspended';
      await tenant.save();

      logger.warn(`Tenant suspended: ${tenantId} - Reason: ${reason}`);

      return tenant;
    } catch (error) {
      logger.error(`Error suspending tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Activate tenant
   */
  async activateTenant(tenantId) {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      tenant.status = 'active';
      await tenant.save();

      logger.info(`Tenant activated: ${tenantId}`);

      return tenant;
    } catch (error) {
      logger.error(`Error activating tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete tenant
   */
  async deleteTenant(tenantId) {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Remove blockchain
      this.blockchains.delete(tenantId);

      // Remove from cache
      this.tenants.delete(tenantId);

      // Delete from database
      await Tenant.deleteOne({ tenantId });

      logger.info(`Tenant deleted: ${tenantId}`);

      return true;
    } catch (error) {
      logger.error(`Error deleting tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all tenants
   */
  async getAllTenants(filter = {}) {
    return await Tenant.find(filter).sort({ createdAt: -1 });
  }

  /**
   * Update tenant metrics
   */
  async updateMetrics(tenantId) {
    try {
      const tenant = await this.getTenant(tenantId);
      const blockchain = this.getBlockchain(tenantId);

      if (tenant && blockchain) {
        tenant.metrics.totalBlocks = blockchain.chain.length;
        tenant.metrics.totalTransactions = blockchain.chain.reduce(
          (sum, block) => sum + block.transactions.length,
          0
        );

        await tenant.save();
      }
    } catch (error) {
      logger.error(`Error updating tenant metrics: ${error.message}`);
    }
  }

  /**
   * Generate unique tenant ID
   */
  generateTenantId() {
    const crypto = require('crypto');
    return `tenant_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Middleware to identify tenant from request
   */
  tenantMiddleware() {
    return async (req, res, next) => {
      try {
        let tenant = null;

        // Try to get tenant from header
        const tenantId = req.headers['x-tenant-id'];
        if (tenantId) {
          tenant = await this.getTenant(tenantId);
        }

        // Try to get tenant from subdomain
        if (!tenant) {
          const host = req.hostname;
          tenant = await this.getTenantByDomain(host);
        }

        // Try to get tenant from query param
        if (!tenant && req.query.tenant) {
          tenant = await this.getTenant(req.query.tenant);
        }

        if (!tenant) {
          return res.status(400).json({
            error: 'Tenant not found',
            message: 'Please provide a valid tenant ID'
          });
        }

        if (tenant.status !== 'active') {
          return res.status(403).json({
            error: 'Tenant not active',
            message: `Tenant status: ${tenant.status}`
          });
        }

        // Attach tenant and blockchain to request
        req.tenant = tenant;
        req.blockchain = this.getBlockchain(tenant.tenantId);

        next();
      } catch (error) {
        logger.error(`Tenant middleware error: ${error.message}`);
        res.status(500).json({
          error: 'Tenant identification failed'
        });
      }
    };
  }
}

module.exports = new TenantManager();
