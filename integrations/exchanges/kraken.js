/**
 * Kraken Exchange Integration for STRAT
 * Provides trading and market data functionality
 */

const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');

class KrakenIntegration {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseURL = 'https://api.kraken.com';
  }

  /**
   * Generate authentication signature for Kraken
   */
  _generateSignature(path, postData, nonce) {
    const message = querystring.stringify(postData);
    const secret = Buffer.from(this.apiSecret, 'base64');
    const hash = crypto.createHash('sha256').update(nonce + message).digest();
    const hmac = crypto
      .createHmac('sha512', secret)
      .update(path + hash)
      .digest('base64');
    return hmac;
  }

  /**
   * Make public API request
   */
  async _publicRequest(endpoint, params = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/0/public/${endpoint}`, {
        params,
      });
      return {
        success: true,
        data: response.data.result,
        error: response.data.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || [error.message],
      };
    }
  }

  /**
   * Make private API request
   */
  async _privateRequest(endpoint, params = {}) {
    try {
      const nonce = Date.now() * 1000;
      const postData = { nonce, ...params };
      const path = `/0/private/${endpoint}`;
      const signature = this._generateSignature(path, postData, nonce);

      const response = await axios.post(
        `${this.baseURL}${path}`,
        querystring.stringify(postData),
        {
          headers: {
            'API-Key': this.apiKey,
            'API-Sign': signature,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        success: true,
        data: response.data.result,
        error: response.data.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || [error.message],
      };
    }
  }

  /**
   * Get STRAT ticker information
   */
  async getSTRATTicker(quoteCurrency = 'USD') {
    const pair = `STRAT${quoteCurrency}`;
    return await this._publicRequest('Ticker', { pair });
  }

  /**
   * Get OHLC (candlestick) data
   */
  async getOHLC(quoteCurrency = 'USD', interval = 60) {
    const pair = `STRAT${quoteCurrency}`;
    return await this._publicRequest('OHLC', { pair, interval });
  }

  /**
   * Get order book
   */
  async getOrderBook(quoteCurrency = 'USD', count = 100) {
    const pair = `STRAT${quoteCurrency}`;
    return await this._publicRequest('Depth', { pair, count });
  }

  /**
   * Get recent trades
   */
  async getRecentTrades(quoteCurrency = 'USD', since = null) {
    const pair = `STRAT${quoteCurrency}`;
    const params = { pair };
    if (since) params.since = since;
    return await this._publicRequest('Trades', params);
  }

  /**
   * Get recent spread data
   */
  async getSpread(quoteCurrency = 'USD', since = null) {
    const pair = `STRAT${quoteCurrency}`;
    const params = { pair };
    if (since) params.since = since;
    return await this._publicRequest('Spread', params);
  }

  /**
   * Get asset info
   */
  async getAssetInfo(asset = 'STRAT') {
    return await this._publicRequest('Assets', { asset });
  }

  /**
   * Get tradable asset pairs
   */
  async getAssetPairs(pair = null) {
    const params = {};
    if (pair) params.pair = pair;
    return await this._publicRequest('AssetPairs', params);
  }

  /**
   * Get account balance
   */
  async getAccountBalance() {
    return await this._privateRequest('Balance');
  }

  /**
   * Get trade balance
   */
  async getTradeBalance(asset = 'ZUSD') {
    return await this._privateRequest('TradeBalance', { asset });
  }

  /**
   * Get open orders
   */
  async getOpenOrders(trades = false) {
    return await this._privateRequest('OpenOrders', { trades });
  }

  /**
   * Get closed orders
   */
  async getClosedOrders(trades = false, start = null, end = null) {
    const params = { trades };
    if (start) params.start = start;
    if (end) params.end = end;
    return await this._privateRequest('ClosedOrders', params);
  }

  /**
   * Query orders info
   */
  async queryOrdersInfo(txid, trades = false) {
    return await this._privateRequest('QueryOrders', {
      txid,
      trades,
    });
  }

  /**
   * Get trades history
   */
  async getTradesHistory(type = 'all', trades = false, start = null, end = null) {
    const params = { type, trades };
    if (start) params.start = start;
    if (end) params.end = end;
    return await this._privateRequest('TradesHistory', params);
  }

  /**
   * Query trades info
   */
  async queryTradesInfo(txid, trades = false) {
    return await this._privateRequest('QueryTrades', {
      txid,
      trades,
    });
  }

  /**
   * Add standard order
   */
  async addOrder(pair, type, ordertype, volume, price = null, options = {}) {
    const params = {
      pair: `STRAT${pair}`,
      type, // buy or sell
      ordertype, // market, limit, stop-loss, etc.
      volume: volume.toString(),
      ...options,
    };

    if (price) {
      params.price = price.toString();
    }

    return await this._privateRequest('AddOrder', params);
  }

  /**
   * Place limit buy order
   */
  async placeLimitBuyOrder(quoteCurrency, volume, price) {
    return await this.addOrder(quoteCurrency, 'buy', 'limit', volume, price);
  }

  /**
   * Place limit sell order
   */
  async placeLimitSellOrder(quoteCurrency, volume, price) {
    return await this.addOrder(quoteCurrency, 'sell', 'limit', volume, price);
  }

  /**
   * Place market buy order
   */
  async placeMarketBuyOrder(quoteCurrency, volume) {
    return await this.addOrder(quoteCurrency, 'buy', 'market', volume);
  }

  /**
   * Place market sell order
   */
  async placeMarketSellOrder(quoteCurrency, volume) {
    return await this.addOrder(quoteCurrency, 'sell', 'market', volume);
  }

  /**
   * Cancel open order
   */
  async cancelOrder(txid) {
    return await this._privateRequest('CancelOrder', { txid });
  }

  /**
   * Cancel all open orders
   */
  async cancelAllOrders() {
    return await this._privateRequest('CancelAll');
  }

  /**
   * Get deposit methods
   */
  async getDepositMethods(asset = 'STRAT') {
    return await this._privateRequest('DepositMethods', { asset });
  }

  /**
   * Get deposit addresses
   */
  async getDepositAddresses(asset = 'STRAT', method) {
    return await this._privateRequest('DepositAddresses', {
      asset,
      method,
    });
  }

  /**
   * Get status of recent deposits
   */
  async getDepositStatus(asset = 'STRAT', method = null) {
    const params = { asset };
    if (method) params.method = method;
    return await this._privateRequest('DepositStatus', params);
  }

  /**
   * Get withdrawal information
   */
  async getWithdrawInfo(asset = 'STRAT', key, amount) {
    return await this._privateRequest('WithdrawInfo', {
      asset,
      key,
      amount: amount.toString(),
    });
  }

  /**
   * Withdraw funds
   */
  async withdraw(asset = 'STRAT', key, amount) {
    return await this._privateRequest('Withdraw', {
      asset,
      key,
      amount: amount.toString(),
    });
  }

  /**
   * Get status of recent withdrawals
   */
  async getWithdrawStatus(asset = 'STRAT', method = null) {
    const params = { asset };
    if (method) params.method = method;
    return await this._privateRequest('WithdrawStatus', params);
  }

  /**
   * Cancel withdrawal
   */
  async cancelWithdrawal(asset = 'STRAT', refid) {
    return await this._privateRequest('WithdrawCancel', {
      asset,
      refid,
    });
  }

  /**
   * Get ledgers info
   */
  async getLedgers(asset = null, type = 'all', start = null, end = null) {
    const params = { type };
    if (asset) params.asset = asset;
    if (start) params.start = start;
    if (end) params.end = end;
    return await this._privateRequest('Ledgers', params);
  }

  /**
   * Query ledgers
   */
  async queryLedgers(id) {
    return await this._privateRequest('QueryLedgers', { id });
  }

  /**
   * Get trade volume
   */
  async getTradeVolume(pair = null, feeInfo = false) {
    const params = { 'fee-info': feeInfo };
    if (pair) params.pair = pair;
    return await this._privateRequest('TradeVolume', params);
  }

  /**
   * Request export report
   */
  async addExport(report, description, format = 'CSV', fields = 'all') {
    return await this._privateRequest('AddExport', {
      report,
      description,
      format,
      fields,
    });
  }

  /**
   * Get export report status
   */
  async getExportStatus(report) {
    return await this._privateRequest('ExportStatus', { report });
  }

  /**
   * Retrieve export report
   */
  async retrieveExport(id) {
    return await this._privateRequest('RetrieveExport', { id });
  }
}

module.exports = KrakenIntegration;
