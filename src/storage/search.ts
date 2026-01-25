import { ProxyJob, SearchQuery } from "../search/types";

export type SavedSearch = {
  id: string;
  label: string;
  query: SearchQuery;
  savedAt: number;
};

export type SavedJob = ProxyJob & {
  savedAt: number;
};

const SAVED_SEARCHES_KEY = "carbonrankSavedSearches";
const SAVED_JOBS_KEY = "carbonrankSavedJobs";

async function getLocalArray<T>(key: string): Promise<T[]> {
  const stored = await chrome.storage.local.get(key);
  const value = stored[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

async function setLocalArray<T>(key: string, value: T[]): Promise<void> {
  await chrome.storage.local.set({
    [key]: value,
  });
}

export async function getSavedSearches(): Promise<SavedSearch[]> {
  return getLocalArray<SavedSearch>(SAVED_SEARCHES_KEY);
}

export async function saveSearch(search: SavedSearch): Promise<void> {
  const current = await getSavedSearches();
  const next = [search, ...current.filter((item) => item.id !== search.id)];
  await setLocalArray(SAVED_SEARCHES_KEY, next);
}

export async function removeSearch(id: string): Promise<void> {
  const current = await getSavedSearches();
  await setLocalArray(
    SAVED_SEARCHES_KEY,
    current.filter((item) => item.id !== id),
  );
}

export async function getSavedJobs(): Promise<SavedJob[]> {
  return getLocalArray<SavedJob>(SAVED_JOBS_KEY);
}

export async function saveJob(job: SavedJob): Promise<void> {
  const current = await getSavedJobs();
  const next = [job, ...current.filter((item) => item.id !== job.id)];
  await setLocalArray(SAVED_JOBS_KEY, next);
}

export async function removeJob(id: string): Promise<void> {
  const current = await getSavedJobs();
  await setLocalArray(
    SAVED_JOBS_KEY,
    current.filter((item) => item.id !== id),
  );
}
