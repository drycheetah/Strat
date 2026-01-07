const logger = require('../utils/logger');

class GasPriceMonitor {
  constructor(blockchain, alertingService) {
    this.blockchain = blockchain;
    this.alertingService = alertingService;
    this.gasPriceHistory = [];
    this.currentGasPrice = 0;
  }

  // Record gas price from transaction
  recordGasPrice(fee, gasUsed) {
    if (gasUsed > 0) {
      const gasPrice = fee / gasUsed;
      const now = Date.now();

      this.gasPriceHistory.push({
        timestamp: now,
        gasPrice,
        fee,
        gasUsed
      });

      // Keep only last hour of data
      const oneHourAgo = now - 60 * 60 * 1000;
      this.gasPriceHistory = this.gasPriceHistory.filter(
        g => g.timestamp > oneHourAgo
      );

      // Update current gas price (moving average)
      this.updateCurrentGasPrice();
    }
  }

  // Update current gas price estimate
  updateCurrentGasPrice() {
    if (this.gasPriceHistory.length === 0) {
      this.currentGasPrice = 0;
      return;
    }

    // Calculate average gas price from last 10 minutes
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;

    const recentPrices = this.gasPriceHistory
      .filter(g => g.timestamp > tenMinutesAgo)
      .map(g => g.gasPrice);

    if (recentPrices.length === 0) {
      // Fall back to all available data
      this.currentGasPrice = this.gasPriceHistory.reduce(
        (sum, g) => sum + g.gasPrice, 0
      ) / this.gasPriceHistory.length;
    } else {
      this.currentGasPrice = recentPrices.reduce(
        (sum, p) => sum + p, 0
      ) / recentPrices.length;
    }
  }

  // Get current gas price estimate
  getCurrentGasPrice() {
    return this.currentGasPrice;
  }

  // Get gas price percentiles (for different priority levels)
  getGasPricePercentiles() {
    if (this.gasPriceHistory.length === 0) {
      return {
        slow: 0,
        standard: 0,
        fast: 0,
        instant: 0
      };
    }

    // Get recent prices (last 10 minutes)
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;

    const recentPrices = this.gasPriceHistory
      .filter(g => g.timestamp > tenMinutesAgo)
      .map(g => g.gasPrice)
      .sort((a, b) => a - b);

    if (recentPrices.length === 0) {
      return {
        slow: this.currentGasPrice,
        standard: this.currentGasPrice,
        fast: this.currentGasPrice,
        instant: this.currentGasPrice
      };
    }

    const getPercentile = (arr, percentile) => {
      const index = Math.ceil((percentile / 100) * arr.length) - 1;
      return arr[Math.max(0, index)];
    };

    return {
      slow: getPercentile(recentPrices, 25),      // 25th percentile
      standard: getPercentile(recentPrices, 50),  // 50th percentile (median)
      fast: getPercentile(recentPrices, 75),      // 75th percentile
      instant: getPercentile(recentPrices, 95)    // 95th percentile
    };
  }

  // Get gas price statistics
  getGasPriceStats() {
    if (this.gasPriceHistory.length === 0) {
      return {
        current: 0,
        min: 0,
        max: 0,
        average: 0,
        median: 0,
        volatility: 0
      };
    }

    const prices = this.gasPriceHistory.map(g => g.gasPrice);
    const sorted = [...prices].sort((a, b) => a - b);

    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    // Calculate volatility (standard deviation)
    const variance = prices.reduce(
      (sum, p) => sum + Math.pow(p - average, 2), 0
    ) / prices.length;
    const volatility = Math.sqrt(variance);

    return {
      current: this.currentGasPrice,
      min,
      max,
      average,
      median,
      volatility,
      percentiles: this.getGasPricePercentiles()
    };
  }

  // Get gas price trend
  getGasPriceTrend(minutes = 60) {
    const now = Date.now();
    const cutoff = now - minutes * 60 * 1000;

    const recentData = this.gasPriceHistory.filter(
      g => g.timestamp > cutoff
    );

    if (recentData.length < 2) {
      return {
        direction: 'stable',
        change: 0
      };
    }

    const firstPrice = recentData[0].gasPrice;
    const lastPrice = recentData[recentData.length - 1].gasPrice;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    let direction;
    if (change > 5) {
      direction = 'increasing';
    } else if (change < -5) {
      direction = 'decreasing';
    } else {
      direction = 'stable';
    }

    return {
      direction,
      change,
      firstPrice,
      lastPrice
    };
  }

  // Estimate transaction cost
  estimateTransactionCost(gasLimit, priorityLevel = 'standard') {
    const percentiles = this.getGasPricePercentiles();
    const gasPrice = percentiles[priorityLevel] || this.currentGasPrice;

    return gasLimit * gasPrice;
  }

  // Check for gas price spikes
  checkGasPriceAlerts() {
    const stats = this.getGasPriceStats();

    if (!stats.average || stats.average === 0) return;

    // Alert if current gas price is significantly higher than average
    const threshold = stats.average * 2; // 200% of average

    if (this.currentGasPrice > threshold && this.alertingService) {
      this.alertingService.createAlert(
        'warning',
        'network',
        'High Gas Prices',
        `Current gas price (${this.currentGasPrice.toFixed(4)}) is significantly higher than average (${stats.average.toFixed(4)})`,
        'gas-price-monitor',
        { currentPrice: this.currentGasPrice, averagePrice: stats.average }
      );
    }

    // Alert if volatility is very high
    if (stats.volatility > stats.average * 0.5 && this.alertingService) {
      this.alertingService.createAlert(
        'info',
        'network',
        'High Gas Price Volatility',
        `Gas prices are experiencing high volatility (${stats.volatility.toFixed(4)})`,
        'gas-price-monitor',
        { volatility: stats.volatility, average: stats.average }
      );
    }
  }

  // Get gas price recommendations
  getGasPriceRecommendations() {
    const percentiles = this.getGasPricePercentiles();
    const trend = this.getGasPriceTrend();

    return {
      slow: {
        gasPrice: percentiles.slow,
        estimatedTime: '5-10 minutes',
        description: 'Low priority, cheapest option'
      },
      standard: {
        gasPrice: percentiles.standard,
        estimatedTime: '2-5 minutes',
        description: 'Normal priority, balanced option'
      },
      fast: {
        gasPrice: percentiles.fast,
        estimatedTime: '1-2 minutes',
        description: 'High priority, faster confirmation'
      },
      instant: {
        gasPrice: percentiles.instant,
        estimatedTime: '< 1 minute',
        description: 'Highest priority, fastest confirmation'
      },
      trend: trend.direction,
      trendChange: trend.change
    };
  }

  // Start monitoring
  startMonitoring() {
    // Update gas price every minute
    setInterval(() => {
      this.updateCurrentGasPrice();
    }, 60 * 1000);

    // Check for alerts every 5 minutes
    setInterval(() => {
      this.checkGasPriceAlerts();
    }, 5 * 60 * 1000);

    logger.info('Gas price monitoring started');
  }
}

module.exports = GasPriceMonitor;
