import { normalizeEmployerDomain, normalizeEmployerName } from "../employer/normalize";

export type EmployerOverride = {
  companyNumber: string;
  companyName: string;
  updatedAt: number;
};

type EmployerOverrideStore = {
  byName: Record<string, EmployerOverride>;
  byDomain: Record<string, EmployerOverride>;
};

const OVERRIDES_KEY = "carbonrankEmployerOverrides";

function ensureStore(value: unknown): EmployerOverrideStore {
  if (value && typeof value === "object") {
    const store = value as EmployerOverrideStore;
    return {
      byName: store.byName ?? {},
      byDomain: store.byDomain ?? {},
    };
  }
  return { byName: {}, byDomain: {} };
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
