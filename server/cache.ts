export type CacheOptions = {
  ttlMs: number;
  maxSize: number;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export function createLruCache<T>(options: CacheOptions) {
  const store = new Map<string, CacheEntry<T>>();

  function get(key: string): T | null {
    const entry = store.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    store.delete(key);
    store.set(key, entry);
    return entry.value;
  }

  function set(key: string, value: T): void {
    if (store.has(key)) {
      store.delete(key);
    }
    store.set(key, {
      value,
      expiresAt: Date.now() + options.ttlMs,
    });

    while (store.size > options.maxSize) {
      const oldest = store.keys().next().value as string | undefined;
      if (!oldest) {
        break;
      }
      store.delete(oldest);
    }
  }

  return {
    get,
    set,
  };
}
