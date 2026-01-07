/**
 * Binance Exchange Integration for STRAT
 * Provides trading, market data, and account management functionality
 */

const axios = require('axios');
const crypto = require('crypto');

class BinanceIntegration {
  constructor(apiKey, apiSecret, testnet = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseURL = testnet
      ? 'https://testnet.binance.vision/api'
      : 'https://api.binance.com/api';
  }

  /**
   * Generate signature for authenticated requests
   */
  _generateSignature(queryString) {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Make authenticated request to Binance API
   */
  async _authenticatedRequest(endpoint, method = 'GET', params = {}) {
    try {
      const timestamp = Date.now();
      const queryString = new URLSearchParams({ ...params, timestamp }).toString();
      const signature = this._generateSignature(queryString);

      const config = {
        method,
        url: `${this.baseURL}${endpoint}?${queryString}&signature=${signature}`,
        headers: {
          'X-MBX-APIKEY': this.apiKey,
        },
      };

      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || error.message,
      };
    }
  }

  /**
   * Get current STRAT price on Binance
   */
  async getSTRATPrice(quoteCurrency = 'USDT') {
    try {
      const response = await axios.get(
        `${this.baseURL}/v3/ticker/price?symbol=STRAT${quoteCurrency}`
      );
      return {
        success: true,
        price: parseFloat(response.data.price),
        symbol: response.data.symbol,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || error.message,
      };
    }
  }

  /**
   * Get 24h price statistics
   */
  async get24hStats(quoteCurrency = 'USDT') {
    try {
      const response = await axios.get(
        `${this.baseURL}/v3/ticker/24hr?symbol=STRAT${quoteCurrency}`
      );
      return {
        success: true,
        data: {
          priceChange: parseFloat(response.data.priceChange),
          priceChangePercent: parseFloat(response.data.priceChangePercent),
          volume: parseFloat(response.data.volume),
          quoteVolume: parseFloat(response.data.quoteVolume),
          high: parseFloat(response.data.highPrice),
          low: parseFloat(response.data.lowPrice),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || error.message,
      };
    }
  }

  /**
   * Place a limit buy order
   */
  async placeLimitBuyOrder(symbol, quantity, price) {
    return await this._authenticatedRequest('/v3/order', 'POST', {
      symbol: `STRAT${symbol}`,
      side: 'BUY',
      type: 'LIMIT',
      timeInForce: 'GTC',
      quantity,
      price,
    });
  }

  /**
   * Place a limit sell order
   */
  async placeLimitSellOrder(symbol, quantity, price) {
    return await this._authenticatedRequest('/v3/order', 'POST', {
      symbol: `STRAT${symbol}`,
      side: 'SELL',
      type: 'LIMIT',
      timeInForce: 'GTC',
      quantity,
      price,
    });
  }

  /**
   * Place a market buy order
   */
  async placeMarketBuyOrder(symbol, quantity) {
    return await this._authenticatedRequest('/v3/order', 'POST', {
      symbol: `STRAT${symbol}`,
      side: 'BUY',
      type: 'MARKET',
      quantity,
    });
  }

  /**
   * Place a market sell order
   */
  async placeMarketSellOrder(symbol, quantity) {
    return await this._authenticatedRequest('/v3/order', 'POST', {
      symbol: `STRAT${symbol}`,
      side: 'SELL',
      type: 'MARKET',
      quantity,
    });
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol, orderId) {
    return await this._authenticatedRequest('/v3/order', 'DELETE', {
      symbol: `STRAT${symbol}`,
      orderId,
    });
  }

  /**
   * Get account balance
   */
  async getAccountBalance() {
    return await this._authenticatedRequest('/v3/account');
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol = null) {
    const params = symbol ? { symbol: `STRAT${symbol}` } : {};
    return await this._authenticatedRequest('/v3/openOrders', 'GET', params);
  }

  /**
   * Get order history
   */
  async getOrderHistory(symbol, limit = 500) {
    return await this._authenticatedRequest('/v3/allOrders', 'GET', {
      symbol: `STRAT${symbol}`,
      limit,
    });
  }

  /**
   * Get trade history
   */
  async getTradeHistory(symbol, limit = 500) {
    return await this._authenticatedRequest('/v3/myTrades', 'GET', {
      symbol: `STRAT${symbol}`,
      limit,
    });
  }

  /**
   * Get order book depth
   */
  async getOrderBook(symbol, limit = 100) {
    try {
      const response = await axios.get(
        `${this.baseURL}/v3/depth?symbol=STRAT${symbol}&limit=${limit}`
      );
      return {
        success: true,
        bids: response.data.bids.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
        })),
        asks: response.data.asks.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || error.message,
      };
    }
  }

  /**
   * Get recent trades
   */
  async getRecentTrades(symbol, limit = 100) {
    try {
      const response = await axios.get(
        `${this.baseURL}/v3/trades?symbol=STRAT${symbol}&limit=${limit}`
      );
      return {
        success: true,
        trades: response.data.map(trade => ({
          id: trade.id,
          price: parseFloat(trade.price),
          quantity: parseFloat(trade.qty),
          time: trade.time,
          isBuyerMaker: trade.isBuyerMaker,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || error.message,
      };
    }
  }

  /**
   * Get klines/candlestick data
   */
  async getKlines(symbol, interval = '1h', limit = 100) {
    try {
      const response = await axios.get(
        `${this.baseURL}/v3/klines?symbol=STRAT${symbol}&interval=${interval}&limit=${limit}`
      );
      return {
        success: true,
        klines: response.data.map(k => ({
          openTime: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          closeTime: k[6],
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || error.message,
      };
    }
  }

  /**
   * Withdraw STRAT tokens
   */
  async withdrawSTRAT(address, amount, network = 'ETH') {
    return await this._authenticatedRequest('/sapi/v1/capital/withdraw/apply', 'POST', {
      coin: 'STRAT',
      address,
      amount,
      network,
    });
  }

  /**
   * Get deposit address
   */
  async getDepositAddress(network = 'ETH') {
    return await this._authenticatedRequest('/sapi/v1/capital/deposit/address', 'GET', {
      coin: 'STRAT',
      network,
    });
  }

  /**
   * Get deposit history
   */
  async getDepositHistory(limit = 100) {
    return await this._authenticatedRequest('/sapi/v1/capital/deposit/hisrec', 'GET', {
      coin: 'STRAT',
      limit,
    });
  }

  /**
   * Get withdrawal history
   */
  async getWithdrawalHistory(limit = 100) {
    return await this._authenticatedRequest('/sapi/v1/capital/withdraw/history', 'GET', {
      coin: 'STRAT',
      limit,
    });
  }
}

module.exports = BinanceIntegration;
