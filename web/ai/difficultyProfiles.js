export const AI_DIFFICULTY_PROFILES = Object.freeze({
  easy: Object.freeze({
    id: "easy",
    engine: "classical-basic",
    maxDepth: 1,
    quiescenceDepth: 1,
    searchMilliseconds: 120,
    watchdogMilliseconds: 2_500,
  }),
  medium: Object.freeze({
    id: "medium",
    engine: "classical-basic",
    maxDepth: 2,
    quiescenceDepth: 2,
    searchMilliseconds: 700,
    watchdogMilliseconds: 6_000,
  }),
  hard: Object.freeze({
    id: "hard",
    engine: "classical-3d-advanced",
    maxDepth: 4,
    quiescenceDepth: 4,
    searchMilliseconds: 2_800,
    // The completed-root baseline runs before Alpha-Beta. The old global
    // 8-second watchdog could discard a valid hard result and execute the first
    // legal move instead, making hard look weaker than easy.
    watchdogMilliseconds: 18_000,
  }),
});

export function normalizeDifficulty(value) {
  return Object.hasOwn(AI_DIFFICULTY_PROFILES, value) ? value : "easy";
}

export function getDifficultyProfile(value) {
  return AI_DIFFICULTY_PROFILES[normalizeDifficulty(value)];
}
