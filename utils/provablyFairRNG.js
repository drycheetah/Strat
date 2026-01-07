const crypto = require('crypto');

/**
 * Provably Fair Random Number Generator
 * Implements cryptographically secure random number generation with verifiable fairness
 */
class ProvablyFairRNG {
  /**
   * Generate a server seed
   */
  static generateServerSeed() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a client seed
   */
  static generateClientSeed() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Hash a seed for verification
   */
  static hashSeed(seed) {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  /**
   * Generate a random number with provable fairness
   * @param {string} serverSeed - Server's secret seed
   * @param {string} clientSeed - Client's seed
   * @param {number} nonce - Sequential number for multiple rolls
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @returns {object} Result with value and verification data
   */
  static generateNumber(serverSeed, clientSeed, nonce, min = 0, max = 100) {
    // Create HMAC with server seed as key and client seed + nonce as message
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}`);
    const hash = hmac.digest('hex');

    // Convert first 8 characters of hash to decimal
    const hex = hash.substring(0, 8);
    const decimal = parseInt(hex, 16);

    // Calculate result within range
    const range = max - min + 1;
    const result = min + (decimal % range);

    return {
      result,
      hash,
      serverSeedHash: this.hashSeed(serverSeed),
      clientSeed,
      nonce,
      min,
      max,
      timestamp: Date.now()
    };
  }

  /**
   * Verify a previously generated number
   * @param {string} serverSeed - Original server seed (revealed)
   * @param {string} clientSeed - Original client seed
   * @param {number} nonce - Original nonce
   * @param {number} result - Claimed result
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {boolean} True if verification succeeds
   */
  static verify(serverSeed, clientSeed, nonce, result, min, max) {
    const generated = this.generateNumber(serverSeed, clientSeed, nonce, min, max);
    return generated.result === result;
  }

  /**
   * Generate multiple random numbers (for things like dice rolls)
   * @param {string} serverSeed - Server's secret seed
   * @param {string} clientSeed - Client's seed
   * @param {number} nonce - Sequential number
   * @param {number} count - How many numbers to generate
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {object} Results array with verification data
   */
  static generateMultiple(serverSeed, clientSeed, nonce, count, min = 1, max = 6) {
    const results = [];

    for (let i = 0; i < count; i++) {
      const roll = this.generateNumber(serverSeed, clientSeed, nonce + i, min, max);
      results.push(roll.result);
    }

    return {
      results,
      serverSeedHash: this.hashSeed(serverSeed),
      clientSeed,
      nonce,
      count,
      min,
      max,
      timestamp: Date.now()
    };
  }

  /**
   * Generate random card deck with provable shuffling
   * @param {string} serverSeed - Server's secret seed
   * @param {string} clientSeed - Client's seed
   * @param {number} nonce - Sequential number
   * @param {number} deckSize - Size of deck (default 52 for standard deck)
   * @returns {object} Shuffled deck with verification data
   */
  static shuffleDeck(serverSeed, clientSeed, nonce, deckSize = 52) {
    const deck = Array.from({ length: deckSize }, (_, i) => i);

    // Fisher-Yates shuffle using provably fair RNG
    for (let i = deckSize - 1; i > 0; i--) {
      const j = this.generateNumber(serverSeed, clientSeed, nonce + i, 0, i).result;
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return {
      deck,
      serverSeedHash: this.hashSeed(serverSeed),
      clientSeed,
      nonce,
      deckSize,
      timestamp: Date.now()
    };
  }

  /**
   * Generate weighted random selection (for loot boxes, drops, etc.)
   * @param {string} serverSeed - Server's secret seed
   * @param {string} clientSeed - Client's seed
   * @param {number} nonce - Sequential number
   * @param {Array} items - Array of {id, weight} objects
   * @returns {object} Selected item with verification data
   */
  static weightedRandom(serverSeed, clientSeed, nonce, items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const roll = this.generateNumber(serverSeed, clientSeed, nonce, 0, totalWeight - 1);

    let cumulativeWeight = 0;
    let selectedItem = null;

    for (const item of items) {
      cumulativeWeight += item.weight;
      if (roll.result < cumulativeWeight) {
        selectedItem = item;
        break;
      }
    }

    return {
      item: selectedItem,
      roll: roll.result,
      totalWeight,
      serverSeedHash: this.hashSeed(serverSeed),
      clientSeed,
      nonce,
      timestamp: Date.now()
    };
  }

  /**
   * Generate random coordinates within bounds
   * @param {string} serverSeed - Server's secret seed
   * @param {string} clientSeed - Client's seed
   * @param {number} nonce - Sequential number
   * @param {object} bounds - {minX, maxX, minY, maxY, minZ, maxZ}
   * @returns {object} Random coordinates with verification data
   */
  static generateCoordinates(serverSeed, clientSeed, nonce, bounds) {
    const x = this.generateNumber(serverSeed, clientSeed, nonce, bounds.minX, bounds.maxX).result;
    const y = this.generateNumber(serverSeed, clientSeed, nonce + 1, bounds.minY, bounds.maxY).result;
    const z = bounds.minZ !== undefined
      ? this.generateNumber(serverSeed, clientSeed, nonce + 2, bounds.minZ, bounds.maxZ).result
      : 0;

    return {
      coordinates: { x, y, z },
      serverSeedHash: this.hashSeed(serverSeed),
      clientSeed,
      nonce,
      bounds,
      timestamp: Date.now()
    };
  }

  /**
   * Generate random boolean (coin flip)
   * @param {string} serverSeed - Server's secret seed
   * @param {string} clientSeed - Client's seed
   * @param {number} nonce - Sequential number
   * @returns {object} Boolean result with verification data
   */
  static coinFlip(serverSeed, clientSeed, nonce) {
    const roll = this.generateNumber(serverSeed, clientSeed, nonce, 0, 1);

    return {
      result: roll.result === 1,
      side: roll.result === 1 ? 'HEADS' : 'TAILS',
      serverSeedHash: this.hashSeed(serverSeed),
      clientSeed,
      nonce,
      timestamp: Date.now()
    };
  }

  /**
   * Generate session with initial seeds
   * @returns {object} New session with seeds
   */
  static createSession() {
    const serverSeed = this.generateServerSeed();
    const clientSeed = this.generateClientSeed();

    return {
      serverSeed,
      clientSeed,
      serverSeedHash: this.hashSeed(serverSeed),
      nonce: 0,
      createdAt: Date.now()
    };
  }

  /**
   * Create verification package for transparency
   * @param {string} serverSeed - Revealed server seed
   * @param {string} clientSeed - Client seed
   * @param {Array} results - Array of {nonce, result, min, max} objects
   * @returns {object} Verification package
   */
  static createVerificationPackage(serverSeed, clientSeed, results) {
    const verifications = results.map(r => ({
      nonce: r.nonce,
      claimed: r.result,
      verified: this.verify(serverSeed, clientSeed, r.nonce, r.result, r.min, r.max),
      min: r.min,
      max: r.max
    }));

    return {
      serverSeed,
      serverSeedHash: this.hashSeed(serverSeed),
      clientSeed,
      results: verifications,
      allValid: verifications.every(v => v.verified),
      timestamp: Date.now()
    };
  }
}

module.exports = ProvablyFairRNG;
