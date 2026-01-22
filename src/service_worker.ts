import { ScoreRequestMessage, ScoreResponseMessage } from "./messages";
import { scoreLocationOnly } from "./scoring/location_scoring";

chrome.runtime.onInstalled.addListener(() => {
  console.debug("[CarbonRank] Service worker installed");
});

async function handleScoreRequest(message: ScoreRequestMessage): Promise<ScoreResponseMessage> {
  const { requestId, locationName, settings } = message;
  return {
    type: "score_response",
    requestId,
    result: scoreLocationOnly(locationName, settings),
  };
}

chrome.runtime.onMessage.addListener((message: ScoreRequestMessage, _sender, sendResponse) => {
  if (!message || message.type !== "score_request") {
    return;
  }

  void handleScoreRequest(message)
    .then(sendResponse)
    .catch((error) => {
      console.error("[CarbonRank] Score failed", error);
      const response: ScoreResponseMessage = {
        type: "score_response",
        requestId: message.requestId,
        result: { status: "unknown", reason: "Score failed" },
      };
      sendResponse(response);
    });

  return true;
});
