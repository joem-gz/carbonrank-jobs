import { normalizeEmployerDomain, normalizeEmployerName } from "../employer/normalize";

export type EmployerOverride = {
  companyNumber: string;
  companyName: string;
  updatedAt: number;
};

type EmployerOverrideStore = {
  byName: Record<string, EmployerOverride>;
  byDomain: Record<string, EmployerOverride>;
  byPoster: Record<string, EmployerOverride>;
};

const OVERRIDES_KEY = "carbonrankEmployerOverrides";

function ensureStore(value: unknown): EmployerOverrideStore {
  if (value && typeof value === "object") {
    const store = value as EmployerOverrideStore;
    return {
      byName: store.byName ?? {},
      byDomain: store.byDomain ?? {},
      byPoster: store.byPoster ?? {},
    };
  }
  return { byName: {}, byDomain: {}, byPoster: {} };
}

async function loadStore(): Promise<EmployerOverrideStore> {
  const stored = await chrome.storage.local.get(OVERRIDES_KEY);
  return ensureStore(stored[OVERRIDES_KEY]);
}

async function saveStore(store: EmployerOverrideStore): Promise<void> {
  await chrome.storage.local.set({
    [OVERRIDES_KEY]: store,
  });
}

export async function getEmployerOverride(
  name: string,
  domain?: string,
): Promise<EmployerOverride | null> {
  const store = await loadStore();
  if (domain) {
    const key = normalizeEmployerDomain(domain);
    if (key && store.byDomain[key]) {
      return store.byDomain[key];
    }
  }

  const nameKey = normalizeEmployerName(name);
  if (nameKey && store.byName[nameKey]) {
    return store.byName[nameKey];
  }
  return null;
}

function buildPosterKey(
  posterName: string,
  siteDomain: string,
  jobId?: string,
): string {
  const domainKey = normalizeEmployerDomain(siteDomain);
  const posterKey = normalizeEmployerName(posterName);
  const jobKey = jobId ? jobId.trim().toLowerCase() : "";
  return [domainKey, posterKey, jobKey].filter(Boolean).join("|");
}

export async function getEmployerOverrideForPoster(
  posterName: string,
  siteDomain: string,
  jobId?: string,
): Promise<EmployerOverride | null> {
  const store = await loadStore();
  const key = buildPosterKey(posterName, siteDomain, jobId);
  return key && store.byPoster[key] ? store.byPoster[key] : null;
}

export async function setEmployerOverride(
  name: string,
  override: EmployerOverride,
  domain?: string,
): Promise<void> {
  const store = await loadStore();
  const nameKey = normalizeEmployerName(name);
  if (nameKey) {
    store.byName[nameKey] = override;
  }
  if (domain) {
    const domainKey = normalizeEmployerDomain(domain);
    if (domainKey) {
      store.byDomain[domainKey] = override;
    }
  }
  await saveStore(store);
}

export async function setEmployerOverrideForPoster(
  posterName: string,
  siteDomain: string,
  override: EmployerOverride,
  jobId?: string,
): Promise<void> {
  const store = await loadStore();
  const key = buildPosterKey(posterName, siteDomain, jobId);
  if (key) {
    store.byPoster[key] = override;
  }
  await saveStore(store);
}

export async function clearEmployerOverride(name: string, domain?: string): Promise<void> {
  const store = await loadStore();
  const nameKey = normalizeEmployerName(name);
  if (nameKey) {
    delete store.byName[nameKey];
  }
  if (domain) {
    const domainKey = normalizeEmployerDomain(domain);
    if (domainKey) {
      delete store.byDomain[domainKey];
    }
  }
  await saveStore(store);
}

export async function clearEmployerOverrideForPoster(
  posterName: string,
  siteDomain: string,
  jobId?: string,
): Promise<void> {
  const store = await loadStore();
  const key = buildPosterKey(posterName, siteDomain, jobId);
  if (key) {
    delete store.byPoster[key];
  }
  await saveStore(store);
}
