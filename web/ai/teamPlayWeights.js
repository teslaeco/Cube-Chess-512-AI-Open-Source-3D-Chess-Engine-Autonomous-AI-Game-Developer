export const TEAM_PLAY_WEIGHTS = Object.freeze({
  id: "paired-coordination-v6",
  rootScoreWindow: 90,
  maxTeamBias: 180,
  repeatLinearPenalty: 52,
  repeatQuadraticPenalty: 34,
  switchPieceBonus: 24,
  newlyDefendedPartnerBonus: 34,
  movedPieceDefendedBonus: 28,
  mutualPairBonus: 72,
  supportsRecentPieceBonus: 54,
  activePieceDeltaBonus: 14,
  levelCoverageDeltaBonus: 10,
  undevelopedMinorBonus: 38,
  earlyMajorRepeatPenalty: 42,
  isolatedMovePenalty: 22,
  tacticalRepeatMultiplier: 0.2,
});

export const TEAM_PLAY_TRAINING_CANDIDATES = Object.freeze([
  Object.freeze({
    ...TEAM_PLAY_WEIGHTS,
    id: "paired-coordination-v6",
  }),
  Object.freeze({
    ...TEAM_PLAY_WEIGHTS,
    id: "balanced-v6",
    mutualPairBonus: 48,
    supportsRecentPieceBonus: 38,
    repeatLinearPenalty: 40,
    repeatQuadraticPenalty: 24,
  }),
  Object.freeze({
    ...TEAM_PLAY_WEIGHTS,
    id: "diversity-heavy-v6",
    switchPieceBonus: 46,
    repeatLinearPenalty: 74,
    repeatQuadraticPenalty: 52,
    mutualPairBonus: 42,
  }),
  Object.freeze({
    ...TEAM_PLAY_WEIGHTS,
    id: "mobility-heavy-v6",
    activePieceDeltaBonus: 28,
    levelCoverageDeltaBonus: 22,
    mutualPairBonus: 38,
    supportsRecentPieceBonus: 28,
  }),
]);
