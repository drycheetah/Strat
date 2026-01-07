// Cache Service for STRAT blockchain

const { CACHE } = require('../utils/constants');

class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };

    this.maxSize = 10000; // Maximum cache entries
    this.cleanupInterval = 300000; // 5 minutes

    // Start automatic cleanup
    this.startCleanup();
  }

  /**
   * Get value from cache
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    this.stats.hits++;
    entry.lastAccess = Date.now();
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = 300) {
    // Check cache size and evict if necessary
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry = {
      value,
      ttl: ttl * 1000, // Convert to milliseconds
      createdAt: Date.now(),
      lastAccess: Date.now(),
      accessCount: 0
    };

    this.cache.set(key, entry);
    this.stats.sets++;

    return true;
  }

  /**
   * Delete value from cache
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Check if entry is expired
   */
  isExpired(entry) {
    return Date.now() - entry.createdAt > entry.ttl;
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    let lruKey = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ...this.stats,
      hitRate: `${hitRate}%`,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage
   */
  estimateMemoryUsage() {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation
      totalSize += key.length * 2; // String size
      totalSize += JSON.stringify(entry.value).length;
    }

    // Convert to human readable format
    if (totalSize < 1024) return `${totalSize} B`;
    if (totalSize < 1048576) return `${(totalSize / 1024).toFixed(2)} KB`;
    return `${(totalSize / 1048576).toFixed(2)} MB`;
  }

  /**
   * Start automatic cleanup of expired entries
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }

    return cleaned;
  }

  /**
   * Get or set value (lazy loading pattern)
   */
  async getOrSet(key, fetchFn, ttl = 300) {
    let value = this.get(key);

    if (value !== null) {
      return value;
    }

    // Fetch and cache
    value = await fetchFn();
    this.set(key, value, ttl);

    return value;
  }

  /**
   * Cache block data
   */
  cacheBlock(block) {
    this.set(`block:${block.index}`, block, CACHE.BLOCK_TTL);
    this.set(`block:hash:${block.hash}`, block, CACHE.BLOCK_TTL);
  }

  /**
   * Get cached block
   */
  getBlock(indexOrHash) {
    if (typeof indexOrHash === 'number') {
      return this.get(`block:${indexOrHash}`);
    }
    return this.get(`block:hash:${indexOrHash}`);
  }

  /**
   * Cache transaction
   */
  cacheTransaction(tx) {
    this.set(`tx:${tx.hash}`, tx, CACHE.TRANSACTION_TTL);
  }

  /**
   * Get cached transaction
   */
  getTransaction(hash) {
    return this.get(`tx:${hash}`);
  }

  /**
   * Cache price data
   */
  cachePrice(pair, price) {
    this.set(`price:${pair}`, price, CACHE.PRICE_TTL);
  }

  /**
   * Get cached price
   */
  getPrice(pair) {
    return this.get(`price:${pair}`);
  }

  /**
   * Cache user data
   */
  cacheUser(address, userData) {
    this.set(`user:${address}`, userData, CACHE.USER_TTL);
  }

  /**
   * Get cached user
   */
  getUser(address) {
    return this.get(`user:${address}`);
  }

  /**
   * Cache API response
   */
  cacheAPIResponse(endpoint, params, response) {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    this.set(key, response, CACHE.API_TTL);
  }

  /**
   * Get cached API response
   */
  getAPIResponse(endpoint, params) {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    return this.get(key);
  }

  /**
   * Invalidate cache by pattern
   */
  invalidate(pattern) {
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Get all keys matching pattern
   */
  getKeys(pattern) {
    const keys = [];

    for (const key of this.cache.keys()) {
      if (!pattern || key.includes(pattern)) {
        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Get cache entries by pattern
   */
  getEntries(pattern) {
    const entries = [];

    for (const [key, entry] of this.cache.entries()) {
      if (!pattern || key.includes(pattern)) {
        entries.push({
          key,
          value: entry.value,
          ttl: entry.ttl,
          age: Date.now() - entry.createdAt,
          accessCount: entry.accessCount
        });
      }
    }

    return entries;
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(dataLoader) {
    console.log('Warming up cache...');

    const data = await dataLoader();

    for (const item of data) {
      if (item.type === 'block') {
        this.cacheBlock(item.data);
      } else if (item.type === 'transaction') {
        this.cacheTransaction(item.data);
      } else if (item.type === 'price') {
        this.cachePrice(item.pair, item.data);
      } else if (item.type === 'user') {
        this.cacheUser(item.address, item.data);
      }
    }

    console.log(`Cache warmed up with ${data.length} entries`);

    return data.length;
  }

  /**
   * Export cache state
   */
  export() {
    const entries = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        value: entry.value,
        ttl: entry.ttl,
        createdAt: entry.createdAt
      });
    }

    return {
      entries,
      stats: this.stats,
      timestamp: Date.now()
    };
  }

  /**
   * Import cache state
   */
  import(data) {
    this.clear();

    for (const entry of data.entries) {
      // Calculate remaining TTL
      const age = Date.now() - entry.createdAt;
      const remainingTTL = Math.max(0, (entry.ttl - age) / 1000);

      if (remainingTTL > 0) {
        this.set(entry.key, entry.value, remainingTTL);
      }
    }

    return {
      success: true,
      imported: data.entries.length,
      active: this.cache.size
    };
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new CacheService();
    }
    return instance;
  },
  CacheService
};
