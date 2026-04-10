/**
 * Simple in-memory TTL cache — KavachForWork
 * Used for weather API responses, geocoding, and AI health checks
 * Prevents hammering external APIs on repeated requests
 */

class TTLCache {
  constructor() {
    this._store = new Map();
  }

  /**
   * Get cached value if not expired
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Set a value with TTL in seconds
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds - default 300 (5 min)
   */
  set(key, value, ttlSeconds = 300) {
    this._store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      cachedAt: Date.now(),
    });
  }

  /**
   * Delete a specific key
   */
  delete(key) {
    this._store.delete(key);
  }

  /**
   * Clear all entries (optional maintenance)
   */
  clear() {
    this._store.clear();
  }

  /**
   * Return cache stats for health/debug endpoints
   */
  stats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    for (const entry of this._store.values()) {
      if (now > entry.expiresAt) expired++;
      else active++;
    }
    return { total: this._store.size, active, expired };
  }

  /**
   * Prune expired entries (call periodically to free memory)
   */
  prune() {
    const now = Date.now();
    for (const [key, entry] of this._store.entries()) {
      if (now > entry.expiresAt) this._store.delete(key);
    }
  }
}

// Singleton instance shared across all routes
const cache = new TTLCache();

// Auto-prune every 10 minutes
setInterval(() => cache.prune(), 10 * 60 * 1000);

module.exports = { cache, TTLCache };
