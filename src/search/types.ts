import { ScoreResult } from "../scoring/types";

export type SearchQuery = {
  q: string;
  where: string;
  page: number;
  radiusKm?: number;
  remoteOnly: boolean;
};

export type ProxyJob = {
  id: string;
  title: string;
  company: string;
  redirect_url: string;
  created: string;
  description_snippet: string;
  location_name: string;
  lat: number | null;
  lon: number | null;
};

export type ProxySearchResponse = {
  results: ProxyJob[];
  count: number;
  page: number;
  cached?: boolean;
};

export type ScoredJob = {
  job: ProxyJob;
  score: ScoreResult;
  scoreValue: number | null;
};
