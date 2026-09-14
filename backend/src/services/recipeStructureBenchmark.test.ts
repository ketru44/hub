import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePercentile,
  parseBenchmarkCases,
  runBenchmarkCase,
  summarizeBenchmarkResults,
  type RecipeStructureBenchmarkCase,
  type RecipeStructureBenchmarkResult,
} from "./recipeStructureBenchmark.js";
import { RecipeStructureError } from "./recipeStructure.service.js";

const benchmarkCase: RecipeStructureBenchmarkCase = {
  id: "manual-test",
  category: "test",
  inputType: "manual",
  rawText: "감자 한 개를 삶는다.",
};

test("nearest-rank 방식으로 percentile과 summary를 계산한다", () => {
  const results: RecipeStructureBenchmarkResult[] = [
    {
      caseId: "1",
      inputType: "manual",
      success: true,
      schemaValid: true,
      latencyMs: 100,
      warningCount: 1,
    },
    {
      caseId: "2",
      inputType: "manual",
      success: true,
      schemaValid: true,
      latencyMs: 200,
      warningCount: 2,
    },
    {
      caseId: "3",
      inputType: "url",
      success: false,
      schemaValid: false,
      latencyMs: 300,
      warningCount: 0,
      errorType: "schema_validation",
    },
    {
      caseId: "4",
      inputType: "url_and_manual",
      success: false,
      schemaValid: false,
      latencyMs: 400,
      warningCount: 0,
      errorType: "openai_request",
    },
  ];

  assert.equal(calculatePercentile([400, 100, 300, 200], 0.5), 200);
  assert.deepEqual(summarizeBenchmarkResults(results), {
    totalCases: 4,
    successfulCases: 2,
    schemaValidCases: 2,
    schemaSuccessRate: 50,
    averageLatencyMs: 250,
    p50LatencyMs: 200,
    p95LatencyMs: 400,
    totalWarnings: 3,
    failureReasons: {
      schema_validation: 1,
      openai_request: 1,
    },
  });
});

test("실패 요청과 schema validation 실패를 분류해 기록한다", async () => {
  const timestamps = [10, 35, 50, 90];
  const now = () => timestamps.shift() ?? 90;
  const requestFailure = await runBenchmarkCase(
    benchmarkCase,
    async () => {
      throw new RecipeStructureError("AI_REQUEST_FAILED");
    },
    now,
  );
  const schemaFailure = await runBenchmarkCase(
    benchmarkCase,
    async () => {
      throw new RecipeStructureError("AI_RESPONSE_INVALID");
    },
    now,
  );

  assert.equal(requestFailure.errorType, "openai_request");
  assert.equal(requestFailure.latencyMs, 25);
  assert.equal(schemaFailure.errorType, "schema_validation");
  assert.equal(schemaFailure.latencyMs, 40);
});

test("fixture는 최소 20개와 input type별 필수값을 검증한다", () => {
  assert.throws(() => parseBenchmarkCases([]), /최소 20개/);
  assert.throws(
    () =>
      parseBenchmarkCases(
        Array.from({ length: 20 }, (_, index) => ({
          id: `case-${index}`,
          category: "test",
          inputType: index === 0 ? "url" : "manual",
          rawText: "테스트 레시피",
        })),
      ),
    /입력이 부족/,
  );
});
