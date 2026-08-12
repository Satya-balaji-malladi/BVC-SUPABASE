/**
 * CacheManager.js
 * Centralized, production-grade CacheService abstraction layer.
 * Manages script and user cache with automatic prefix registry tracking and safety limits.
 */
const CacheManager = {

  /**
   * PRIVATE: Resolves appropriate CacheService instance.
   * @param {boolean} isUserPrivate Use private user cache
   * @return {Cache} Apps Script Cache instance
   */
  _getCache: function(isUserPrivate) {
    return isUserPrivate ? CacheService.getUserCache() : CacheService.getScriptCache();
  },

  /**
   * PRIVATE: Tracks keys within a registry for prefix invalidation.
   * @param {string} key Cache key to track
   * @param {string} prefix Prefix category
   * @param {boolean} isUserPrivate Cache visibility
   */
  _trackKey: function(key, prefix, isUserPrivate) {
    if (!prefix) return;
    try {
      const registryKey = "__registry_" + prefix;
      const cache = this._getCache(isUserPrivate);
      const raw = cache.get(registryKey);
      let registry = raw ? JSON.parse(raw) : [];
      if (registry.indexOf(key) === -1) {
        registry.push(key);
        cache.put(registryKey, JSON.stringify(registry), 21600); // 6 hours registry TTL
      }
    } catch (e) {
      Logger.log("CacheManager._trackKey error: " + e.message);
    }
  },

  /**
   * Gets a deserialized value from the Cache.
   * @param {string} key Unique identifier key
   * @param {boolean} [isUserPrivate=false] Use private user cache
   * @return {any|null} Deserialized JSON object or null if cache miss
   */
  get: function(key, isUserPrivate) {
    try {
      const cache = this._getCache(isUserPrivate);
      const val = cache.get(key);
      if (!val) return null;
      return JSON.parse(val);
    } catch (e) {
      Logger.log('CacheManager.get error for key ' + key + ': ' + e.message);
      return null;
    }
  },

  /**
   * Serializes and writes a value to the Cache.
   * @param {string} key Unique identifier key
   * @param {any} value Value to cache (will be JSON serialized)
   * @param {number} [ttlSeconds=300] Time to live in seconds
   * @param {boolean} [isUserPrivate=false] Use private user cache
   * @return {boolean} True if successfully cached
   */
  put: function(key, value, ttlSeconds, isUserPrivate) {
    try {
      const cache = this._getCache(isUserPrivate);
      const valStr = JSON.stringify(value);
      if (valStr.length > 102400) {
        Logger.log('CacheManager.put skipped because size exceeds 100KB limit for key: ' + key);
        return false;
      }
      const ttl = Math.min(21600, Math.max(1, ttlSeconds || 300));
      cache.put(key, valStr, ttl);

      // Track key prefix for namespaces (key format e.g. "prefix_xxx"), ignoring leading underscores
      let cleanKey = key;
      while (cleanKey.indexOf('_') === 0) {
        cleanKey = cleanKey.substring(1);
      }
      const idx = cleanKey.indexOf('_');
      if (idx !== -1) {
        const prefix = cleanKey.substring(0, idx);
        this._trackKey(key, prefix, isUserPrivate);
      }
      return true;
    } catch (e) {
      Logger.log('CacheManager.put error for key ' + key + ': ' + e.message);
      return false;
    }
  },

  /**
   * Explicitly removes an item from the Cache.
   * @param {string} key Cache key to delete
   * @param {boolean} [isUserPrivate=false] Use private user cache
   * @return {boolean} True if successfully removed
   */
  remove: function(key, isUserPrivate) {
    try {
      const cache = this._getCache(isUserPrivate);
      cache.remove(key);
      return true;
    } catch (e) {
      Logger.log('CacheManager.remove error for key ' + key + ': ' + e.message);
      return false;
    }
  },

  /**
   * Removes all cached keys matching a specific namespace prefix.
   * @param {string} prefix Key prefix namespace
   * @param {boolean} [isUserPrivate=false] Use private user cache
   */
  clearByPrefix: function(prefix, isUserPrivate) {
    try {
      const registryKey = "__registry_" + prefix;
      const cache = this._getCache(isUserPrivate);
      const raw = cache.get(registryKey);
      if (raw) {
        const registry = JSON.parse(raw);
        if (Array.isArray(registry)) {
          registry.forEach(function(k) {
            try { cache.remove(k); } catch (e) {}
          });
        }
        cache.remove(registryKey);
      }
    } catch (e) {
      Logger.log("CacheManager.clearByPrefix error: " + e.message);
    }
  },

  /**
   * Stores large JSON payloads by splitting into 90KB chunks.
   * Bypasses the 100KB Apps Script CacheService hard limit.
   */
  putChunked: function(key, value, ttlSeconds, isUserPrivate) {
    try {
      const cache = this._getCache(isUserPrivate);
      const ttl = Math.min(21600, Math.max(1, ttlSeconds || 300));
      const fullStr = JSON.stringify(value);
      const CHUNK_SIZE = 90000; // 90KB per chunk

      if (fullStr.length <= CHUNK_SIZE) {
        // Small enough — store normally
        cache.put(key, JSON.stringify({ chunked: false, data: fullStr }), ttl);
        return true;
      }

      // Split into chunks
      const chunks = [];
      for (var i = 0; i < fullStr.length; i += CHUNK_SIZE) {
        chunks.push(fullStr.substring(i, i + CHUNK_SIZE));
      }

      // Store each chunk
      chunks.forEach(function(chunk, idx) {
        cache.put(key + '_chunk_' + idx, chunk, ttl);
      });

      // Store manifest
      cache.put(key, JSON.stringify({ chunked: true, count: chunks.length }), ttl);
      return true;
    } catch (e) {
      Logger.log('CacheManager.putChunked error for key ' + key + ': ' + e.message);
      return false;
    }
  },

  /**
   * Retrieves a value stored with putChunked, reassembling chunks if needed.
   */
  getChunked: function(key, isUserPrivate) {
    try {
      const cache = this._getCache(isUserPrivate);
      const manifestStr = cache.get(key);
      if (!manifestStr) return null;

      const manifest = JSON.parse(manifestStr);

      if (!manifest.chunked) {
        // Single-chunk value
        return JSON.parse(manifest.data);
      }

      // Reassemble chunks
      let fullStr = '';
      for (var i = 0; i < manifest.count; i++) {
        const chunk = cache.get(key + '_chunk_' + i);
        if (!chunk) return null; // chunk expired or missing
        fullStr += chunk;
      }
      return JSON.parse(fullStr);
    } catch (e) {
      Logger.log('CacheManager.getChunked error for key ' + key + ': ' + e.message);
      return null;
    }
  }
};
