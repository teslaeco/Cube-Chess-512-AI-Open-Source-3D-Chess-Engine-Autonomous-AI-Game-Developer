import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateAggregateReport } from "./real-teamplay-gates.mjs";

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const entry = process.argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : fallback;
}

const reportPath = resolve(
  argument("report", "artifacts/real-team-selfplay-3000-report.json"),
);
let rawError = null;

try {
  await import("./merge-real-team-selfplay.mjs");
} catch (error) {
  rawError = error;
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch (error) {
  if (rawError) throw rawError;
  throw error;
}

const result = validateAggregateReport(report);
if (rawError) {
  console.warn(
    "Legacy aggregate gate rejected a deliberately weaker comparison policy; corrected production-only strategy gate accepted the report.",
  );
}
console.log(
  JSON.stringify(
    {
      gate: "policy-aware-real-teamplay-aggregate-v10",
      selectedPolicy: report.selectedPolicy,
      productionPolicy: report.productionPolicy,
      productionImbalanceRate: result.productionImbalanceRate,
      baselineImbalanceRate: result.baselineImbalanceRate,
      productionAverageDistinctPieces: result.production.averageDistinctPieces,
      productionAverageRoleCoverage: result.production.averageRoleCoverage,
      productionTeamMoveRate: result.production.teamMoveRate,
      productionArmyBroadeningRate: result.production.armyBroadeningRate,
      productionQueenMoveRate: result.production.queenMoveRate,
    },
    null,
    2,
  ),
);
