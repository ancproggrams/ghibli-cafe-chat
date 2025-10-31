/**
 * Response Caching Service
 * Caches identical prompts to improve response times
 */
class CacheService {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 3600000; // 1 hour default
    this.cache = new Map(); // key -> { value, timestamp, hits }
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generate cache key from prompt and model
   */
  generateKey(prompt, model) {
    const crypto = require('crypto');
    const keyString = `${model}:${prompt}`;
    return crypto.createHash('sha256').update(keyString).digest('hex');
  }

  /**
   * Get cached response
   */
  get(prompt, model) {
    const key = this.generateKey(prompt, model);
    const cached = this.cache.get(key);

    if (!cached) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update hit count
    cached.hits++;
    this.hits++;
    return cached.value;
  }

  /**
   * Set cached response
   */
  set(prompt, model, value) {
    const key = this.generateKey(prompt, model);

    // Check if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value: value,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    let lruKey = null;
    let lruHits = Infinity;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Prioritize by hits, then by timestamp
      if (entry.hits < lruHits || 
          (entry.hits === lruHits && entry.timestamp < lruTime)) {
        lruKey = key;
        lruHits = entry.hits;
        lruTime = entry.timestamp;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total * 100).toFixed(2) : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      ttl: this.ttl
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[CacheService] Cleaned ${cleaned} expired entries`);
    }

    return cleaned;
  }
}

module.exports = CacheService;

