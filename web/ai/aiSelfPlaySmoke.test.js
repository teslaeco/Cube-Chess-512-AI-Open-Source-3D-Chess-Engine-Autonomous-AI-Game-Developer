import { describe, expect, it } from "vitest";
import {
  evaluatePosition,
  generateLegalMovesForColor,
} from "../../src/engine3d/index.ts";
import { createInitialPieces } from "../state/initialPosition.js";
import { chooseMoveWithVariantRules } from "./ai.worker.js";
import {
  assessImmediateMaterialSafety,
  findMatchingLegalMove,
} from "./finalMoveSafety.js";
import {
  applyMoveForSearch,
  createBoard,
  opposite,
  orderMoves,
} from "./searchEngine.js";

function plainPieces(board) {
  return board.getAllPieces().map((piece) => ({
    id: piece.id,
    type: piece.type,
    color: piece.color,
    hasMoved: Boolean(piece.hasMoved),
    position: {
      x: piece.position.x,
      y: piece.position.y,
      z: piece.position.z,
    },
  }));
}

describe("hard AI self-play smoke", () => {
  it("plays four seeded short games without an accepted immediate material blunder", () => {
    for (let seed = 0; seed < 4; seed += 1) {
      let pieces = createInitialPieces();
      let side = "white";

      // Seed each game with a different legal opening so deterministic hard-vs-
      // hard smoke tests cover more than one identical principal variation.
      const openingBoard = createBoard(pieces);
      const openings = orderMoves(
        openingBoard,
        generateLegalMovesForColor(openingBoard, side),
      );
      const opening = openings[seed % openings.length];
      pieces = plainPieces(applyMoveForSearch(openingBoard, opening));
      side = opposite(side);

      for (let ply = 0; ply < 8; ply += 1) {
        const board = createBoard(pieces);
        const status = evaluatePosition(board, side);
        if (status.kind !== "ongoing" && status.kind !== "check") break;

        const selected = chooseMoveWithVariantRules(
          pieces,
          side,
          "hard",
          {
            maxDepth: 1,
            quiescenceDepth: 0,
            milliseconds: 60_000,
            now: () => 0,
            transpositionEntries: 2_000,
          },
        );
        expect(selected).not.toBeNull();
        expect(selected.search.forcedUnsafeFallback).toBe(false);

        const legal = generateLegalMovesForColor(board, side);
        const move = findMatchingLegalMove(legal, selected);
        expect(move).not.toBeNull();
        expect(assessImmediateMaterialSafety(board, move, side).safe).toBe(true);

        pieces = plainPieces(applyMoveForSearch(board, move));
        side = opposite(side);
      }
    }
  });
});
