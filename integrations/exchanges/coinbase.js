/**
 * Coinbase Exchange Integration for STRAT
 * Supports both Coinbase Pro (Advanced Trade) and regular Coinbase
 */

const axios = require('axios');
const crypto = require('crypto');

class CoinbaseIntegration {
  constructor(apiKey, apiSecret, passphrase, sandbox = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
    this.baseURL = sandbox
      ? 'https://api-public.sandbox.pro.coinbase.com'
      : 'https://api.pro.coinbase.com';
  }

  /**
   * Generate authentication headers for Coinbase Pro
   */
  _getAuthHeaders(method, requestPath, body = '') {
    const timestamp = Date.now() / 1000;
    const message = timestamp + method.toUpperCase() + requestPath + body;
    const signature = crypto
      .createHmac('sha256', Buffer.from(this.apiSecret, 'base64'))
      .update(message)
      .digest('base64');

    return {
      'CB-ACCESS-KEY': this.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-ACCESS-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make authenticated request to Coinbase Pro API
   */
  async _authenticatedRequest(endpoint, method = 'GET', body = null) {
    try {
      const requestPath = endpoint;
      const bodyString = body ? JSON.stringify(body) : '';
      const headers = this._getAuthHeaders(method, requestPath, bodyString);

      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers,
      };

      if (body) {
        config.data = body;
      }

      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get STRAT ticker price
   */
  async getSTRATPrice(quoteCurrency = 'USD') {
    try {
      const response = await axios.get(
        `${this.baseURL}/products/STRAT-${quoteCurrency}/ticker`
      );
      return {
        success: true,
        price: parseFloat(response.data.price),
        volume: parseFloat(response.data.volume),
        bid: parseFloat(response.data.bid),
        ask: parseFloat(response.data.ask),
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get 24h stats for STRAT
   */
  async get24hStats(quoteCurrency = 'USD') {
    try {
      const response = await axios.get(
        `${this.baseURL}/products/STRAT-${quoteCurrency}/stats`
      );
      return {
        success: true,
        data: {
          open: parseFloat(response.data.open),
          high: parseFloat(response.data.high),
          low: parseFloat(response.data.low),
          volume: parseFloat(response.data.volume),
          last: parseFloat(response.data.last),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Place a limit buy order
   */
  async placeLimitBuyOrder(productId, size, price) {
    return await this._authenticatedRequest('/orders', 'POST', {
      product_id: `STRAT-${productId}`,
      side: 'buy',
      type: 'limit',
      size: size.toString(),
      price: price.toString(),
      time_in_force: 'GTC',
    });
  }

  /**
   * Place a limit sell order
   */
  async placeLimitSellOrder(productId, size, price) {
    return await this._authenticatedRequest('/orders', 'POST', {
      product_id: `STRAT-${productId}`,
      side: 'sell',
      type: 'limit',
      size: size.toString(),
      price: price.toString(),
      time_in_force: 'GTC',
    });
  }

  /**
   * Place a market buy order
   */
  async placeMarketBuyOrder(productId, size = null, funds = null) {
    const orderData = {
      product_id: `STRAT-${productId}`,
      side: 'buy',
      type: 'market',
    };

    if (size) {
      orderData.size = size.toString();
    } else if (funds) {
      orderData.funds = funds.toString();
    }

    return await this._authenticatedRequest('/orders', 'POST', orderData);
  }

  /**
   * Place a market sell order
   */
  async placeMarketSellOrder(productId, size) {
    return await this._authenticatedRequest('/orders', 'POST', {
      product_id: `STRAT-${productId}`,
      side: 'sell',
      type: 'market',
      size: size.toString(),
    });
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId) {
    return await this._authenticatedRequest(`/orders/${orderId}`, 'DELETE');
  }

  /**
   * Cancel all orders for a product
   */
  async cancelAllOrders(productId = null) {
    const endpoint = productId
      ? `/orders?product_id=STRAT-${productId}`
      : '/orders';
    return await this._authenticatedRequest(endpoint, 'DELETE');
  }

  /**
   * Get all accounts
   */
  async getAccounts() {
    return await this._authenticatedRequest('/accounts');
  }

  /**
   * Get account by ID
   */
  async getAccount(accountId) {
    return await this._authenticatedRequest(`/accounts/${accountId}`);
  }

  /**
   * Get STRAT account balance
   */
  async getSTRATBalance() {
    const accountsResult = await this.getAccounts();
    if (!accountsResult.success) {
      return accountsResult;
    }

    const stratAccount = accountsResult.data.find(
      acc => acc.currency === 'STRAT'
    );

    if (!stratAccount) {
      return { success: false, error: 'STRAT account not found' };
    }

    return {
      success: true,
      balance: parseFloat(stratAccount.balance),
      available: parseFloat(stratAccount.available),
      hold: parseFloat(stratAccount.hold),
    };
  }

  /**
   * Get open orders
   */
  async getOpenOrders(productId = null) {
    const endpoint = productId
      ? `/orders?status=open&product_id=STRAT-${productId}`
      : '/orders?status=open';
    return await this._authenticatedRequest(endpoint);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    return await this._authenticatedRequest(`/orders/${orderId}`);
  }

  /**
   * Get fills (trade history)
   */
  async getFills(productId = null, limit = 100) {
    const params = new URLSearchParams({ limit });
    if (productId) {
      params.append('product_id', `STRAT-${productId}`);
    }
    return await this._authenticatedRequest(`/fills?${params}`);
  }

  /**
   * Get order book
   */
  async getOrderBook(productId, level = 2) {
    try {
      const response = await axios.get(
        `${this.baseURL}/products/STRAT-${productId}/book?level=${level}`
      );
      return {
        success: true,
        bids: response.data.bids.map(([price, size, numOrders]) => ({
          price: parseFloat(price),
          size: parseFloat(size),
          numOrders: parseInt(numOrders),
        })),
        asks: response.data.asks.map(([price, size, numOrders]) => ({
          price: parseFloat(price),
          size: parseFloat(size),
          numOrders: parseInt(numOrders),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get trades for a product
   */
  async getTrades(productId, limit = 100) {
    try {
      const response = await axios.get(
        `${this.baseURL}/products/STRAT-${productId}/trades?limit=${limit}`
      );
      return {
        success: true,
        trades: response.data.map(trade => ({
          time: trade.time,
          tradeId: trade.trade_id,
          price: parseFloat(trade.price),
          size: parseFloat(trade.size),
          side: trade.side,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get historic rates (candles)
   */
  async getHistoricRates(productId, granularity = 3600, start = null, end = null) {
    try {
      const params = new URLSearchParams({ granularity });
      if (start) params.append('start', start);
      if (end) params.append('end', end);

      const response = await axios.get(
        `${this.baseURL}/products/STRAT-${productId}/candles?${params}`
      );
      return {
        success: true,
        candles: response.data.map(candle => ({
          time: candle[0],
          low: candle[1],
          high: candle[2],
          open: candle[3],
          close: candle[4],
          volume: candle[5],
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Generate crypto address for deposits
   */
  async generateDepositAddress(accountId) {
    return await this._authenticatedRequest(
      `/coinbase-accounts/${accountId}/addresses`,
      'POST'
    );
  }

  /**
   * Withdraw to crypto address
   */
  async withdrawToCrypto(amount, cryptoAddress, currency = 'STRAT') {
    return await this._authenticatedRequest('/withdrawals/crypto', 'POST', {
      amount: amount.toString(),
      currency,
      crypto_address: cryptoAddress,
    });
  }

  /**
   * Get payment methods
   */
  async getPaymentMethods() {
    return await this._authenticatedRequest('/payment-methods');
  }

  /**
   * Get coinbase accounts
   */
  async getCoinbaseAccounts() {
    return await this._authenticatedRequest('/coinbase-accounts');
  }
}

module.exports = CoinbaseIntegration;
