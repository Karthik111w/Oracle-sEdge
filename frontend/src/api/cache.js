// Small read-through cache for slow API calls (each analysis hits yfinance).
// Memory first, then sessionStorage so a reload within the TTL is instant.
const memory = new Map();
const inflight = new Map();

function readSession(key, ttlMs) {
  try {
    const raw = sessionStorage.getItem(`cache:${key}`);
    if (!raw) return undefined;
    const { at, value } = JSON.parse(raw);
    return Date.now() - at < ttlMs ? value : undefined;
  } catch {
    return undefined;
  }
}

function writeSession(key, value) {
  try {
    sessionStorage.setItem(`cache:${key}`, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // Storage full or unavailable; the memory cache still works.
  }
}

export function peekCached(key, ttlMs) {
  return memory.get(key) ?? readSession(key, ttlMs);
}

export function cached(key, load, ttlMs = 15 * 60 * 1000) {
  const hit = peekCached(key, ttlMs);
  if (hit !== undefined) return Promise.resolve(hit);
  if (inflight.has(key)) return inflight.get(key);

  const promise = load()
    .then((value) => {
      memory.set(key, value);
      writeSession(key, value);
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}
