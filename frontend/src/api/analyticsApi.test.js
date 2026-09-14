import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAnalyticsSessionId,
  getRecipeInputType,
  mapStructureErrorType,
  trackAnalyticsEvent,
} from "./analyticsApi";

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("analyticsApi", () => {
  it("tab session UUID를 재사용하고 입력 유형을 구분한다", () => {
    const sessionId = getAnalyticsSessionId();

    expect(getAnalyticsSessionId()).toBe(sessionId);
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(getRecipeInputType({ sourceUrl: null, rawText: "recipe" })).toBe("manual");
    expect(getRecipeInputType({ sourceUrl: "https://example.com", rawText: null })).toBe("url");
    expect(getRecipeInputType({ sourceUrl: "https://example.com", rawText: "note" })).toBe("url_and_manual");
  });

  it("Firebase ID 토큰과 event 계약으로 ingest API를 호출한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "event-id" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      trackAnalyticsEvent(
        "firebase-token",
        "recipe_saved",
        { inputType: "manual", wasEditedAfterAI: true },
        "7d00f8f0-8829-40ad-9725-88f463503bbb",
      ),
    ).resolves.toBe(true);

    const [path, request] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/analytics/events");
    expect(request.method).toBe("POST");
    expect(request.headers.get("Authorization")).toBe("Bearer firebase-token");
    expect(JSON.parse(request.body)).toEqual({
      eventName: "recipe_saved",
      sessionId: "7d00f8f0-8829-40ad-9725-88f463503bbb",
      properties: { inputType: "manual", wasEditedAfterAI: true },
    });
  });

  it("Analytics 전송 실패를 product 실패로 전파하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(
      trackAnalyticsEvent(
        "firebase-token",
        "recipe_input_started",
        { inputType: "manual" },
        "7d00f8f0-8829-40ad-9725-88f463503bbb",
      ),
    ).resolves.toBe(false);
  });

  it("안정적인 API error code만 구조화 실패 범주로 변환한다", () => {
    expect(mapStructureErrorType({ code: "URL_FETCH_FAILED" })).toBe("url_fetch");
    expect(mapStructureErrorType({ code: "AI_RESPONSE_INVALID" })).toBe("schema_validation");
    expect(mapStructureErrorType({ code: "NETWORK_ERROR" })).toBe("network");
    expect(mapStructureErrorType(new Error("원문 메시지"))).toBe("unknown");
  });
});
