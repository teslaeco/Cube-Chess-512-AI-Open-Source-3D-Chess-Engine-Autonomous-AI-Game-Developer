export async function executeAiRuntimePlan({
  snapshot,
  runtimePlan,
  runAttempt,
  restartWorker,
}) {
  const attempts = [];
  const primary = await runAttempt(
    snapshot,
    runtimePlan.difficulty,
    runtimePlan.primary,
  );
  attempts.push({ difficulty: runtimePlan.difficulty, ...primary });
  if (primary.move) {
    return { move: primary.move, usedEmergency: false, attempts };
  }

  restartWorker({ preserveHistory: true });
  const emergency = await runAttempt(
    snapshot,
    runtimePlan.emergencyDifficulty,
    runtimePlan.emergency,
  );
  attempts.push({
    difficulty: runtimePlan.emergencyDifficulty,
    ...emergency,
  });
  return {
    move: emergency.move ?? null,
    usedEmergency: true,
    attempts,
  };
}
