import assert from "node:assert/strict";
import test from "node:test";

import { formatAnalyticsSummary } from "./analyticsSummary.js";

test("ordered session Funnel count와 단계별 전환율을 출력한다", () => {
  const summary = formatAnalyticsSummary({
    inputStarted: 15,
    structureRequested: 14,
    structureSucceeded: 13,
    recipeSaved: 10,
  });

  assert.match(summary, /Input → Request:\s+93\.3%/);
  assert.match(summary, /Request → Success:\s+92\.9%/);
  assert.match(summary, /Success → Save:\s+76\.9%/);
});

test("표본이 없으면 전환율을 만들어내지 않는다", () => {
  const summary = formatAnalyticsSummary({
    inputStarted: 0,
    structureRequested: 0,
    structureSucceeded: 0,
    recipeSaved: 0,
  });

  assert.match(summary, /Not measured yet/);
  assert.doesNotMatch(summary, /NaN|Infinity/);
});
