/**
 * Shopify Payment App for STRAT
 * Custom payment integration for Shopify stores
 */

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

class StratShopifyApp {
  constructor(config) {
    this.config = config;
    this.app = express();
    this.sessions = new Map();

    this._setupMiddleware();
    this._setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  _setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Verify Shopify requests
    this.app.use((req, res, next) => {
      if (req.path.startsWith('/webhook/')) {
        const hmac = req.headers['x-shopify-hmac-sha256'];
        const body = JSON.stringify(req.body);
        const hash = crypto
          .createHmac('sha256', this.config.shopifySecret)
          .update(body)
          .digest('base64');

        if (hash !== hmac) {
          return res.status(401).send('Unauthorized');
        }
      }
      next();
    });
  }

  /**
   * Setup Express routes
   */
  _setupRoutes() {
    // OAuth callback
    this.app.get('/auth/callback', this._handleAuthCallback.bind(this));

    // Payment session creation
    this.app.post('/payment/create', this._createPaymentSession.bind(this));

    // Payment status check
    this.app.get('/payment/status/:sessionId', this._checkPaymentStatus.bind(this));

    // Payment completion webhook
    this.app.post('/webhook/payment', this._handlePaymentWebhook.bind(this));

    // Order webhook
    this.app.post('/webhook/order', this._handleOrderWebhook.bind(this));

    // Refund webhook
    this.app.post('/webhook/refund', this._handleRefundWebhook.bind(this));
  }

  /**
   * Handle OAuth callback from Shopify
   */
  async _handleAuthCallback(req, res) {
    try {
      const { code, shop, hmac, state } = req.query;

      // Verify HMAC
      const params = Object.keys(req.query)
        .filter(key => key !== 'hmac')
        .map(key => `${key}=${req.query[key]}`)
        .sort()
        .join('&');

      const hash = crypto
        .createHmac('sha256', this.config.shopifySecret)
        .update(params)
        .digest('hex');

      if (hash !== hmac) {
        return res.status(401).send('Invalid HMAC');
      }

      // Exchange code for access token
      const tokenResponse = await axios.post(
        `https://${shop}/admin/oauth/access_token`,
        {
          client_id: this.config.shopifyApiKey,
          client_secret: this.config.shopifySecret,
          code,
        }
      );

      const accessToken = tokenResponse.data.access_token;

      // Store access token
      this.sessions.set(shop, {
        accessToken,
        shop,
        installedAt: Date.now(),
      });

      res.send('STRAT Payment App installed successfully!');
    } catch (error) {
      res.status(500).send('Installation failed: ' + error.message);
    }
  }

