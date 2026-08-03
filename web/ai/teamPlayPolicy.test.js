import { describe, expect, it } from "vitest";
import { generateLegalMovesForColor } from "../../src/engine3d/index.ts";
import {
  analyzeTeamPlayMove,
  chooseTeamAwareRootCandidate,
  createTeamPlayBaseline,
  scoreTeamPlayFeatures,
} from "./teamPlayPolicy.js";
import { createBoard } from "./searchEngine.js";

function piece(id, type, color, x, y, z, hasMoved = false) {
  return { id, type, color, position: { x, y, z }, hasMoved };
}

function quietMove(board, side, pieceId) {
  return generateLegalMovesForColor(board, side).find(
    (move) => move.pieceId === pieceId && !move.capturedPieceId,
  );
}

function neutralFeatures(overrides = {}) {
  return {
    forcing: false,
    tacticalCapture: false,
    repeatStreak: 0,
    historyUseCount: 0,
    switchedPiece: false,
    freshPiece: false,
    pieceMonopoly: false,
    queenMonopoly: false,
    newlyDefendedPartners: 0,
    movedPieceDefended: false,
    mutualPair: false,
    supportsRecentPiece: false,
    coordinatedTargetDelta: 0,
    movedPieceJointAttack: false,
    undevelopedMinor: false,
    queenEarlyMove: false,
    earlyMajorRepeat: false,
    isolated: false,
    isolatedQueen: false,
    activePieceDelta: 0,
    levelCoverageDelta: 0,
    ...overrides,
  };
}

describe("squad team-play policy", () => {
  it("prefers a coordinated quiet switch over another equivalent rook move", () => {
    const current = {
      move: { pieceId: "black-rook" },
      searchScore: 120,
      team: { score: -240, forcing: false },
    };
    const candidate = {
      move: { pieceId: "black-bishop" },
      searchScore: 76,
      team: { score: 180, forcing: false },
    };

    expect(chooseTeamAwareRootCandidate(current, candidate)).toBe(candidate);
  });

  it("never replaces a clearly superior tactical result with cosmetic variety", () => {
    const tactical = {
      move: { pieceId: "black-rook", capturedPieceId: "white-queen" },
      searchScore: 900,
      team: { score: -180, forcing: false },
    };
    const quiet = {
      move: { pieceId: "black-knight" },
      searchScore: 180,
      team: { score: 260, forcing: false },
    };

    expect(chooseTeamAwareRootCandidate(tactical, quiet)).toBe(tactical);
  });

  it("penalizes a third quiet move of the same major piece", () => {
    const board = createBoard([
      piece("white-king", "king", "white", 7, 0, 0),
      piece("black-king", "king", "black", 7, 7, 7),
      piece("black-rook", "rook", "black", 0, 7, 0, true),
      piece("black-bishop", "bishop", "black", 2, 7, 0, false),
      piece("white-pawn", "pawn", "white", 4, 1, 0, true),
    ]);
    const recent = ["black-rook", "black-rook", "black-rook", "black-knight"];
    const baseline = createTeamPlayBaseline(board, "black", recent);
    const rookMove = quietMove(board, "black", "black-rook");
    const bishopMove = quietMove(board, "black", "black-bishop");

    expect(rookMove).toBeDefined();
    expect(bishopMove).toBeDefined();
    const rook = analyzeTeamPlayMove(board, rookMove, recent, undefined, baseline);
    const bishop = analyzeTeamPlayMove(board, bishopMove, recent, undefined, baseline);

    expect(rook.repeatStreak).toBe(3);
    expect(rook.pieceMonopoly).toBe(true);
    expect(rook.score).toBeLessThan(0);
    expect(bishop.switchedPiece).toBe(true);
    expect(bishop.freshPiece).toBe(true);
    expect(bishop.score).toBeGreaterThan(rook.score);
  });

  it("strongly penalizes queen monopoly across the recent history", () => {
    const queenMonopoly = scoreTeamPlayFeatures(
      neutralFeatures({
        historyUseCount: 3,
        pieceMonopoly: true,
        queenMonopoly: true,
        queenEarlyMove: true,
        isolatedQueen: true,
      }),
    );
    const squadMove = scoreTeamPlayFeatures(
      neutralFeatures({
        switchedPiece: true,
        freshPiece: true,
        mutualPair: true,
        supportsRecentPiece: true,
        coordinatedTargetDelta: 1,
        movedPieceJointAttack: true,
      }),
    );

    expect(queenMonopoly).toBeLessThan(-150);
    expect(squadMove).toBeGreaterThan(queenMonopoly);
  });

  it("does not classify every capture as a forcing bypass", () => {
    const board = createBoard([
      piece("white-king", "king", "white", 7, 0, 7),
      piece("black-king", "king", "black", 7, 7, 7),
      piece("black-queen", "queen", "black", 0, 4, 0, true),
      piece("white-pawn", "pawn", "white", 0, 3, 0, true),
    ]);
    const move = generateLegalMovesForColor(board, "black").find(
      (candidate) =>
        candidate.pieceId === "black-queen" &&
        candidate.capturedPieceId === "white-pawn",
    );

    expect(move).toBeDefined();
    const analysis = analyzeTeamPlayMove(
      board,
      move,
      ["black-queen", "black-bishop", "black-queen"],
    );
    expect(analysis.tacticalCapture).toBe(true);
    expect(analysis.forcing).toBe(false);
    expect(analysis.queenMonopoly).toBe(true);
  });

  it("rewards activating partners and building a joint attack", () => {
    const neutral = scoreTeamPlayFeatures(neutralFeatures());
    const coordinated = scoreTeamPlayFeatures(
      neutralFeatures({
        activePieceDelta: 1,
        levelCoverageDelta: 1,
        coordinatedTargetDelta: 1,
        movedPieceJointAttack: true,
      }),
    );
    const restricted = scoreTeamPlayFeatures(
      neutralFeatures({ activePieceDelta: -1, levelCoverageDelta: -1 }),
    );

    expect(coordinated).toBeGreaterThan(neutral);
    expect(neutral).toBeGreaterThan(restricted);
  });
});
