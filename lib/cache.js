'use strict';

/**
 * 轻量 TTL 缓存。
 * 知乎开放接口有每日额度限制（热榜 100/天、直答 100/天、搜索 5000/天），
 * 应用层缓存是官方要求的必备能力，避免高频重复请求。
 */
class TTLCache {
  constructor() {
    this._store = new Map();
  }

  get(key) {
    const hit = this._store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this._store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key, value, ttlMs = 60 * 1000) {
    this._store.set(key, { value, expiresAt: Date.now() + ttlMs });
    // 简单防膨胀：写入时若超过阈值，清理过期项
    if (this._store.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this._store) {
        if (now > v.expiresAt) this._store.delete(k);
      }
    }
  }

  del(key) {
    this._store.delete(key);
  }

  clear() {
    this._store.clear();
  }
}

module.exports = new TTLCache();