  /**
   * Create payment session
   */
  async _createPaymentSession(req, res) {
    try {
      const { orderId, amount, currency, shop } = req.body;

      // Get STRAT price
      const priceData = await this._getStratPrice();
      const stratAmount = parseFloat(amount) / parseFloat(priceData.price);

      // Generate payment address
      const paymentAddress = await this._generatePaymentAddress(orderId);

      // Create session
      const sessionId = `session_${Date.now()}_${orderId}`;
      const session = {
        sessionId,
        orderId,
        shop,
        amount,
        currency,
        stratAmount,
        stratPrice: priceData.price,
        paymentAddress,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
      };

      this.sessions.set(sessionId, session);

      res.json({
        success: true,
        session: {
          sessionId,
          paymentAddress,
          stratAmount,
          stratPrice: priceData.price,
          expiresAt: session.expiresAt,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Check payment status
   */
  async _checkPaymentStatus(req, res) {
    try {
      const { sessionId } = req.params;
      const session = this.sessions.get(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
        });
      }

      // Check if payment received
      const paymentStatus = await this._verifyPayment(
        session.paymentAddress,
        session.stratAmount
      );

      if (paymentStatus.confirmed) {
        session.status = 'completed';
        session.transactionHash = paymentStatus.transactionHash;
        session.confirmedAt = Date.now();
        this.sessions.set(sessionId, session);

        // Notify Shopify
        await this._completeShopifyOrder(session);
      }

      res.json({
        success: true,
        status: session.status,
        confirmations: paymentStatus.confirmations,
        transactionHash: paymentStatus.transactionHash,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Handle payment webhook
   */
  async _handlePaymentWebhook(req, res) {
    try {
      const { address, amount, transactionHash, confirmations } = req.body;

      // Find session by payment address
      let targetSession = null;
      for (const [sessionId, session] of this.sessions) {
        if (session.paymentAddress === address) {
          targetSession = session;
          break;
        }
      }

      if (!targetSession) {
        return res.status(404).send('Session not found');
      }

      // Verify amount
      if (parseFloat(amount) >= parseFloat(targetSession.stratAmount)) {
        if (confirmations >= this.config.requiredConfirmations) {
          targetSession.status = 'completed';
          targetSession.transactionHash = transactionHash;
          targetSession.confirmedAt = Date.now();

          // Complete Shopify order
          await this._completeShopifyOrder(targetSession);
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Webhook error:', error);
      res.sendStatus(500);
    }
  }

  /**
   * Handle order webhook from Shopify
   */
  async _handleOrderWebhook(req, res) {
    try {
      const order = req.body;

      console.log('Order created:', order.id);

      // Additional order processing logic here

      res.sendStatus(200);
    } catch (error) {
      console.error('Order webhook error:', error);
      res.sendStatus(500);
    }
  }

  /**
   * Handle refund webhook from Shopify
   */
  async _handleRefundWebhook(req, res) {
    try {
      const refund = req.body;

      console.log('Refund requested:', refund);

      // STRAT refunds need manual processing
      // Notify admin or create refund task

      res.sendStatus(200);
    } catch (error) {
      console.error('Refund webhook error:', error);
      res.sendStatus(500);
    }
  }

  /**
   * Get STRAT price from API
   */
  async _getStratPrice() {
    const response = await axios.get(`${this.config.stratApiEndpoint}/api/price`);
    return response.data;
  }

  /**
   * Generate unique payment address for order
   */
  async _generatePaymentAddress(orderId) {
    // In production, generate unique address or use payment forwarding
    // For now, return configured wallet address
    return this.config.walletAddress;
  }

  /**
   * Verify payment on blockchain
   */
  async _verifyPayment(address, expectedAmount) {
    try {
      const response = await axios.get(
        `${this.config.stratApiEndpoint}/api/address/${address}/transactions`
      );

      const transactions = response.data;
      const requiredConfirmations = this.config.requiredConfirmations || 3;

      // Find matching transaction
      for (const tx of transactions) {
        if (
          parseFloat(tx.amount) >= parseFloat(expectedAmount) &&
          tx.confirmations >= requiredConfirmations
        ) {
          return {
            confirmed: true,
            transactionHash: tx.hash,
            confirmations: tx.confirmations,
            amount: tx.amount,
          };
        }
      }

      return {
        confirmed: false,
        confirmations: 0,
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        confirmed: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete order in Shopify
   */
  async _completeShopifyOrder(session) {
    try {
      const shopSession = this.sessions.get(session.shop);
      if (!shopSession) {
        throw new Error('Shop session not found');
      }

      // Mark order as paid in Shopify
      await axios.post(
        `https://${session.shop}/admin/api/2024-01/orders/${session.orderId}/transactions.json`,
        {
          transaction: {
            kind: 'capture',
            status: 'success',
            amount: session.amount,
            gateway: 'strat_payment',
            source: 'external',
          },
        },
        {
          headers: {
            'X-Shopify-Access-Token': shopSession.accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`Order ${session.orderId} marked as paid`);
    } catch (error) {
      console.error('Error completing Shopify order:', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  start(port = 3000) {
    this.app.listen(port, () => {
      console.log(`STRAT Shopify App running on port ${port}`);
    });
  }

  /**
   * Create Shopify App Bridge script
   */
  getAppBridgeScript() {
    return `
      <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
      <script>
        var AppBridge = window['app-bridge'];
        var createApp = AppBridge.default;

        var app = createApp({
          apiKey: '${this.config.shopifyApiKey}',
          host: new URLSearchParams(window.location.search).get('host')
        });

        // Payment UI logic here
        function initiatePayment(orderId, amount) {
          fetch('/payment/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, amount, currency: 'USD' })
          })
          .then(res => res.json())
          .then(data => {
            displayPaymentInfo(data.session);
            pollPaymentStatus(data.session.sessionId);
          });
        }

        function displayPaymentInfo(session) {
          document.getElementById('payment-address').textContent = session.paymentAddress;
          document.getElementById('strat-amount').textContent = session.stratAmount;

          // Generate QR code
          new QRCode(document.getElementById('qr-code'), session.paymentAddress);
        }

        function pollPaymentStatus(sessionId) {
          const interval = setInterval(() => {
            fetch('/payment/status/' + sessionId)
              .then(res => res.json())
              .then(data => {
                if (data.status === 'completed') {
                  clearInterval(interval);
                  showPaymentComplete();
                }
              });
          }, 5000);
        }
      </script>
    `;
  }
}

module.exports = StratShopifyApp;
