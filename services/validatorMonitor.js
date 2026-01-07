const Stake = require('../models/Stake');
const logger = require('../utils/logger');

class ValidatorMonitor {
  constructor(blockchain, alertingService) {
    this.blockchain = blockchain;
    this.alertingService = alertingService;
    this.validatorPerformance = new Map(); // address -> performance metrics
  }

  // Record validator performance
  async recordValidatorPerformance(validatorAddress, blocksMined = 0, blocksProposed = 0) {
    if (!this.validatorPerformance.has(validatorAddress)) {
      this.validatorPerformance.set(validatorAddress, {
        blocksMined: 0,
        blocksProposed: 0,
        uptime: 0,
        lastSeen: Date.now(),
        missedBlocks: 0,
        totalRewards: 0,
        slashCount: 0
      });
    }

    const performance = this.validatorPerformance.get(validatorAddress);
    performance.blocksMined += blocksMined;
    performance.blocksProposed += blocksProposed;
    performance.lastSeen = Date.now();
  }

  // Record missed block
  recordMissedBlock(validatorAddress) {
    if (this.validatorPerformance.has(validatorAddress)) {
      const performance = this.validatorPerformance.get(validatorAddress);
      performance.missedBlocks++;

      // Alert if missed blocks exceed threshold
      if (performance.missedBlocks > 10 && this.alertingService) {
        this.alertingService.createAlert(
          'warning',
          'validator',
          'Validator Missing Blocks',
          `Validator ${validatorAddress.substring(0, 10)}... has missed ${performance.missedBlocks} blocks`,
          'validator-monitor',
          { validator: validatorAddress, missedBlocks: performance.missedBlocks }
        );
      }
    }
  }

  // Record validator reward
  recordValidatorReward(validatorAddress, reward) {
    if (this.validatorPerformance.has(validatorAddress)) {
      const performance = this.validatorPerformance.get(validatorAddress);
      performance.totalRewards += reward;
    }
  }

  // Record validator slash
  recordValidatorSlash(validatorAddress, amount, reason) {
    if (this.validatorPerformance.has(validatorAddress)) {
      const performance = this.validatorPerformance.get(validatorAddress);
      performance.slashCount++;

      if (this.alertingService) {
        this.alertingService.createAlert(
          'error',
          'validator',
          'Validator Slashed',
          `Validator ${validatorAddress.substring(0, 10)}... was slashed ${amount} STRAT for: ${reason}`,
          'validator-monitor',
          { validator: validatorAddress, amount, reason, slashCount: performance.slashCount }
        );
      }
    }
  }

  // Get active validators
  async getActiveValidators() {
    try {
      const activeStakes = await Stake.find({ status: 'active' }).sort({ amount: -1 });

      return activeStakes.map(stake => {
        const performance = this.validatorPerformance.get(stake.address) || {
          blocksMined: 0,
          blocksProposed: 0,
          missedBlocks: 0,
          totalRewards: 0,
          slashCount: 0,
          lastSeen: null
        };

        const uptime = this.calculateUptime(stake.address);

        return {
          address: stake.address,
          stakedAmount: stake.amount,
          rewards: stake.rewards || 0,
          apy: stake.apy || 0,
          performance: {
            ...performance,
            uptime,
            effectiveRate: this.calculateEffectiveRate(performance)
          },
          status: this.getValidatorStatus(stake.address)
        };
      });
    } catch (error) {
      logger.error(`Error getting active validators: ${error.message}`);
      return [];
    }
  }

  // Calculate validator uptime
  calculateUptime(validatorAddress) {
    const performance = this.validatorPerformance.get(validatorAddress);

    if (!performance || !performance.lastSeen) {
      return 0;
    }

    const now = Date.now();
    const timeSinceLastSeen = now - performance.lastSeen;

    // Consider offline if not seen in last 10 minutes
    if (timeSinceLastSeen > 10 * 60 * 1000) {
      return 0;
    }

    // Calculate uptime based on missed blocks
    const totalBlocks = performance.blocksMined + performance.blocksProposed + performance.missedBlocks;

    if (totalBlocks === 0) {
      return 100;
    }

    return ((totalBlocks - performance.missedBlocks) / totalBlocks) * 100;
  }

  // Calculate effective rate (blocks mined / blocks proposed)
  calculateEffectiveRate(performance) {
    if (performance.blocksProposed === 0) {
      return 0;
    }

    return (performance.blocksMined / performance.blocksProposed) * 100;
  }

  // Get validator status
  getValidatorStatus(validatorAddress) {
    const performance = this.validatorPerformance.get(validatorAddress);

    if (!performance || !performance.lastSeen) {
      return 'unknown';
    }

    const now = Date.now();
    const timeSinceLastSeen = now - performance.lastSeen;

    // Check if validator is offline
    if (timeSinceLastSeen > 10 * 60 * 1000) {
      return 'offline';
    }

    // Check if validator has been slashed
    if (performance.slashCount > 0) {
      return 'slashed';
    }

    // Check uptime
    const uptime = this.calculateUptime(validatorAddress);

    if (uptime < 90) {
      return 'degraded';
    }

    return 'active';
  }

