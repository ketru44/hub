import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

export const ANALYTICS_EVENT_NAMES = [
  "recipe_input_started",
  "recipe_structure_requested",
  "recipe_structure_succeeded",
  "recipe_structure_failed",
  "recipe_result_edited",
  "recipe_saved",
] as const;

type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];
type AnalyticsProperty = string | number | boolean | null;
type AnalyticsProperties = Record<string, AnalyticsProperty>;

const INPUT_TYPES = ["manual", "url", "url_and_manual"] as const;
const STRUCTURE_ERROR_TYPES = [
  "invalid_input",
  "url_fetch",
  "rate_limited",
  "schema_validation",
  "openai_request",
  "timeout",
  "network",
  "unknown",
] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class AnalyticsEventValidationError extends Error {
  constructor() {
    super("ANALYTICS_EVENT_INVALID");
  }
}

export class AnalyticsUserNotFoundError extends Error {
  constructor() {
    super("ANALYTICS_USER_NOT_FOUND");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]) {
  const actualKeys = Object.keys(value);

  return (
    actualKeys.length === keys.length &&
    actualKeys.every((key) => keys.includes(key))
  );
}

function isInputType(value: unknown): value is (typeof INPUT_TYPES)[number] {
  return INPUT_TYPES.some((inputType) => inputType === value);
}

function normalizeLatency(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 600_000) {
    throw new AnalyticsEventValidationError();
  }

  return Math.round(value);
}

function parseProperties(
  eventName: AnalyticsEventName,
  value: unknown,
): AnalyticsProperties {
  if (!isRecord(value) || !isInputType(value.inputType)) {
    throw new AnalyticsEventValidationError();
  }

  if (
    eventName === "recipe_input_started" ||
    eventName === "recipe_structure_requested" ||
    eventName === "recipe_result_edited"
  ) {
    if (!hasExactKeys(value, ["inputType"])) {
      throw new AnalyticsEventValidationError();
    }

    return { inputType: value.inputType };
  }

  if (eventName === "recipe_structure_succeeded") {
    if (
      !hasExactKeys(value, ["inputType", "latencyMs", "warningCount"]) ||
      !Number.isSafeInteger(value.warningCount) ||
      (value.warningCount as number) < 0 ||
      (value.warningCount as number) > 1_000
    ) {
      throw new AnalyticsEventValidationError();
    }

    return {
      inputType: value.inputType,
      latencyMs: normalizeLatency(value.latencyMs),
      warningCount: value.warningCount as number,
    };
  }

  if (eventName === "recipe_structure_failed") {
    if (
      !hasExactKeys(value, ["inputType", "errorType", "latencyMs"]) ||
      !STRUCTURE_ERROR_TYPES.some((errorType) => errorType === value.errorType)
    ) {
      throw new AnalyticsEventValidationError();
    }

    return {
      inputType: value.inputType,
      errorType: value.errorType as string,
      latencyMs: normalizeLatency(value.latencyMs),
    };
  }

  if (
    !hasExactKeys(value, ["inputType", "wasEditedAfterAI"]) ||
    typeof value.wasEditedAfterAI !== "boolean"
  ) {
    throw new AnalyticsEventValidationError();
  }

  return {
    inputType: value.inputType,
    wasEditedAfterAI: value.wasEditedAfterAI,
  };
}

function parseEventRequest(value: unknown) {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["eventName", "sessionId", "properties"]) ||
    !ANALYTICS_EVENT_NAMES.some((eventName) => eventName === value.eventName) ||
    typeof value.sessionId !== "string" ||
    !UUID_PATTERN.test(value.sessionId)
  ) {
    throw new AnalyticsEventValidationError();
  }

  const eventName = value.eventName as AnalyticsEventName;

  return {
    eventName,
    sessionId: value.sessionId,
    properties: parseProperties(eventName, value.properties),
  };
}

export async function createAnalyticsEvent(
  pool: Pick<Pool, "query">,
  firebaseUid: string,
  request: unknown,
) {
  const event = parseEventRequest(request);
  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO analytics_events (
        id,
        user_id,
        session_id,
        event_name,
        properties
      )
      SELECT $1, users.id, $3, $4, $5
      FROM users
      WHERE users.firebase_uid = $2
      RETURNING id
    `,
    [
      randomUUID(),
      firebaseUid,
      event.sessionId,
      event.eventName,
      event.properties,
    ],
  );
  const storedEvent = result.rows[0];

  if (!storedEvent) {
    throw new AnalyticsUserNotFoundError();
  }

  return storedEvent;
}
