import "dotenv/config";

import { databasePool } from "../database.js";
import { formatAnalyticsSummary } from "../services/analyticsSummary.js";

type CountRow = { name: string; count: number };
type FunnelRow = {
  input_started: number;
  structure_requested: number;
  structure_succeeded: number;
  recipe_saved: number;
};

async function run() {
  try {
    const [eventCounts, inputTypeCounts, funnelResult] = await Promise.all([
      databasePool.query<CountRow>(`
        SELECT event_name AS name, COUNT(*)::integer AS count
        FROM analytics_events
        GROUP BY event_name
        ORDER BY event_name
      `),
      databasePool.query<CountRow>(`
        SELECT properties ->> 'inputType' AS name, COUNT(*)::integer AS count
        FROM analytics_events
        WHERE event_name = 'recipe_structure_requested'
        GROUP BY properties ->> 'inputType'
        ORDER BY name
      `),
      databasePool.query<FunnelRow>(`
        WITH first_events AS (
          SELECT
            session_id,
            MIN(created_at) FILTER (
              WHERE event_name = 'recipe_input_started'
            ) AS input_started_at,
            MIN(created_at) FILTER (
              WHERE event_name = 'recipe_structure_requested'
            ) AS structure_requested_at,
            MIN(created_at) FILTER (
              WHERE event_name = 'recipe_structure_succeeded'
            ) AS structure_succeeded_at,
            MIN(created_at) FILTER (
              WHERE event_name = 'recipe_saved'
            ) AS recipe_saved_at
          FROM analytics_events
          GROUP BY session_id
        )
        SELECT
          COUNT(*) FILTER (
            WHERE input_started_at IS NOT NULL
          )::integer AS input_started,
          COUNT(*) FILTER (
            WHERE structure_requested_at >= input_started_at
          )::integer AS structure_requested,
          COUNT(*) FILTER (
            WHERE structure_requested_at >= input_started_at
              AND structure_succeeded_at >= structure_requested_at
          )::integer AS structure_succeeded,
          COUNT(*) FILTER (
            WHERE structure_requested_at >= input_started_at
              AND structure_succeeded_at >= structure_requested_at
              AND recipe_saved_at >= structure_succeeded_at
          )::integer AS recipe_saved
        FROM first_events
      `),
    ]);
    const funnel = funnelResult.rows[0] ?? {
      input_started: 0,
      structure_requested: 0,
      structure_succeeded: 0,
      recipe_saved: 0,
    };

    console.log("Event Count");
    for (const row of eventCounts.rows) {
      console.log(`${row.name}: ${row.count}`);
    }

    console.log("\nStructure Requests by Input Type");
    for (const row of inputTypeCounts.rows) {
      console.log(`${row.name}: ${row.count}`);
    }

    console.log(`\n${formatAnalyticsSummary({
      inputStarted: funnel.input_started,
      structureRequested: funnel.structure_requested,
      structureSucceeded: funnel.structure_succeeded,
      recipeSaved: funnel.recipe_saved,
    })}`);
  } finally {
    await databasePool.end();
  }
}

run().catch((error: unknown) => {
  console.error("Analytics summary를 조회하지 못했습니다.", error);
  process.exitCode = 1;
});
