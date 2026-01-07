/**
 * White-Label Solution Manager
 * Enables partners to rebrand and customize the blockchain platform
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const whiteLabelSchema = new mongoose.Schema({
  partnerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  branding: {
    name: {
      type: String,
      required: true
    },
    logo: {
      url: String,
      darkUrl: String
    },
    favicon: String,
    colors: {
      primary: { type: String, default: '#4F46E5' },
      secondary: { type: String, default: '#10B981' },
      accent: { type: String, default: '#F59E0B' },
      background: { type: String, default: '#FFFFFF' },
      text: { type: String, default: '#1F2937' }
    },
    fonts: {
      primary: { type: String, default: 'Inter' },
      secondary: { type: String, default: 'Roboto' }
    }
  },
  customization: {
    welcomeMessage: String,
    footerText: String,
    termsOfServiceUrl: String,
    privacyPolicyUrl: String,
    supportEmail: String,
    supportUrl: String,
    customCSS: String,
    customJS: String
  },
  features: {
    wallet: { type: Boolean, default: true },
    mining: { type: Boolean, default: true },
    staking: { type: Boolean, default: true },
    nft: { type: Boolean, default: true },
    defi: { type: Boolean, default: true },
    governance: { type: Boolean, default: false },
    customFeatures: [String]
  },
  domain: {
    primary: String,
    aliases: [String],
    ssl: {
      enabled: { type: Boolean, default: true },
      provider: String,
      autoRenew: { type: Boolean, default: true }
    }
  },
  api: {
    baseUrl: String,
    customEndpoints: [{
      path: String,
      handler: String
    }]
  },
  blockchain: {
    networkName: String,
    tokenSymbol: { type: String, default: 'STRAT' },
    tokenName: String,
    chainId: Number
  },
  integrations: {
    analytics: {
      googleAnalytics: String,
      mixpanel: String,
      segment: String
    },
    payment: {
      stripe: {
        enabled: Boolean,
        publicKey: String,
        secretKey: String
      },
      paypal: {
        enabled: Boolean,
        clientId: String
      }
    },
    social: {
      twitter: String,
      discord: String,
      telegram: String,
      github: String
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const WhiteLabel = mongoose.model('WhiteLabel', whiteLabelSchema);

class WhiteLabelManager {
  constructor() {
    this.partners = new Map();
  }

  /**
   * Create white-label partner
   */
  async createPartner(data) {
    try {
      const partnerId = this.generatePartnerId();

      const partner = new WhiteLabel({
        partnerId,
        branding: data.branding,
        customization: data.customization,
        features: data.features,
        domain: data.domain,
        api: data.api,
        blockchain: data.blockchain,
        integrations: data.integrations
      });

      await partner.save();
      this.partners.set(partnerId, partner);

      logger.info(`White-label partner created: ${partnerId} - ${partner.branding.name}`);

      return partner;
    } catch (error) {
      logger.error(`Error creating white-label partner: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get partner configuration
   */
  async getPartner(partnerId) {
    if (this.partners.has(partnerId)) {
      return this.partners.get(partnerId);
    }

    const partner = await WhiteLabel.findOne({ partnerId });
    if (partner) {
      this.partners.set(partnerId, partner);
    }

    return partner;
  }

  /**
   * Get partner by domain
   */
  async getPartnerByDomain(domain) {
    const partner = await WhiteLabel.findOne({
      $or: [
        { 'domain.primary': domain },
        { 'domain.aliases': domain }
      ]
    });

    if (partner) {
      this.partners.set(partner.partnerId, partner);
    }

    return partner;
  }

  /**
   * Update partner branding
   */
  async updateBranding(partnerId, branding) {
    const partner = await this.getPartner(partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    partner.branding = { ...partner.branding, ...branding };
    await partner.save();

    this.partners.set(partnerId, partner);

    logger.info(`Partner branding updated: ${partnerId}`);

    return partner;
  }

  /**
   * Generate themed CSS
   */
  generateThemedCSS(partner) {
    const { colors, fonts } = partner.branding;

    return `
      :root {
        --color-primary: ${colors.primary};
        --color-secondary: ${colors.secondary};
        --color-accent: ${colors.accent};
        --color-background: ${colors.background};
        --color-text: ${colors.text};
        --font-primary: ${fonts.primary}, sans-serif;
        --font-secondary: ${fonts.secondary}, sans-serif;
      }

      body {
        font-family: var(--font-primary);
        background-color: var(--color-background);
        color: var(--color-text);
      }

      .btn-primary {
        background-color: var(--color-primary);
      }

      .btn-secondary {
        background-color: var(--color-secondary);
      }

      ${partner.customization.customCSS || ''}
    `;
  }

  /**
   * Generate white-label configuration
   */
  generateConfig(partner) {
    return {
      app: {
        name: partner.branding.name,
        logo: partner.branding.logo.url,
        favicon: partner.branding.favicon
      },
      blockchain: {
        networkName: partner.blockchain.networkName,
        tokenSymbol: partner.blockchain.tokenSymbol,
        tokenName: partner.blockchain.tokenName,
        chainId: partner.blockchain.chainId
      },
      features: partner.features,
      integrations: partner.integrations,
      customization: partner.customization
    };
  }

  /**
   * White-label middleware
   */
  middleware() {
    return async (req, res, next) => {
      try {
        const domain = req.hostname;
        const partner = await this.getPartnerByDomain(domain);

        if (!partner) {
          return next();
        }

        if (partner.status !== 'active') {
          return res.status(403).json({
            error: 'Partner account suspended'
          });
        }

        // Attach partner config to request
        req.whiteLabel = this.generateConfig(partner);
        req.partner = partner;

        // Add branding headers
        res.set('X-Powered-By', partner.branding.name);

        next();
      } catch (error) {
        logger.error(`White-label middleware error: ${error.message}`);
        next();
      }
    };
  }

  generatePartnerId() {
    const crypto = require('crypto');
    return `partner_${crypto.randomBytes(16).toString('hex')}`;
  }
}

module.exports = new WhiteLabelManager();
