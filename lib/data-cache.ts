// lib/data-cache.ts
// Module-level TTL cache that survives React re-renders and SPA navigations.
// Resets on hard refresh — appropriate for Supabase-backed session data.

type CacheEntry<T> = {
  data: T
  ts: number   // Date.now() when stored
  ttl: number  // ms until stale
}

const cache = new Map<string, CacheEntry<unknown>>()

/** Return cached value if still fresh, or null if missing/expired. */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.ts > entry.ttl) {
    cache.delete(key)
    return null
  }
  return entry.data
}

/** Store a value with the given TTL (milliseconds). */
export function setCached<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, ts: Date.now(), ttl })
}

/** Remove a specific cache entry. Call after mutations (add/edit/delete). */
export function invalidateCache(key: string): void {
  cache.delete(key)
}

/** Remove all cache entries whose key starts with prefix. */
export function invalidatePrefix(prefix: string): void {
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k)
  }
}
