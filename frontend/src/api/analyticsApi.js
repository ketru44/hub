import { apiRequest } from "./apiClient";

const ANALYTICS_SESSION_ID_KEY = "recipebook.analyticsSessionId";

export function getAnalyticsSessionId() {
  const existingSessionId = sessionStorage.getItem(ANALYTICS_SESSION_ID_KEY);

  if (existingSessionId) {
    return existingSessionId;
  }

  const sessionId = crypto.randomUUID();
  sessionStorage.setItem(ANALYTICS_SESSION_ID_KEY, sessionId);

  return sessionId;
}

export function getRecipeInputType({ sourceUrl, rawText }) {
  if (sourceUrl && rawText) {
    return "url_and_manual";
  }

  return sourceUrl ? "url" : "manual";
}

export function mapStructureErrorType(error) {
  const errorTypes = {
    VALIDATION_ERROR: "invalid_input",
    INVALID_URL: "invalid_input",
    URL_NOT_ALLOWED: "invalid_input",
    URL_FETCH_FAILED: "url_fetch",
    AI_RATE_LIMITED: "rate_limited",
    AI_RESPONSE_INVALID: "schema_validation",
    AI_REQUEST_FAILED: "openai_request",
    NETWORK_ERROR: "network",
  };

  if (error instanceof Error && error.name === "AbortError") {
    return "timeout";
  }

  return errorTypes[error?.code] ?? "unknown";
}

export async function trackAnalyticsEvent(
  idToken,
  eventName,
  properties,
  sessionId = getAnalyticsSessionId(),
) {
  try {
    await apiRequest("/api/analytics/events", {
      method: "POST",
      idToken,
      body: { eventName, sessionId, properties },
    });
    return true;
  } catch {
    return false;
  }
}
