/**
 * Telegram Bot for STRAT
 * Notifications, price alerts, and wallet management
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

class StratTelegramBot {
  constructor(token, apiEndpoint) {
    this.token = token;
    this.apiEndpoint = apiEndpoint;
    this.bot = null;
    this.subscribers = new Map(); // channelId -> subscription info
    this.userAlerts = new Map(); // userId -> [alerts]
  }

  /**
   * Initialize the bot
   */
  async init() {
    try {
      this.bot = new TelegramBot(this.token, { polling: true });

      this._setupCommands();
      this._setupCallbacks();

      console.log('Telegram bot initialized');

      return {
        success: true,
        message: 'Telegram bot initialized',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set up bot commands
   */
  _setupCommands() {
    // Start command
    this.bot.onText(/\/start/, async msg => {
      const chatId = msg.chat.id;
      const welcomeMessage = `
Welcome to STRAT Bot! 🚀

Available commands:
/price - Get current STRAT price
/stats - Network statistics
/balance <address> - Check wallet balance
/gas - Current gas prices
/subscribe - Subscribe to price updates
/unsubscribe - Unsubscribe from updates
/alert <price> - Set price alert
/alerts - View your alerts
/removealert <id> - Remove an alert
/help - Show this help message
      `;

      await this.bot.sendMessage(chatId, welcomeMessage);
    });

    // Help command
    this.bot.onText(/\/help/, async msg => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(
        chatId,
        'Use /start to see all available commands'
      );
    });

    // Price command
    this.bot.onText(/\/price/, async msg => {
      await this._handlePriceCommand(msg);
    });

    // Stats command
    this.bot.onText(/\/stats/, async msg => {
      await this._handleStatsCommand(msg);
    });

    // Balance command
    this.bot.onText(/\/balance (.+)/, async (msg, match) => {
      await this._handleBalanceCommand(msg, match[1]);
    });

    // Gas command
    this.bot.onText(/\/gas/, async msg => {
      await this._handleGasCommand(msg);
    });

    // Subscribe command
    this.bot.onText(/\/subscribe/, async msg => {
      await this._handleSubscribeCommand(msg);
    });

    // Unsubscribe command
    this.bot.onText(/\/unsubscribe/, async msg => {
      await this._handleUnsubscribeCommand(msg);
    });

    // Alert command
    this.bot.onText(/\/alert (.+)/, async (msg, match) => {
      await this._handleAlertCommand(msg, parseFloat(match[1]));
    });

    // Alerts command
    this.bot.onText(/\/alerts/, async msg => {
      await this._handleAlertsCommand(msg);
    });

    // Remove alert command
    this.bot.onText(/\/removealert (.+)/, async (msg, match) => {
      await this._handleRemoveAlertCommand(msg, match[1]);
    });
  }

  /**
   * Set up callback handlers
   */
  _setupCallbacks() {
    this.bot.on('callback_query', async query => {
      const chatId = query.message.chat.id;
      const data = query.data;

      if (data === 'refresh_price') {
        await this._handlePriceCommand(query.message);
      } else if (data === 'refresh_stats') {
        await this._handleStatsCommand(query.message);
      }

      await this.bot.answerCallbackQuery(query.id);
    });
  }

  /**
   * Handle price command
   */
  async _handlePriceCommand(msg) {
    const chatId = msg.chat.id;

    try {
      const priceData = await this._getPrice();

      const message = `
💰 *STRAT Price*

Price: $${priceData.price}
24h Change: ${priceData.change24h}%
Volume 24h: $${priceData.volume24h}
Market Cap: $${priceData.marketCap}

High 24h: $${priceData.high24h}
Low 24h: $${priceData.low24h}
      `;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔄 Refresh', callback_data: 'refresh_price' }],
        ],
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } catch (error) {
      await this.bot.sendMessage(chatId, 'Error fetching price data');
    }
  }

  /**
   * Handle stats command
   */
  async _handleStatsCommand(msg) {
    const chatId = msg.chat.id;

    try {
      const stats = await this._getNetworkStats();

      const message = `
📊 *STRAT Network Statistics*

Block Height: ${stats.blockHeight}
Hash Rate: ${stats.hashRate}
Difficulty: ${stats.difficulty}
Transactions (24h): ${stats.transactions24h}
Active Nodes: ${stats.activeNodes}
Avg Block Time: ${stats.avgBlockTime}s
      `;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔄 Refresh', callback_data: 'refresh_stats' }],
        ],
      };

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } catch (error) {
      await this.bot.sendMessage(chatId, 'Error fetching network stats');
    }
  }

  /**
   * Handle balance command
   */
  async _handleBalanceCommand(msg, address) {
    const chatId = msg.chat.id;

    try {
      const balance = await this._getBalance(address);

      const message = `
💼 *Wallet Balance*

Address: \`${address}\`

STRAT Balance: ${balance.strat}
USD Value: $${balance.usd}
      `;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      await this.bot.sendMessage(chatId, 'Error fetching balance');
    }
  }

  /**
   * Handle gas command
   */
  async _handleGasCommand(msg) {
    const chatId = msg.chat.id;

    try {
      const gasData = await this._getGasPrices();

      const message = `
⛽ *Current Gas Prices*

Slow: ${gasData.slow} gwei
Standard: ${gasData.standard} gwei
Fast: ${gasData.fast} gwei
      `;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      await this.bot.sendMessage(chatId, 'Error fetching gas prices');
    }
  }

  /**
   * Handle subscribe command
   */
  async _handleSubscribeCommand(msg) {
    const chatId = msg.chat.id;

    this.subscribers.set(chatId, {
      subscribed: true,
      subscribedAt: Date.now(),
    });

    await this.bot.sendMessage(
      chatId,
      '✅ You are now subscribed to STRAT price updates!'
    );
  }

  /**
   * Handle unsubscribe command
   */
  async _handleUnsubscribeCommand(msg) {
    const chatId = msg.chat.id;

    this.subscribers.delete(chatId);

    await this.bot.sendMessage(
      chatId,
      '❌ You have been unsubscribed from price updates'
    );
  }

  /**
   * Handle alert command
   */
  async _handleAlertCommand(msg, price) {
    const chatId = msg.chat.id;

    if (isNaN(price)) {
      await this.bot.sendMessage(chatId, 'Invalid price. Usage: /alert <price>');
      return;
    }

    const alerts = this.userAlerts.get(chatId) || [];
    const alertId = `${chatId}-${Date.now()}`;

    alerts.push({
      id: alertId,
      price,
      createdAt: Date.now(),
    });

    this.userAlerts.set(chatId, alerts);

    await this.bot.sendMessage(
      chatId,
      `🔔 Alert set for STRAT price at $${price}\nAlert ID: ${alertId}`
    );
  }

  /**
   * Handle alerts command
   */
  async _handleAlertsCommand(msg) {
    const chatId = msg.chat.id;
    const alerts = this.userAlerts.get(chatId) || [];

    if (alerts.length === 0) {
      await this.bot.sendMessage(chatId, 'You have no active alerts');
      return;
    }

    const message =
      '🔔 *Your Active Alerts*\n\n' +
      alerts
        .map(
          (alert, index) =>
            `${index + 1}. $${alert.price}\nID: \`${alert.id}\``
        )
        .join('\n\n');

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  /**
   * Handle remove alert command
   */
  async _handleRemoveAlertCommand(msg, alertId) {
    const chatId = msg.chat.id;
    const alerts = this.userAlerts.get(chatId) || [];

    const filteredAlerts = alerts.filter(alert => alert.id !== alertId);

    if (filteredAlerts.length === alerts.length) {
      await this.bot.sendMessage(chatId, 'Alert not found');
      return;
    }

    this.userAlerts.set(chatId, filteredAlerts);

    await this.bot.sendMessage(chatId, '✅ Alert removed');
  }

  /**
   * Send notification to all subscribers
   */
  async notifySubscribers(message) {
    for (const [chatId, subscription] of this.subscribers) {
      if (subscription.subscribed) {
        try {
          await this.bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
          });
        } catch (error) {
          console.error(`Error sending to ${chatId}:`, error);
        }
      }
    }
  }

  /**
   * Check price alerts
   */
  async checkAlerts() {
    try {
      const priceData = await this._getPrice();
      const currentPrice = parseFloat(priceData.price);

      for (const [chatId, alerts] of this.userAlerts) {
        const triggeredAlerts = alerts.filter(
          alert =>
            (alert.price >= currentPrice &&
              alert.price <= currentPrice * 1.01) ||
            (alert.price <= currentPrice && alert.price >= currentPrice * 0.99)
        );

        for (const alert of triggeredAlerts) {
          await this.bot.sendMessage(
            chatId,
            `🚨 *Price Alert Triggered!*\n\nSTRAT has reached $${currentPrice}\nYour alert was set at $${alert.price}`,
            { parse_mode: 'Markdown' }
          );

          // Remove triggered alert
          const remainingAlerts = alerts.filter(a => a.id !== alert.id);
          this.userAlerts.set(chatId, remainingAlerts);
        }
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  /**
   * Send price update to all subscribers
   */
  async sendPriceUpdate() {
    try {
      const priceData = await this._getPrice();

      const message = `
📈 *STRAT Price Update*

Price: $${priceData.price}
24h Change: ${priceData.change24h}%
Volume: $${priceData.volume24h}
      `;

      await this.notifySubscribers(message);
    } catch (error) {
      console.error('Error sending price update:', error);
    }
  }

  /**
   * API calls
   */
  async _getPrice() {
    const response = await axios.get(`${this.apiEndpoint}/api/price`);
    return response.data;
  }

  async _getNetworkStats() {
    const response = await axios.get(`${this.apiEndpoint}/api/stats`);
    return response.data;
  }

  async _getBalance(address) {
    const response = await axios.get(
      `${this.apiEndpoint}/api/balance/${address}`
    );
    return response.data;
  }

  async _getGasPrices() {
    const response = await axios.get(`${this.apiEndpoint}/api/gas`);
    return response.data;
  }

  /**
   * Stop the bot
   */
  async stop() {
    if (this.bot) {
      await this.bot.stopPolling();
    }

    return {
      success: true,
      message: 'Telegram bot stopped',
    };
  }
}

module.exports = StratTelegramBot;
