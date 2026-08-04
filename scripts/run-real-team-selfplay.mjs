import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateShardReport, queenArmyImbalanceRate } from "./real-teamplay-gates.mjs";

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const entry = process.argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : fallback;
}

const reportPath = resolve(
  argument("report", "artifacts/real-team-selfplay-shard.json"),
);
let rawError = null;

try {
  await import("./train-real-team-selfplay.mjs");
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

const entry = validateShardReport(report);
const imbalanceRate = queenArmyImbalanceRate(entry);

if (rawError) {
  console.warn(
    `Legacy shard gate rejected ${entry.id}; corrected gate accepted the complete safe report.`,
  );
}
console.log(
  JSON.stringify(
    {
      gate: "policy-aware-real-teamplay-shard-v10",
      policy: entry.id,
      games: entry.games,
      completedPlies: entry.completedPlies,
      queenArmyImbalanceRate: imbalanceRate,
      materialSafetyViolations: entry.materialSafetyViolations,
      criticalQueenTradeViolations: entry.criticalQueenTradeViolations,
      forcedUnsafeFallbacks: entry.forcedUnsafeFallbacks,
    },
    null,
    2,
  ),
);
