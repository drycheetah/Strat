// Email Service for STRAT blockchain

class EmailService {
  constructor(config = {}) {
    this.config = {
      provider: config.provider || 'sendgrid', // sendgrid, mailgun, ses
      apiKey: config.apiKey || process.env.EMAIL_API_KEY,
      from: config.from || 'noreply@stratblockchain.com',
      fromName: config.fromName || 'STRAT Blockchain',
      ...config
    };

    this.templates = this.loadTemplates();
    this.emailQueue = [];
    this.rateLimits = {
      perHour: 1000,
      perDay: 10000,
      sent: {
        hour: 0,
        day: 0,
        lastHourReset: Date.now(),
        lastDayReset: Date.now()
      }
    };
  }

  /**
   * Load email templates
   */
  loadTemplates() {
    return {
      welcome: {
        subject: 'Welcome to STRAT Blockchain',
        html: (data) => `
          <h1>Welcome to STRAT, ${data.username}!</h1>
          <p>Thank you for joining the STRAT blockchain community.</p>
          <p>Your account has been successfully created.</p>
          <p>Address: <code>${data.address}</code></p>
          <p>Get started by:</p>
          <ul>
            <li>Setting up your wallet</li>
            <li>Exploring the ecosystem</li>
            <li>Joining our community channels</li>
          </ul>
          <p>Best regards,<br>The STRAT Team</p>
        `
      },

      transactionConfirmed: {
        subject: 'Transaction Confirmed',
        html: (data) => `
          <h1>Transaction Confirmed</h1>
          <p>Your transaction has been confirmed on the STRAT blockchain.</p>
          <p><strong>Transaction Hash:</strong> ${data.txHash}</p>
          <p><strong>Amount:</strong> ${data.amount} STRAT</p>
          <p><strong>To:</strong> ${data.to}</p>
          <p><strong>Block:</strong> #${data.blockNumber}</p>
          <p><strong>Confirmations:</strong> ${data.confirmations}</p>
          <p><a href="https://explorer.stratblockchain.com/tx/${data.txHash}">View on Explorer</a></p>
        `
      },

      proposalCreated: {
        subject: 'New Governance Proposal',
        html: (data) => `
          <h1>New Governance Proposal</h1>
          <h2>${data.proposalTitle}</h2>
          <p>${data.proposalDescription}</p>
          <p><strong>Proposer:</strong> ${data.proposer}</p>
          <p><strong>Voting Ends:</strong> ${new Date(data.endTime).toLocaleString()}</p>
          <p><a href="https://app.stratblockchain.com/governance/${data.proposalId}">Vote Now</a></p>
        `
      },

      nftSold: {
        subject: 'Your NFT Has Been Sold',
        html: (data) => `
          <h1>NFT Sold!</h1>
          <p>Congratulations! Your NFT "${data.nftName}" has been sold.</p>
          <p><strong>Sale Price:</strong> ${data.price} STRAT</p>
          <p><strong>Buyer:</strong> ${data.buyer}</p>
          <p><strong>Royalty Earned:</strong> ${data.royalty || 0} STRAT</p>
          <p><a href="https://app.stratblockchain.com/nft/${data.tokenId}">View NFT</a></p>
        `
      },

      achievementUnlocked: {
        subject: 'Achievement Unlocked!',
        html: (data) => `
          <h1>🏆 Achievement Unlocked!</h1>
          <h2>${data.achievementName}</h2>
          <p>${data.achievementDescription}</p>
          <p><strong>Reward:</strong> ${data.reward || 'Badge'}</p>
          <p><a href="https://app.stratblockchain.com/profile">View Your Achievements</a></p>
        `
      },

      stakingReward: {
        subject: 'Staking Reward Received',
        html: (data) => `
          <h1>Staking Reward</h1>
          <p>You've received a staking reward!</p>
          <p><strong>Reward Amount:</strong> ${data.amount} STRAT</p>
          <p><strong>Staked Amount:</strong> ${data.stakedAmount} STRAT</p>
          <p><strong>APY:</strong> ${data.apy}%</p>
          <p><a href="https://app.stratblockchain.com/staking">Manage Staking</a></p>
        `
      },

      orderFilled: {
        subject: 'Trading Order Filled',
        html: (data) => `
          <h1>Order Filled</h1>
          <p>Your ${data.side} order has been filled!</p>
          <p><strong>Pair:</strong> ${data.pair}</p>
          <p><strong>Amount:</strong> ${data.amount} STRAT</p>
          <p><strong>Price:</strong> ${data.price}</p>
          <p><strong>Total:</strong> ${data.total}</p>
          <p><a href="https://app.stratblockchain.com/trading">View Trades</a></p>
        `
      },

      priceAlert: {
        subject: 'Price Alert Triggered',
        html: (data) => `
          <h1>Price Alert</h1>
          <p>Your price alert has been triggered!</p>
          <p><strong>Pair:</strong> ${data.pair}</p>
          <p><strong>Current Price:</strong> $${data.currentPrice}</p>
          <p><strong>Alert Price:</strong> $${data.targetPrice}</p>
          <p><strong>Change:</strong> ${data.change > 0 ? '+' : ''}${data.change}%</p>
          <p><a href="https://app.stratblockchain.com/trading">Trade Now</a></p>
        `
      },

      passwordReset: {
        subject: 'Password Reset Request',
        html: (data) => `
          <h1>Password Reset</h1>
          <p>We received a request to reset your password.</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${data.resetLink}">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      },

      twoFactorAuth: {
        subject: 'Two-Factor Authentication Code',
        html: (data) => `
          <h1>Your Authentication Code</h1>
          <p>Your two-factor authentication code is:</p>
          <h2>${data.code}</h2>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please secure your account immediately.</p>
        `
      },

      weeklyDigest: {
        subject: 'Your Weekly STRAT Digest',
        html: (data) => `
          <h1>Weekly Digest</h1>
          <h2>Your STRAT Activity Summary</h2>

          <h3>Portfolio</h3>
          <p><strong>Balance:</strong> ${data.balance} STRAT</p>
          <p><strong>Change:</strong> ${data.balanceChange > 0 ? '+' : ''}${data.balanceChange}%</p>

          <h3>This Week</h3>
          <ul>
            <li>Transactions: ${data.transactions}</li>
            <li>Trades: ${data.trades}</li>
            <li>NFTs Acquired: ${data.nftsAcquired}</li>
            <li>Votes Cast: ${data.votes}</li>
          </ul>

          <h3>Community Highlights</h3>
          <ul>
            ${data.highlights.map(h => `<li>${h}</li>`).join('')}
          </ul>

          <p><a href="https://app.stratblockchain.com/dashboard">View Dashboard</a></p>
        `
      },

      monthlyReport: {
        subject: 'Your Monthly STRAT Report',
        html: (data) => `
          <h1>Monthly Report</h1>
          <p>Hi ${data.username},</p>
          <p>Here's your STRAT activity summary for ${data.month}.</p>

          <h3>Financial Summary</h3>
          <p><strong>Starting Balance:</strong> ${data.startingBalance} STRAT</p>
          <p><strong>Ending Balance:</strong> ${data.endingBalance} STRAT</p>
          <p><strong>Net Change:</strong> ${data.netChange > 0 ? '+' : ''}${data.netChange} STRAT (${data.netChangePercent}%)</p>

          <h3>Activity</h3>
          <ul>
            <li>Transactions: ${data.totalTransactions}</li>
            <li>Trading Volume: ${data.tradingVolume} STRAT</li>
            <li>Staking Rewards: ${data.stakingRewards} STRAT</li>
            <li>NFT Sales: ${data.nftSales}</li>
            <li>Governance Participation: ${data.votesCount} votes</li>
          </ul>

          <p><a href="https://app.stratblockchain.com/reports">View Full Report</a></p>
        `
      },

      communityUpdate: {
        subject: 'STRAT Community Update',
        html: (data) => `
          <h1>Community Update</h1>
          <p>${data.message}</p>

          ${data.updates ? `
            <h3>What's New</h3>
            <ul>
              ${data.updates.map(u => `<li><strong>${u.title}:</strong> ${u.description}</li>`).join('')}
            </ul>
          ` : ''}

          <p><a href="${data.link}">Read More</a></p>

          <p>Best regards,<br>The STRAT Team</p>
        `
      }
    };
  }

  /**
   * Send email using template
   */
  async sendEmail(to, templateName, data) {
    try {
      // Check rate limits
      if (!this.checkRateLimits()) {
        throw new Error('Rate limit exceeded');
      }

      const template = this.templates[templateName];
      if (!template) {
        throw new Error(`Template "${templateName}" not found`);
      }

      const emailData = {
        to,
        from: this.config.from,
        fromName: this.config.fromName,
        subject: template.subject,
        html: template.html(data),
        timestamp: Date.now()
      };

      // Add to queue
      this.emailQueue.push(emailData);

      // In production, send via actual email provider
      // For now, just log
      console.log(`Email queued: ${templateName} to ${to}`);

      this.updateRateLimits();

      return {
        success: true,
        messageId: this.generateMessageId(),
        queued: true
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send custom email
   */
  async sendCustomEmail(to, subject, html) {
    try {
      if (!this.checkRateLimits()) {
        throw new Error('Rate limit exceeded');
      }

      const emailData = {
        to,
        from: this.config.from,
        fromName: this.config.fromName,
        subject,
        html,
        timestamp: Date.now()
      };

      this.emailQueue.push(emailData);

      console.log(`Custom email queued to ${to}`);

      this.updateRateLimits();

      return {
        success: true,
        messageId: this.generateMessageId(),
        queued: true
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(recipients, templateName, dataFn) {
    const results = [];

    for (const recipient of recipients) {
      const data = typeof dataFn === 'function' ? dataFn(recipient) : dataFn;
      const result = await this.sendEmail(recipient, templateName, data);
      results.push({ recipient, ...result });
    }

    return {
      success: true,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Check rate limits
   */
  checkRateLimits() {
    const now = Date.now();

    // Reset hourly counter
    if (now - this.rateLimits.sent.lastHourReset >= 3600000) {
      this.rateLimits.sent.hour = 0;
      this.rateLimits.sent.lastHourReset = now;
    }

    // Reset daily counter
    if (now - this.rateLimits.sent.lastDayReset >= 86400000) {
      this.rateLimits.sent.day = 0;
      this.rateLimits.sent.lastDayReset = now;
    }

    return (
      this.rateLimits.sent.hour < this.rateLimits.perHour &&
      this.rateLimits.sent.day < this.rateLimits.perDay
    );
  }

  /**
   * Update rate limits
   */
  updateRateLimits() {
    this.rateLimits.sent.hour++;
    this.rateLimits.sent.day++;
  }

  /**
   * Generate message ID
   */
  generateMessageId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get email queue
   */
  getQueue() {
    return this.emailQueue;
  }

  /**
   * Clear email queue
   */
  clearQueue() {
    this.emailQueue = [];
    return { success: true, message: 'Queue cleared' };
  }

  /**
   * Get email statistics
   */
  getStats() {
    return {
      queueSize: this.emailQueue.length,
      rateLimits: {
        hourly: {
          sent: this.rateLimits.sent.hour,
          limit: this.rateLimits.perHour,
          remaining: this.rateLimits.perHour - this.rateLimits.sent.hour
        },
        daily: {
          sent: this.rateLimits.sent.day,
          limit: this.rateLimits.perDay,
          remaining: this.rateLimits.perDay - this.rateLimits.sent.day
        }
      }
    };
  }
}

module.exports = EmailService;
