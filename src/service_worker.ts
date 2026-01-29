import {
  FetchJsonRequestMessage,
  FetchJsonResponseMessage,
  ScoreRequestMessage,
  ScoreResponseMessage,
} from "./messages";
import { scoreLocation } from "./scoring/location_scoring";
import { APP_LOG_PREFIX } from "./ui/brand";

chrome.runtime.onInstalled.addListener(() => {
  console.debug(`${APP_LOG_PREFIX} Service worker installed`);
});

async function handleScoreRequest(message: ScoreRequestMessage): Promise<ScoreResponseMessage> {
  const { requestId, locationName, settings } = message;
  return {
    type: "score_response",
    requestId,
    result: await scoreLocation(locationName, settings),
  };
}

async function handleFetchJsonRequest(
  message: FetchJsonRequestMessage,
): Promise<FetchJsonResponseMessage> {
  try {
    const response = await fetch(message.url);
    if (!response.ok) {
      return {
        type: "fetch_json_response",
        ok: false,
        status: response.status,
        error: response.statusText || `Request failed with ${response.status}`,
      };
    }
    return {
      type: "fetch_json_response",
      ok: true,
      status: response.status,
      data: await response.json(),
    };
  } catch (error) {
    return {
      type: "fetch_json_response",
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "score_request") {
    void handleScoreRequest(message)
      .then(sendResponse)
      .catch((error) => {
        console.error(`${APP_LOG_PREFIX} Score failed`, error);
        const response: ScoreResponseMessage = {
          type: "score_response",
          requestId: message.requestId,
          result: { status: "unknown", reason: "Score failed" },
        };
        sendResponse(response);
      });

    return true;
  }

  if (message.type === "fetch_json_request") {
    void handleFetchJsonRequest(message)
      .then(sendResponse)
      .catch((error) => {
        console.error(`${APP_LOG_PREFIX} Fetch failed`, error);
        const response: FetchJsonResponseMessage = {
          type: "fetch_json_response",
          ok: false,
          status: 0,
          error: "Fetch failed",
        };
        sendResponse(response);
      });

    return true;
  }
});
