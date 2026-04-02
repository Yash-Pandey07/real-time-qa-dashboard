const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
  return entry.value;
}

function set(key, value, ttlSeconds = 60) {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000, cachedAt: new Date().toISOString() });
}

function lastUpdated(key) {
  const entry = store.get(key);
  return entry ? entry.cachedAt : null;
}

function flush() { store.clear(); }

module.exports = { get, set, lastUpdated, flush };
