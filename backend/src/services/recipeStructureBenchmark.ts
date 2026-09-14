import {
  RecipeStructureError,
  structureRecipe,
} from "./recipeStructure.service.js";
import type {
  RecipeSource,
  StructureRecipeResult,
} from "./recipeStructureContract.js";

export type BenchmarkInputType = "manual" | "url" | "url_and_manual";

export interface RecipeStructureBenchmarkCase {
  id: string;
  category: string;
  inputType: BenchmarkInputType;
  rawText?: string;
  collectedText?: string;
  source?: RecipeSource;
}

export interface RecipeStructureBenchmarkResult {
  caseId: string;
  inputType: BenchmarkInputType;
  success: boolean;
  schemaValid: boolean;
  latencyMs: number;
  warningCount: number;
  errorType?: "schema_validation" | "openai_request" | "unknown";
}

export interface RecipeStructureBenchmarkSummary {
  totalCases: number;
  successfulCases: number;
  schemaValidCases: number;
  schemaSuccessRate: number;
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  totalWarnings: number;
  failureReasons: Record<string, number>;
}

type StructureRecipe = (
  rawText: string,
  source: RecipeSource | null,
) => Promise<StructureRecipeResult>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSource(value: unknown): value is RecipeSource {
  return (
    isRecord(value) &&
    typeof value.url === "string" &&
    (typeof value.title === "string" || value.title === null) &&
    (typeof value.author === "string" || value.author === null)
  );
}

export function parseBenchmarkCases(
  value: unknown,
): RecipeStructureBenchmarkCase[] {
  if (!Array.isArray(value) || value.length < 20) {
    throw new Error("Benchmark fixture에는 최소 20개 case가 필요합니다.");
  }

  const caseIds = new Set<string>();

  return value.map((benchmarkCase, index) => {
    if (!isRecord(benchmarkCase)) {
      throw new Error(`Benchmark case ${index + 1} 형식이 올바르지 않습니다.`);
    }

    const { id, category, inputType, rawText, collectedText, source } = benchmarkCase;
    const isKnownInputType =
      inputType === "manual" ||
      inputType === "url" ||
      inputType === "url_and_manual";

    if (
      typeof id !== "string" ||
      !id.trim() ||
      caseIds.has(id) ||
      typeof category !== "string" ||
      !category.trim() ||
      !isKnownInputType ||
      (rawText !== undefined && typeof rawText !== "string") ||
      (collectedText !== undefined && typeof collectedText !== "string") ||
      (source !== undefined && !isSource(source))
    ) {
      throw new Error(`Benchmark case ${index + 1} 형식이 올바르지 않습니다.`);
    }

    if (
      (inputType === "manual" && !rawText?.trim()) ||
      (inputType === "url" && (!collectedText?.trim() || !source)) ||
      (inputType === "url_and_manual" &&
        (!rawText?.trim() || !collectedText?.trim() || !source))
    ) {
      throw new Error(`Benchmark case ${id} 입력이 부족합니다.`);
    }

    caseIds.add(id);

    return {
      id,
      category,
      inputType,
      rawText,
      collectedText,
      source,
    };
  });
}

export function calculatePercentile(values: number[], percentile: number) {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const nearestRank = Math.max(
    0,
    Math.ceil(percentile * sortedValues.length) - 1,
  );

  return sortedValues[nearestRank] ?? 0;
}

export function summarizeBenchmarkResults(
  results: RecipeStructureBenchmarkResult[],
): RecipeStructureBenchmarkSummary {
  const latencies = results.map((result) => result.latencyMs);
  const totalLatency = latencies.reduce((total, latency) => total + latency, 0);
  const failureReasons: Record<string, number> = {};

  for (const result of results) {
    if (result.errorType) {
      failureReasons[result.errorType] =
        (failureReasons[result.errorType] ?? 0) + 1;
    }
  }

  const schemaValidCases = results.filter((result) => result.schemaValid).length;

  return {
    totalCases: results.length,
    successfulCases: results.filter((result) => result.success).length,
    schemaValidCases,
    schemaSuccessRate:
      results.length === 0 ? 0 : (schemaValidCases / results.length) * 100,
    averageLatencyMs:
      results.length === 0 ? 0 : Math.round(totalLatency / results.length),
    p50LatencyMs: calculatePercentile(latencies, 0.5),
    p95LatencyMs: calculatePercentile(latencies, 0.95),
    totalWarnings: results.reduce(
      (total, result) => total + result.warningCount,
      0,
    ),
    failureReasons,
  };
}

function buildStructureInput(benchmarkCase: RecipeStructureBenchmarkCase) {
  if (benchmarkCase.inputType === "manual") {
    return benchmarkCase.rawText ?? "";
  }

  if (benchmarkCase.inputType === "url") {
    return benchmarkCase.collectedText ?? "";
  }

  return (
    `URL에서 수집한 레시피 내용:\n${benchmarkCase.collectedText}\n\n` +
    `사용자 보완 정보:\n${benchmarkCase.rawText}`
  );
}

export async function runBenchmarkCase(
  benchmarkCase: RecipeStructureBenchmarkCase,
  structure: StructureRecipe = structureRecipe,
  now: () => number = performance.now.bind(performance),
): Promise<RecipeStructureBenchmarkResult> {
  const startedAt = now();

  try {
    const result = await structure(
      buildStructureInput(benchmarkCase),
      benchmarkCase.source ?? null,
    );

    return {
      caseId: benchmarkCase.id,
      inputType: benchmarkCase.inputType,
      success: true,
      schemaValid: true,
      latencyMs: Math.max(0, Math.round(now() - startedAt)),
      warningCount: result.warnings.length,
    };
  } catch (error) {
    const errorType =
      error instanceof RecipeStructureError
        ? error.code === "AI_RESPONSE_INVALID"
          ? "schema_validation"
          : "openai_request"
        : "unknown";

    return {
      caseId: benchmarkCase.id,
      inputType: benchmarkCase.inputType,
      success: false,
      schemaValid: false,
      latencyMs: Math.max(0, Math.round(now() - startedAt)),
      warningCount: 0,
      errorType,
    };
  }
}
