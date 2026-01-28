import { ScoreResult } from "./scoring/types";
import { Settings } from "./storage/settings";

export type ScoreRequestMessage = {
  type: "score_request";
  requestId: string;
  locationName: string;
  settings: Settings;
};

export type ScoreResponseMessage = {
  type: "score_response";
  requestId: string;
  result: ScoreResult;
};

export type FetchJsonRequestMessage = {
  type: "fetch_json_request";
  url: string;
};

export type FetchJsonResponseMessage = {
  type: "fetch_json_response";
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};
