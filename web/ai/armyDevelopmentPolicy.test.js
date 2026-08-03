import { describe, expect, it } from "vitest";
import { generateLegalMovesForColor } from "../../src/engine3d/index.ts";
import {
  analyzeArmyDevelopmentMove,
  combineTeamAndArmyAnalysis,
  createArmyDevelopmentBaseline,
} from "./armyDevelopmentPolicy.js";
import { createBoard } from "./searchEngine.js";
import { chooseTeamAwareRootCandidate } from "./teamPlayPolicy.js";
import { TEAM_PLAY_WEIGHTS } from "./teamPlayWeights.js";

function p(id, type, color, x, y, z, hasMoved = false) {
  return { id, type, color, position: { x, y, z }, hasMoved };
}

function quietMoveFor(board, pieceId) {
  return generateLegalMovesForColor(board, "white").find(
    (move) => move.pieceId === pieceId && !move.capturedPieceId,
  );
}

describe("whole-army development policy", () => {
  it("prefers activating an unused knight over another quiet queen move", () => {
    const board = createBoard([
      p("wk", "king", "white", 0, 0, 0),
      p("bk", "king", "black", 7, 7, 7),
      p("wq", "queen", "white", 3, 1, 1, true),
      p("wn", "knight", "white", 1, 0, 0),
      p("wb", "bishop", "white", 2, 0, 0),
      p("wp", "pawn", "white", 4, 1, 0),
    ]);
    const usage = { wq: 5 };
    const baseline = createArmyDevelopmentBaseline(board, "white", usage);
    const queenMove = quietMoveFor(board, "wq");
    const knightMove = quietMoveFor(board, "wn");

    expect(queenMove).toBeDefined();
    expect(knightMove).toBeDefined();
    const queen = analyzeArmyDevelopmentMove(
      board,
      queenMove,
      usage,
      baseline,
    );
    const knight = analyzeArmyDevelopmentMove(
      board,
      knightMove,
      usage,
      baseline,
    );

    expect(queen.queenArmyImbalance).toBe(true);
    expect(knight.activatesFreshUnit).toBe(true);
    expect(knight.score).toBeGreaterThan(queen.score);
  });

  it("feeds army imbalance into the existing tactical-safe queen discipline", () => {
    const combined = combineTeamAndArmyAnalysis(
      { score: 10, queenMonopoly: false, freshPiece: false },
      {
        score: -260,
        queenArmyImbalance: true,
        activatesFreshUnit: false,
      },
    );
    expect(combined.queenMonopoly).toBe(true);
    expect(combined.score).toBe(-250);
  });

  it("selects a fresh army unit across near-equal quiet root choices", () => {
    const repeatedQueen = {
      move: { pieceId: "wq" },
      searchScore: 100,
      team: {
        score: -200,
        forcing: false,
        tacticalCapture: false,
        queenMonopoly: true,
      },
    };
    const freshKnight = {
      move: { pieceId: "wn" },
      searchScore: 20,
      team: {
        score: 180,
        forcing: false,
        tacticalCapture: false,
        queenMonopoly: false,
        activatesFreshUnit: true,
      },
    };

    expect(
      chooseTeamAwareRootCandidate(
        repeatedQueen,
        freshKnight,
        TEAM_PLAY_WEIGHTS,
      ),
    ).toBe(freshKnight);
  });

  it("does not let diversity suppress a decisive tactical result", () => {
    const winningCapture = {
      move: { pieceId: "wr", capturedPieceId: "bq" },
      searchScore: 1_400,
      team: {
        score: -200,
        forcing: false,
        tacticalCapture: true,
        queenMonopoly: false,
      },
    };
    const quietFreshMove = {
      move: { pieceId: "wn" },
      searchScore: 40,
      team: {
        score: 240,
        forcing: false,
        tacticalCapture: false,
        queenMonopoly: false,
        activatesFreshUnit: true,
      },
    };

    expect(
      chooseTeamAwareRootCandidate(
        winningCapture,
        quietFreshMove,
        TEAM_PLAY_WEIGHTS,
      ),
    ).toBe(winningCapture);
  });
});
