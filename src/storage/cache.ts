type CacheEntry = {
  lat: number;
  lng: number;
  updatedAt: number;
};

const CACHE_KEY = "carbonrankGeocodeCache";
const memoryCache = new Map<string, CacheEntry>();

export function getMemoryCache(postcode: string): CacheEntry | undefined {
  return memoryCache.get(postcode.toUpperCase());
}

export function setMemoryCache(postcode: string, entry: CacheEntry): void {
  memoryCache.set(postcode.toUpperCase(), entry);
}

export async function getCachedGeocode(postcode: string): Promise<CacheEntry | null> {
  const key = postcode.toUpperCase();
  const local = memoryCache.get(key);
  if (local) {
    return local;
  }

  const stored = await chrome.storage.local.get(CACHE_KEY);
  const cache = stored[CACHE_KEY] as Record<string, CacheEntry> | undefined;
  const entry = cache?.[key];
  if (entry) {
    memoryCache.set(key, entry);
    return entry;
  }

  return null;
}

export async function setCachedGeocode(postcode: string, entry: CacheEntry): Promise<void> {
  const key = postcode.toUpperCase();
  memoryCache.set(key, entry);

  const stored = await chrome.storage.local.get(CACHE_KEY);
  const cache = stored[CACHE_KEY] as Record<string, CacheEntry> | undefined;
  const nextCache = {
    ...(cache ?? {}),
    [key]: entry,
  };

  await chrome.storage.local.set({
    [CACHE_KEY]: nextCache,
  });
}
