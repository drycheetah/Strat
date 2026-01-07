/**
 * Twitter Bot for STRAT
 * Automated announcements and community engagement
 */

const { TwitterApi } = require('twitter-api-v2');
const axios = require('axios');

class StratTwitterBot {
  constructor(credentials, apiEndpoint) {
    this.credentials = credentials;
    this.apiEndpoint = apiEndpoint;
    this.client = null;
    this.lastPrice = null;
  }

  /**
   * Initialize the bot
   */
  async init() {
    try {
      this.client = new TwitterApi({
        appKey: this.credentials.apiKey,
        appSecret: this.credentials.apiSecret,
        accessToken: this.credentials.accessToken,
        accessSecret: this.credentials.accessSecret,
      });

      // Test authentication
      await this.client.v2.me();

      console.log('Twitter bot initialized');

      return {
        success: true,
        message: 'Twitter bot initialized',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Tweet price update
   */
  async tweetPriceUpdate() {
    try {
      const priceData = await this._getPrice();

      const emoji = parseFloat(priceData.change24h) >= 0 ? '📈' : '📉';
      const changeEmoji = parseFloat(priceData.change24h) >= 0 ? '🟢' : '🔴';

      const tweet = `
${emoji} #STRAT Price Update

💰 $${priceData.price}
${changeEmoji} 24h: ${priceData.change24h}%
📊 Volume: $${this._formatNumber(priceData.volume24h)}
💎 Market Cap: $${this._formatNumber(priceData.marketCap)}

#Crypto #Blockchain
      `.trim();

      const result = await this.client.v2.tweet(tweet);

      return {
        success: true,
        tweetId: result.data.id,
        text: result.data.text,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Tweet network stats
   */
  async tweetNetworkStats() {
    try {
      const stats = await this._getNetworkStats();

      const tweet = `
🔗 #STRAT Network Stats

⛏️ Block Height: ${this._formatNumber(stats.blockHeight)}
⚡ Hash Rate: ${stats.hashRate}
🎯 Difficulty: ${this._formatNumber(stats.difficulty)}
📋 Transactions (24h): ${this._formatNumber(stats.transactions24h)}
🌐 Active Nodes: ${stats.activeNodes}

#Blockchain #Mining
      `.trim();

      const result = await this.client.v2.tweet(tweet);

      return {
        success: true,
        tweetId: result.data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Tweet milestone achievement
   */
  async tweetMilestone(milestone) {
    try {
      const tweet = `
🎉 Milestone Achieved!

${milestone.message}

#STRAT #Milestone #Crypto
      `.trim();

      const result = await this.client.v2.tweet(tweet);

      return {
        success: true,
        tweetId: result.data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Tweet new block found
   */
  async tweetNewBlock(block) {
    try {
      const tweet = `
⛏️ New Block Mined!

Block #${block.height}
Hash: ${block.hash.substring(0, 16)}...
Transactions: ${block.txCount}
Miner: ${block.miner.substring(0, 10)}...

#STRAT #Mining
      `.trim();

      const result = await this.client.v2.tweet(tweet);

      return {
        success: true,
        tweetId: result.data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Tweet announcement
   */
  async tweetAnnouncement(announcement) {
    try {
      const tweet = `
📢 Announcement

${announcement.title}

${announcement.message}

#STRAT #News
      `.trim();

      const result = await this.client.v2.tweet(tweet);

      return {
        success: true,
        tweetId: result.data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Tweet with media
   */
  async tweetWithMedia(text, mediaPath) {
    try {
      // Upload media first
      const mediaId = await this.client.v1.uploadMedia(mediaPath);

      // Tweet with media
      const result = await this.client.v2.tweet({
        text,
        media: { media_ids: [mediaId] },
      });

      return {
        success: true,
        tweetId: result.data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Reply to tweet
   */
  async replyToTweet(tweetId, text) {
    try {
      const result = await this.client.v2.reply(text, tweetId);

      return {
        success: true,
        tweetId: result.data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Like a tweet
   */
  async likeTweet(tweetId) {
    try {
      const me = await this.client.v2.me();
      await this.client.v2.like(me.data.id, tweetId);

      return {
        success: true,
        message: 'Tweet liked',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Retweet
   */
  async retweet(tweetId) {
    try {
      const me = await this.client.v2.me();
      await this.client.v2.retweet(me.data.id, tweetId);

      return {
        success: true,
        message: 'Retweeted',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Search tweets mentioning STRAT
   */
  async searchMentions(maxResults = 10) {
    try {
      const result = await this.client.v2.search('#STRAT OR @YourStratHandle', {
        max_results: maxResults,
      });

      return {
        success: true,
        tweets: result.data.data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Auto-engage with community
   */
  async autoEngage() {
    try {
      const mentions = await this.searchMentions(5);

      if (!mentions.success) {
        return mentions;
      }

      const engagements = [];

      for (const tweet of mentions.tweets) {
        // Like the tweet
        const likeResult = await this.likeTweet(tweet.id);
        if (likeResult.success) {
          engagements.push({ type: 'like', tweetId: tweet.id });
        }

        // Sometimes reply
        if (Math.random() < 0.3) {
          const replies = [
            'Thanks for the support! 🚀',
            'STRAT to the moon! 🌙',
            'Join our community! 💪',
            'Building the future! ⚡',
          ];

          const randomReply = replies[Math.floor(Math.random() * replies.length)];
          const replyResult = await this.replyToTweet(tweet.id, randomReply);

          if (replyResult.success) {
            engagements.push({ type: 'reply', tweetId: tweet.id });
          }
        }
      }

      return {
        success: true,
        engagements,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Tweet price alert
   */
  async tweetPriceAlert(threshold) {
    try {
      const priceData = await this._getPrice();
      const currentPrice = parseFloat(priceData.price);

      if (!this.lastPrice) {
        this.lastPrice = currentPrice;
        return { success: true, message: 'Price recorded' };
      }

      const changePercent = ((currentPrice - this.lastPrice) / this.lastPrice) * 100;

      if (Math.abs(changePercent) >= threshold) {
        const emoji = changePercent > 0 ? '🚀' : '⚠️';
        const direction = changePercent > 0 ? 'up' : 'down';

        const tweet = `
${emoji} Price Alert!

#STRAT is ${direction} ${Math.abs(changePercent).toFixed(2)}%

Current Price: $${currentPrice}
Previous: $${this.lastPrice}

#Crypto #PriceAlert
        `.trim();

        await this.client.v2.tweet(tweet);

        this.lastPrice = currentPrice;

        return {
          success: true,
          alerted: true,
          changePercent,
        };
      }

      return {
        success: true,
        alerted: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(woeid = 1) {
    try {
      const trends = await this.client.v1.trendsByPlace(woeid);

      return {
        success: true,
        trends: trends[0].trends,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get account stats
   */
  async getAccountStats() {
    try {
      const me = await this.client.v2.me({
        'user.fields': ['public_metrics'],
      });

      return {
        success: true,
        stats: {
          followers: me.data.public_metrics.followers_count,
          following: me.data.public_metrics.following_count,
          tweets: me.data.public_metrics.tweet_count,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
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

  /**
   * Format number with K/M/B suffixes
   */
  _formatNumber(num) {
    const number = parseFloat(num);

    if (number >= 1e9) {
      return (number / 1e9).toFixed(2) + 'B';
    } else if (number >= 1e6) {
      return (number / 1e6).toFixed(2) + 'M';
    } else if (number >= 1e3) {
      return (number / 1e3).toFixed(2) + 'K';
    }

    return number.toFixed(2);
  }
}

module.exports = StratTwitterBot;
