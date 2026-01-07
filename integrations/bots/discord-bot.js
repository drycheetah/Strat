/**
 * Discord Bot for STRAT
 * Price tracking, stats, and community engagement
 */

const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

class StratDiscordBot {
  constructor(token, apiEndpoint) {
    this.token = token;
    this.apiEndpoint = apiEndpoint;
    this.client = null;
    this.priceUpdateInterval = null;
  }

  /**
   * Initialize the bot
   */
  async init() {
    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
        ],
      });

      this._setupEventHandlers();
      this._setupCommands();

      await this.client.login(this.token);

      return {
        success: true,
        message: 'Discord bot initialized',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set up event handlers
   */
  _setupEventHandlers() {
    this.client.on('ready', () => {
      console.log(`Logged in as ${this.client.user.tag}`);
      this._updateBotStatus();
      this._startPriceUpdates();
    });

    this.client.on('interactionCreate', async interaction => {
      if (!interaction.isChatInputCommand()) return;

      await this._handleCommand(interaction);
    });

    this.client.on('messageCreate', async message => {
      if (message.author.bot) return;
      await this._handleMessage(message);
    });
  }

  /**
   * Set up slash commands
   */
  _setupCommands() {
    this.commands = {
      price: new SlashCommandBuilder()
        .setName('price')
        .setDescription('Get current STRAT price'),

      stats: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Get STRAT network statistics'),

      balance: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check wallet balance')
        .addStringOption(option =>
          option.setName('address').setDescription('Wallet address').setRequired(true)
        ),

      gas: new SlashCommandBuilder()
        .setName('gas')
        .setDescription('Get current gas prices'),

      supply: new SlashCommandBuilder()
        .setName('supply')
        .setDescription('Get STRAT supply information'),

      blocks: new SlashCommandBuilder()
        .setName('blocks')
        .setDescription('Get latest blocks')
        .addIntegerOption(option =>
          option.setName('count').setDescription('Number of blocks').setRequired(false)
        ),

      tx: new SlashCommandBuilder()
        .setName('tx')
        .setDescription('Get transaction details')
        .addStringOption(option =>
          option.setName('hash').setDescription('Transaction hash').setRequired(true)
        ),

      alert: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('Set price alert')
        .addNumberOption(option =>
          option.setName('price').setDescription('Alert price').setRequired(true)
        ),
    };
  }

  /**
   * Handle slash commands
   */
  async _handleCommand(interaction) {
    try {
      const { commandName } = interaction;

      switch (commandName) {
        case 'price':
          await this._handlePriceCommand(interaction);
          break;
        case 'stats':
          await this._handleStatsCommand(interaction);
          break;
        case 'balance':
          await this._handleBalanceCommand(interaction);
          break;
        case 'gas':
          await this._handleGasCommand(interaction);
          break;
        case 'supply':
          await this._handleSupplyCommand(interaction);
          break;
        case 'blocks':
          await this._handleBlocksCommand(interaction);
          break;
        case 'tx':
          await this._handleTxCommand(interaction);
          break;
        case 'alert':
          await this._handleAlertCommand(interaction);
          break;
        default:
          await interaction.reply('Unknown command');
      }
    } catch (error) {
      console.error('Error handling command:', error);
      await interaction.reply({
        content: 'An error occurred while processing your command',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle price command
   */
  async _handlePriceCommand(interaction) {
    try {
      const priceData = await this._getPrice();

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('STRAT Price')
        .setDescription(`Current price and market data`)
        .addFields(
          { name: 'Price (USD)', value: `$${priceData.price}`, inline: true },
          { name: '24h Change', value: `${priceData.change24h}%`, inline: true },
          { name: 'Volume 24h', value: `$${priceData.volume24h}`, inline: true },
          { name: 'Market Cap', value: `$${priceData.marketCap}`, inline: true },
          { name: 'High 24h', value: `$${priceData.high24h}`, inline: true },
          { name: 'Low 24h', value: `$${priceData.low24h}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'STRAT Network' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: 'Error fetching price data',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle stats command
   */
  async _handleStatsCommand(interaction) {
    try {
      const stats = await this._getNetworkStats();

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('STRAT Network Statistics')
        .addFields(
          { name: 'Block Height', value: stats.blockHeight.toString(), inline: true },
          { name: 'Hash Rate', value: stats.hashRate, inline: true },
          { name: 'Difficulty', value: stats.difficulty.toString(), inline: true },
          { name: 'Transactions (24h)', value: stats.transactions24h.toString(), inline: true },
          { name: 'Active Nodes', value: stats.activeNodes.toString(), inline: true },
          { name: 'Avg Block Time', value: `${stats.avgBlockTime}s`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'STRAT Network' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: 'Error fetching network stats',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle balance command
   */
  async _handleBalanceCommand(interaction) {
    try {
      const address = interaction.options.getString('address');
      const balance = await this._getBalance(address);

      const embed = new EmbedBuilder()
        .setColor('#ffff00')
        .setTitle('Wallet Balance')
        .setDescription(`Balance for ${address}`)
        .addFields(
          { name: 'STRAT Balance', value: balance.strat, inline: true },
          { name: 'USD Value', value: `$${balance.usd}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: 'Error fetching balance',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle gas command
   */
  async _handleGasCommand(interaction) {
    try {
      const gasData = await this._getGasPrices();

      const embed = new EmbedBuilder()
        .setColor('#ff6600')
        .setTitle('Current Gas Prices')
        .addFields(
          { name: 'Slow', value: `${gasData.slow} gwei`, inline: true },
          { name: 'Standard', value: `${gasData.standard} gwei`, inline: true },
          { name: 'Fast', value: `${gasData.fast} gwei`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: 'Error fetching gas prices',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle supply command
   */
  async _handleSupplyCommand(interaction) {
    try {
      const supply = await this._getSupplyInfo();

      const embed = new EmbedBuilder()
        .setColor('#9900ff')
        .setTitle('STRAT Supply Information')
        .addFields(
          { name: 'Total Supply', value: supply.total, inline: true },
          { name: 'Circulating Supply', value: supply.circulating, inline: true },
          { name: 'Burned', value: supply.burned, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: 'Error fetching supply info',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle blocks command
   */
  async _handleBlocksCommand(interaction) {
    try {
      const count = interaction.options.getInteger('count') || 5;
      const blocks = await this._getLatestBlocks(count);

      const embed = new EmbedBuilder()
        .setColor('#00ccff')
        .setTitle(`Latest ${count} Blocks`)
        .setDescription(
          blocks
            .map(
              block =>
                `**Block ${block.height}**\nHash: \`${block.hash}\`\nTxs: ${block.txCount}`
            )
            .join('\n\n')
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: 'Error fetching blocks',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle tx command
   */
  async _handleTxCommand(interaction) {
    try {
      const hash = interaction.options.getString('hash');
      const tx = await this._getTransaction(hash);

      const embed = new EmbedBuilder()
        .setColor('#ff0099')
        .setTitle('Transaction Details')
        .addFields(
          { name: 'Hash', value: tx.hash },
          { name: 'From', value: tx.from },
          { name: 'To', value: tx.to },
          { name: 'Value', value: `${tx.value} STRAT` },
          { name: 'Status', value: tx.status, inline: true },
          { name: 'Block', value: tx.blockNumber.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: 'Error fetching transaction',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle alert command
   */
  async _handleAlertCommand(interaction) {
    try {
      const price = interaction.options.getNumber('price');
      // Store alert in database
      await interaction.reply({
        content: `Alert set for STRAT price at $${price}`,
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({
        content: 'Error setting alert',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle regular messages
   */
  async _handleMessage(message) {
    const content = message.content.toLowerCase();

    if (content.includes('!price') || content.includes('!strat')) {
      const priceData = await this._getPrice();
      await message.reply(`STRAT: $${priceData.price} (${priceData.change24h}% 24h)`);
    }
  }

  /**
   * Update bot status
   */
  async _updateBotStatus() {
    try {
      const priceData = await this._getPrice();
      this.client.user.setActivity(`STRAT: $${priceData.price}`, { type: 'WATCHING' });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  /**
   * Start periodic price updates
   */
  _startPriceUpdates() {
    this.priceUpdateInterval = setInterval(async () => {
      await this._updateBotStatus();
    }, 60000); // Update every minute
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
    const response = await axios.get(`${this.apiEndpoint}/api/balance/${address}`);
    return response.data;
  }

  async _getGasPrices() {
    const response = await axios.get(`${this.apiEndpoint}/api/gas`);
    return response.data;
  }

  async _getSupplyInfo() {
    const response = await axios.get(`${this.apiEndpoint}/api/supply`);
    return response.data;
  }

  async _getLatestBlocks(count) {
    const response = await axios.get(`${this.apiEndpoint}/api/blocks?limit=${count}`);
    return response.data;
  }

  async _getTransaction(hash) {
    const response = await axios.get(`${this.apiEndpoint}/api/transaction/${hash}`);
    return response.data;
  }

  /**
   * Stop the bot
   */
  async stop() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }

    if (this.client) {
      await this.client.destroy();
    }

    return {
      success: true,
      message: 'Discord bot stopped',
    };
  }
}

module.exports = StratDiscordBot;
