const PROXY_BASE_URL_STORAGE_KEY = "carbonrankProxyBaseUrl";

export const DEFAULT_PROXY_BASE_URL = "http://localhost:8787";

let cachedProxyBaseUrl: string | null = null;

function getChromeStorageSync(): chrome.storage.SyncStorageArea | undefined {
  if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.sync) {
    return undefined;
  }
  return chrome.storage.sync;
}

function getRuntimeError(): Error | undefined {
  if (typeof chrome === "undefined") {
    return undefined;
  }
  const lastError = chrome.runtime?.lastError;
  if (!lastError) {
    return undefined;
  }
  return lastError instanceof Error ? lastError : new Error(String(lastError));
}

function storageGet(storage: chrome.storage.SyncStorageArea): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    storage.get([PROXY_BASE_URL_STORAGE_KEY], (items) => {
      const runtimeError = getRuntimeError();
      if (runtimeError) {
        reject(runtimeError);
        return;
      }
      resolve(items);
    });
  });
}

function storageSet(
  storage: chrome.storage.SyncStorageArea,
  items: Record<string, unknown>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    storage.set(items, () => {
      const runtimeError = getRuntimeError();
      if (runtimeError) {
        reject(runtimeError);
        return;
      }
      resolve();
    });
  });
}

function storageRemove(storage: chrome.storage.SyncStorageArea, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    storage.remove(key, () => {
      const runtimeError = getRuntimeError();
      if (runtimeError) {
        reject(runtimeError);
        return;
      }
      resolve();
    });
  });
}

export function sanitizeProxyBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/\/+$/, "");
}

async function readStoredProxyBaseUrl(): Promise<string | null> {
  const storage = getChromeStorageSync();
  if (!storage) {
    return null;
  }
  try {
    const items = await storageGet(storage);
    const stored = items[PROXY_BASE_URL_STORAGE_KEY];
    if (typeof stored === "string" && stored.trim()) {
      return sanitizeProxyBaseUrl(stored);
    }
  } catch (error) {
    console.warn("Unable to read proxy base URL from storage", error);
  }
  return null;
}

export async function getProxyBaseUrl(): Promise<string> {
  if (cachedProxyBaseUrl) {
    return cachedProxyBaseUrl;
  }
  const stored = await readStoredProxyBaseUrl();
  const next = stored || DEFAULT_PROXY_BASE_URL;
  cachedProxyBaseUrl = next;
  return next;
}

export async function setProxyBaseUrl(rawValue: string): Promise<void> {
  const normalized = sanitizeProxyBaseUrl(rawValue);
  const storage = getChromeStorageSync();
  if (storage) {
    try {
      if (normalized) {
        await storageSet(storage, { [PROXY_BASE_URL_STORAGE_KEY]: normalized });
      } else {
        await storageRemove(storage, PROXY_BASE_URL_STORAGE_KEY);
      }
    } catch (error) {
      console.warn("Unable to update proxy base URL", error);
    }
  }
  cachedProxyBaseUrl = normalized || DEFAULT_PROXY_BASE_URL;
}

export function clearProxyBaseUrlCache(): void {
  cachedProxyBaseUrl = null;
}
