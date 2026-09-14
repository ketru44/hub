export interface AnalyticsFunnelCounts {
  inputStarted: number;
  structureRequested: number;
  structureSucceeded: number;
  recipeSaved: number;
}

function formatConversion(numerator: number, denominator: number) {
  return denominator === 0
    ? "Not measured yet"
    : `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export function formatAnalyticsSummary(funnel: AnalyticsFunnelCounts) {
  return `Recipe Funnel (ordered sessions)

Input Started:       ${funnel.inputStarted}
Structure Requested: ${funnel.structureRequested}
Structure Success:   ${funnel.structureSucceeded}
Recipe Saved:        ${funnel.recipeSaved}

Input → Request:     ${formatConversion(funnel.structureRequested, funnel.inputStarted)}
Request → Success:   ${formatConversion(funnel.structureSucceeded, funnel.structureRequested)}
Success → Save:      ${formatConversion(funnel.recipeSaved, funnel.structureSucceeded)}`;
}
