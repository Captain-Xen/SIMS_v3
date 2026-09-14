// Tiny in-memory TTL cache for hot, identical-for-all-users GET payloads.
// Keeps SQLite round-trips low under concurrent clients without any external
// middleware. Writers call bustCache() so data is never served stale after a
// mutation from the same process.

interface Entry {
  value: unknown
  expires: number
}

const MAX_ENTRIES = 64

const store = new Map<string, Entry>()

export function getCached<T>(key: string): T | null {
  const hit = store.get(key)
  if (!hit) return null
  if (Date.now() > hit.expires) {
    store.delete(key)
    return null
  }
  return hit.value as T
}

export function setCached(key: string, value: unknown, ttlMs: number) {
  // safety valve: keep the cache bounded in case keys ever proliferate
  if (!store.has(key) && store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value
    if (oldest !== undefined) store.delete(oldest)
  }
  store.set(key, { value, expires: Date.now() + ttlMs })
}

export function bustCache(prefix: string) {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k)
  }
}