  // Get validator statistics
  async getValidatorStatistics() {
    try {
      const validators = await this.getActiveValidators();

      const stats = {
        totalValidators: validators.length,
        activeValidators: validators.filter(v => v.status === 'active').length,
        offlineValidators: validators.filter(v => v.status === 'offline').length,
        degradedValidators: validators.filter(v => v.status === 'degraded').length,
        slashedValidators: validators.filter(v => v.status === 'slashed').length,
        totalStaked: validators.reduce((sum, v) => sum + v.stakedAmount, 0),
        totalRewards: validators.reduce((sum, v) => sum + v.rewards, 0),
        averageUptime: validators.length > 0
          ? validators.reduce((sum, v) => sum + v.performance.uptime, 0) / validators.length
          : 0,
        averageAPY: validators.length > 0
          ? validators.reduce((sum, v) => sum + v.apy, 0) / validators.length
          : 0
      };

      return stats;

    } catch (error) {
      logger.error(`Error getting validator statistics: ${error.message}`);
      return null;
    }
  }

  // Get top validators by stake
  async getTopValidators(limit = 10) {
    try {
      const validators = await this.getActiveValidators();

      return validators
        .sort((a, b) => b.stakedAmount - a.stakedAmount)
        .slice(0, limit);

    } catch (error) {
      logger.error(`Error getting top validators: ${error.message}`);
      return [];
    }
  }

  // Get top validators by performance
  async getTopValidatorsByPerformance(limit = 10) {
    try {
      const validators = await this.getActiveValidators();

      return validators
        .filter(v => v.status === 'active')
        .sort((a, b) => b.performance.uptime - a.performance.uptime)
        .slice(0, limit);

    } catch (error) {
      logger.error(`Error getting top validators by performance: ${error.message}`);
      return [];
    }
  }

  // Check validator health
  async checkValidatorHealth() {
    try {
      const validators = await this.getActiveValidators();

      validators.forEach(validator => {
        const { address, status, performance } = validator;

        // Alert for offline validators
        if (status === 'offline' && this.alertingService) {
          this.alertingService.createAlert(
            'error',
            'validator',
            'Validator Offline',
            `Validator ${address.substring(0, 10)}... is offline`,
            'validator-monitor',
            { validator: address }
          );
        }

        // Alert for degraded validators
        if (status === 'degraded' && this.alertingService) {
          this.alertingService.createAlert(
            'warning',
            'validator',
            'Validator Degraded Performance',
            `Validator ${address.substring(0, 10)}... has degraded performance (${performance.uptime.toFixed(1)}% uptime)`,
            'validator-monitor',
            { validator: address, uptime: performance.uptime }
          );
        }

        // Alert for low effective rate
        if (performance.effectiveRate < 80 && performance.blocksProposed > 0 && this.alertingService) {
          this.alertingService.createAlert(
            'warning',
            'validator',
            'Low Validator Effective Rate',
            `Validator ${address.substring(0, 10)}... has low effective rate (${performance.effectiveRate.toFixed(1)}%)`,
            'validator-monitor',
            { validator: address, effectiveRate: performance.effectiveRate }
          );
        }
      });

      // Alert for low validator count
      if (validators.length < 3 && this.alertingService) {
        this.alertingService.createAlert(
          'critical',
          'validator',
          'Low Validator Count',
          `Only ${validators.length} validators are currently active`,
          'validator-monitor',
          { validatorCount: validators.length }
        );
      }

    } catch (error) {
      logger.error(`Error checking validator health: ${error.message}`);
    }
  }

  // Get validator details
  async getValidatorDetails(validatorAddress) {
    try {
      const stake = await Stake.findOne({ address: validatorAddress, status: 'active' });

      if (!stake) {
        return null;
      }

      const performance = this.validatorPerformance.get(validatorAddress) || {
        blocksMined: 0,
        blocksProposed: 0,
        missedBlocks: 0,
        totalRewards: 0,
        slashCount: 0,
        lastSeen: null
      };

      const uptime = this.calculateUptime(validatorAddress);
      const status = this.getValidatorStatus(validatorAddress);

      return {
        address: validatorAddress,
        stakedAmount: stake.amount,
        rewards: stake.rewards || 0,
        apy: stake.apy || 0,
        lockPeriod: stake.lockPeriod,
        createdAt: stake.createdAt,
        performance: {
          ...performance,
          uptime,
          effectiveRate: this.calculateEffectiveRate(performance)
        },
        status
      };

    } catch (error) {
      logger.error(`Error getting validator details: ${error.message}`);
      return null;
    }
  }

  // Start monitoring
  startMonitoring() {
    // Check validator health every 5 minutes
    setInterval(() => {
      this.checkValidatorHealth();
    }, 5 * 60 * 1000);

    // Clean up old performance data every hour
    setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      for (const [address, performance] of this.validatorPerformance.entries()) {
        if (performance.lastSeen < oneHourAgo) {
          this.validatorPerformance.delete(address);
        }
      }
    }, 60 * 60 * 1000);

    logger.info('Validator monitoring started');
  }
}

module.exports = ValidatorMonitor;
