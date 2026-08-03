import { describe, expect, it } from "vitest";
import { generateLegalMovesForColor } from "../../src/engine3d/index.ts";
import { enforceFinalWorkerSafety } from "./ai.worker.js";
import {
  assessImmediateMaterialSafety,
  findMatchingLegalMove,
} from "./finalMoveSafety.js";
import { createBoard, serializeMove } from "./searchEngine.js";

function piece(id, type, color, x, y, z, hasMoved = false) {
  return { id, type, color, position: { x, y, z }, hasMoved };
}

describe("critical queen exchange regression", () => {
  it("replaces a selected queen-for-knight blunder with a safe legal move", () => {
    const pieces = [
      piece("white-king", "king", "white", 7, 0, 7),
      piece("black-king", "king", "black", 7, 7, 7),
      piece("black-queen", "queen", "black", 0, 4, 0, true),
      piece("black-rook", "rook", "black", 3, 7, 0, true),
      piece("black-bishop", "bishop", "black", 5, 6, 1, false),
      piece("white-knight", "knight", "white", 0, 3, 0, true),
      piece("white-rook", "rook", "white", 0, 0, 0, true),
      piece("white-pawn", "pawn", "white", 6, 1, 0, true),
    ];
    const board = createBoard(pieces);
    const legal = generateLegalMovesForColor(board, "black");
    const queenTrade = legal.find(
      (move) =>
        move.pieceId === "black-queen" &&
        move.capturedPieceId === "white-knight",
    );

    expect(queenTrade).toBeDefined();
    expect(assessImmediateMaterialSafety(board, queenTrade, "black")).toMatchObject({
      safe: false,
      reason: "queen-for-lower-piece-critical-blunder",
    });

    const selected = enforceFinalWorkerSafety(
      pieces,
      "black",
      "hard",
      serializeMove(queenTrade),
      {
        maxDepth: 1,
        quiescenceDepth: 0,
        milliseconds: 60_000,
        now: () => 0,
        transpositionEntries: 2_000,
        recentAiPieceIds: ["black-queen", "black-rook", "black-queen"],
      },
    );

    expect(selected).not.toBeNull();
    expect(selected.search.safetyVetoApplied).toBe(true);
    expect(selected.search.forcedUnsafeFallback).toBe(false);
    const replacement = findMatchingLegalMove(legal, selected);
    expect(replacement).not.toBeNull();
    expect(replacement).not.toEqual(queenTrade);
    expect(assessImmediateMaterialSafety(board, replacement, "black").safe).toBe(true);
  });
});
