import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseBenchmarkCases,
  runBenchmarkCase,
  summarizeBenchmarkResults,
  type RecipeStructureBenchmarkSummary,
} from "../services/recipeStructureBenchmark.js";

function formatSummary(summary: RecipeStructureBenchmarkSummary) {
  const failureLines = Object.entries(summary.failureReasons)
    .map(([reason, count]) => `- ${reason}: ${count}`)
    .join("\n");

  return `# Recipe Structure Benchmark Summary

- Total: ${summary.totalCases}
- Success: ${summary.successfulCases}
- Schema valid: ${summary.schemaValidCases}
- Schema success rate: ${summary.schemaSuccessRate.toFixed(1)}%
- Average latency: ${summary.averageLatencyMs} ms
- p50 latency: ${summary.p50LatencyMs} ms
- p95 latency: ${summary.p95LatencyMs} ms
- Total warnings: ${summary.totalWarnings}

## Failure reasons

${failureLines || "- none"}

Latency는 OpenAI 요청 직전부터 응답 파싱과 도메인 검증 완료까지 모든 시도의 시간을 포함한다.
p50과 p95는 정렬한 latency에 nearest-rank 방식(ceil(p × N))을 적용한다.
`;
}

async function run() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY가 없어 benchmark를 실행할 수 없습니다.");
  }

  const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = path.resolve(sourceDirectory, "../../..");
  const fixturePath = path.join(
    repositoryRoot,
    "benchmarks/recipe-structure/fixtures/cases.json",
  );
  const resultsDirectory = path.join(
    repositoryRoot,
    "benchmarks/recipe-structure/results",
  );
  const fixtureValue: unknown = JSON.parse(await readFile(fixturePath, "utf8"));
  const benchmarkCases = parseBenchmarkCases(fixtureValue);
  const results = [];

  for (const benchmarkCase of benchmarkCases) {
    results.push(await runBenchmarkCase(benchmarkCase));
  }

  const summary = summarizeBenchmarkResults(results);
  const labelArgument = process.argv.find((argument) => argument.startsWith("--label="));
  const label = labelArgument?.slice("--label=".length) || "baseline";
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const filePrefix = `${label}-${timestamp}`;

  await mkdir(resultsDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(resultsDirectory, `${filePrefix}.json`),
      `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2)}\n`,
    ),
    writeFile(
      path.join(resultsDirectory, `${filePrefix}-summary.md`),
      formatSummary(summary),
    ),
  ]);

  console.log(formatSummary(summary));
  console.log(`Results: ${path.relative(repositoryRoot, resultsDirectory)}/${filePrefix}.*`);
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
