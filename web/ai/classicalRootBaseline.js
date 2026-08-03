import {
  evaluatePosition,
  generateLegalMovesForColor,
} from "../../src/engine3d/index.ts";
import {
  applyMoveForSearch,
  createBoard,
  evaluateBoard,
  opposite,
  orderMoves,
  serializeMove,
} from "./searchEngine.js";
import { filterRootMovesBySafety } from "./rootMoveSafety.js";
import { moveIdentity } from "./finalMoveSafety.js";
import {
  analyzeTeamPlayMove,
  chooseTeamAwareRootCandidate,
  createTeamPlayBaseline,
} from "./teamPlayPolicy.js";
import { TEAM_PLAY_WEIGHTS } from "./teamPlayWeights.js";

const BASELINE_MATE_SCORE = 10_000_000;

function terminalBaselineScore(status, perspective) {
  if (status.kind === "checkmate") {
    return status.winner === perspective
      ? BASELINE_MATE_SCORE
      : -BASELINE_MATE_SCORE;
  }
  if (status.kind === "stalemate") return 0;
  return null;
}

/**
 * Completes a deterministic comparison of every safe root move before the
 * expensive recursive search begins.
 *
 * This is deliberately independent of the Alpha-Beta clock. A 512-cell board
 * may prevent depth one from completing on a mobile device, but hard mode must
 * still return a move that was compared against all permitted root candidates,
 * never a provisional move inherited from move ordering.
 */
export function chooseCompletedRootBaseline(
  pieces,
  sideToMove,
  options = {},
) {
  const board = createBoard(pieces);
  const allLegal = generateLegalMovesForColor(board, sideToMove);
  if (!allLegal.length) return null;

  const allowedRootMoveIds = new Set(options.allowedRootMoveIds ?? []);
  const scopedLegal = allowedRootMoveIds.size
    ? allLegal.filter((move) => allowedRootMoveIds.has(moveIdentity(move)))
    : allLegal;
  if (!scopedLegal.length) return null;

  const safetyFiltered = filterRootMovesBySafety(board, scopedLegal, sideToMove);
  const candidates = safetyFiltered.length ? safetyFiltered : scopedLegal;
  const recent = options.recentAiPieceIds ?? [];
  const weights = options.teamPlayWeights ?? TEAM_PLAY_WEIGHTS;
  const teamBaseline = createTeamPlayBaseline(board, sideToMove, recent);

  let choice = null;
  for (const move of orderMoves(board, candidates)) {
    const next = applyMoveForSearch(board, move);
    const status = evaluatePosition(next, opposite(sideToMove));
    const terminal = terminalBaselineScore(status, sideToMove);
    const team = analyzeTeamPlayMove(
      board,
      move,
      recent,
      weights,
      teamBaseline,
    );
    const candidate = {
      move,
      searchScore:
        terminal ??
        evaluateBoard(next, sideToMove) +
          (status.kind === "check" ? 80 : 0),
      team,
    };
    choice = chooseTeamAwareRootCandidate(choice, candidate, weights);
  }

  if (!choice) return null;
  const serialized = serializeMove(choice.move);
  serialized.search = {
    engine: "classical-completed-root-v1",
    policy: "runtime-blunder-veto-v7",
    teamPlayPolicy: weights.id,
    completedDepth: 0,
    nodes: candidates.length,
    score: Number.isFinite(choice.searchScore) ? choice.searchScore : null,
    baselineCompleted: true,
    baselineCandidateCount: candidates.length,
    baselineSafetyFilteredCount: safetyFiltered.length,
    resultSource: "completed-static-root",
    teamPlayScore: choice.team.score,
    teamPlayRepeatStreak: choice.team.repeatStreak ?? 0,
    teamPlayHistoryUseCount: choice.team.historyUseCount ?? 0,
    teamPlaySwitchedPiece: Boolean(choice.team.switchedPiece),
    teamPlayFreshPiece: Boolean(choice.team.freshPiece),
    teamPlayMutualPair: Boolean(choice.team.mutualPair),
    teamPlaySupportsRecentPiece: Boolean(choice.team.supportsRecentPiece),
    teamPlayNewlyDefendedPartners: choice.team.newlyDefendedPartners ?? 0,
    teamPlayCoordinatedTargetDelta: choice.team.coordinatedTargetDelta ?? 0,
    teamPlayMovedPieceJointAttack: Boolean(choice.team.movedPieceJointAttack),
    teamPlayQueenMonopoly: Boolean(choice.team.queenMonopoly),
  };
  return serialized;
}
