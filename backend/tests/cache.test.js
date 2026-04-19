const cache = require('../services/cache');

beforeEach(() => cache.flush());

describe('cache — basic operations', () => {
  test('returns null for missing key', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  test('stores and retrieves a value', () => {
    cache.set('foo', { data: 42 }, 60);
    expect(cache.get('foo')).toEqual({ data: 42 });
  });

  test('returns null after TTL expires', () => {
    cache.set('short', 'hello', 0.001); // 1ms TTL
    return new Promise(resolve => setTimeout(() => {
      expect(cache.get('short')).toBeNull();
      resolve();
    }, 10));
  });

  test('del removes a key immediately', () => {
    cache.set('toDelete', 'value', 60);
    cache.del('toDelete');
    expect(cache.get('toDelete')).toBeNull();
  });

  test('flush clears all keys', () => {
    cache.set('a', 1, 60);
    cache.set('b', 2, 60);
    cache.flush();
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
  });

  test('lastUpdated returns ISO string after set', () => {
    cache.set('ts', 'x', 60);
    const ts = cache.lastUpdated('ts');
    expect(ts).not.toBeNull();
    expect(new Date(ts).toString()).not.toBe('Invalid Date');
  });

  test('lastUpdated returns null for missing key', () => {
    expect(cache.lastUpdated('nope')).toBeNull();
  });

  test('overwriting a key updates the value', () => {
    cache.set('k', 'first', 60);
    cache.set('k', 'second', 60);
    expect(cache.get('k')).toBe('second');
  });
});
