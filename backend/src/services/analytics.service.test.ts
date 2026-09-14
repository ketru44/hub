import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import {
  AnalyticsEventValidationError,
  createAnalyticsEvent,
} from "./analytics.service.js";

function createQueryable(rows: Array<{ id: string }> = [{ id: "event-id" }]) {
  const calls: Array<{ text: string; values?: unknown[] }> = [];

  return {
    calls,
    database: {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, values });
        return { rows };
      },
    } as unknown as Pick<Pool, "query">,
  };
}

test("인증 사용자의 valid event를 정규화해 저장한다", async () => {
  const database = createQueryable();
  const event = await createAnalyticsEvent(database.database, "firebase-user", {
    eventName: "recipe_structure_succeeded",
    sessionId: "7d00f8f0-8829-40ad-9725-88f463503bbb",
    properties: {
      inputType: "url_and_manual",
      latencyMs: 1234.4,
      warningCount: 2,
    },
  });

  assert.deepEqual(event, { id: "event-id" });
  assert.match(database.calls[0]?.text ?? "", /INSERT INTO analytics_events/);
  assert.deepEqual(database.calls[0]?.values?.slice(1), [
    "firebase-user",
    "7d00f8f0-8829-40ad-9725-88f463503bbb",
    "recipe_structure_succeeded",
    {
      inputType: "url_and_manual",
      latencyMs: 1234,
      warningCount: 2,
    },
  ]);
});

test("unknown event와 event별 계약 밖 property를 거부한다", async () => {
  const database = createQueryable();

  await assert.rejects(
    createAnalyticsEvent(database.database, "firebase-user", {
      eventName: "save_recipe",
      sessionId: "7d00f8f0-8829-40ad-9725-88f463503bbb",
      properties: {},
    }),
    AnalyticsEventValidationError,
  );
  await assert.rejects(
    createAnalyticsEvent(database.database, "firebase-user", {
      eventName: "recipe_saved",
      sessionId: "7d00f8f0-8829-40ad-9725-88f463503bbb",
      properties: {
        inputType: "manual",
        wasEditedAfterAI: false,
        rawText: "저장하면 안 되는 원문",
      },
    }),
    AnalyticsEventValidationError,
  );

  assert.equal(database.calls.length, 0);
});

test("잘못된 session ID와 property 타입을 DB 연결 전에 거부한다", async () => {
  const database = createQueryable();

  await assert.rejects(
    createAnalyticsEvent(database.database, "firebase-user", {
      eventName: "recipe_structure_failed",
      sessionId: "not-a-uuid",
      properties: {
        inputType: "manual",
        errorType: "provider message",
        latencyMs: -1,
      },
    }),
    AnalyticsEventValidationError,
  );

  assert.equal(database.calls.length, 0);
});
