const SHARED_TEAM_PLAY_WEIGHTS = Object.freeze({
  rootScoreWindow: 90,
  maxTeamBias: 180,
  switchPieceBonus: 24,
  newlyDefendedPartnerBonus: 34,
  movedPieceDefendedBonus: 28,
  undevelopedMinorBonus: 38,
  earlyMajorRepeatPenalty: 42,
  isolatedMovePenalty: 22,
  tacticalRepeatMultiplier: 0.2,
});

const BALANCED_V6 = Object.freeze({
  ...SHARED_TEAM_PLAY_WEIGHTS,
  id: "balanced-v6",
  repeatLinearPenalty: 40,
  repeatQuadraticPenalty: 24,
  mutualPairBonus: 48,
  supportsRecentPieceBonus: 38,
  activePieceDeltaBonus: 14,
  levelCoverageDeltaBonus: 10,
});

const MOBILITY_HEAVY_V6 = Object.freeze({
  ...SHARED_TEAM_PLAY_WEIGHTS,
  id: "mobility-heavy-v6",
  repeatLinearPenalty: 52,
  repeatQuadraticPenalty: 34,
  mutualPairBonus: 38,
  supportsRecentPieceBonus: 28,
  activePieceDeltaBonus: 28,
  levelCoverageDeltaBonus: 22,
});

const DIVERSITY_HEAVY_V6 = Object.freeze({
  ...SHARED_TEAM_PLAY_WEIGHTS,
  id: "diversity-heavy-v6",
  switchPieceBonus: 46,
  repeatLinearPenalty: 74,
  repeatQuadraticPenalty: 52,
  mutualPairBonus: 42,
  supportsRecentPieceBonus: 28,
  activePieceDeltaBonus: 14,
  levelCoverageDeltaBonus: 10,
});

const PAIRED_COORDINATION_V6 = Object.freeze({
  ...SHARED_TEAM_PLAY_WEIGHTS,
  id: "paired-coordination-v6",
  repeatLinearPenalty: 52,
  repeatQuadraticPenalty: 34,
  mutualPairBonus: 72,
  supportsRecentPieceBonus: 54,
  activePieceDeltaBonus: 14,
  levelCoverageDeltaBonus: 10,
});

export const TEAM_PLAY_WEIGHTS = BALANCED_V6;

export const TEAM_PLAY_TRAINING_CANDIDATES = Object.freeze([
  BALANCED_V6,
  MOBILITY_HEAVY_V6,
  DIVERSITY_HEAVY_V6,
  PAIRED_COORDINATION_V6,
]);
