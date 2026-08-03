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

describe("hard AI real-board self-play smoke", () => {
  it("plays six seeded games safely and develops more than one piece", () => {
    for (let seed = 0; seed < 6; seed += 1) {
      let pieces = createInitialPieces();
      let side = "white";
      const recentBySide = { white: [], black: [] };
      const movedBySide = { white: new Set(), black: new Set() };
      const moveCountBySide = { white: 0, black: 0 };

      const openingBoard = createBoard(pieces);
      const openings = orderMoves(
        openingBoard,
        generateLegalMovesForColor(openingBoard, side),
      ).filter((move) => openingBoard.getPieceAt(move.from)?.type !== "queen");
      const opening = openings[seed % openings.length];
      pieces = plainPieces(applyMoveForSearch(openingBoard, opening));
      side = opposite(side);

      for (let ply = 0; ply < 12; ply += 1) {
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
            recentAiPieceIds: recentBySide[side],
          },
        );
        expect(selected).not.toBeNull();
        expect(selected.search.forcedUnsafeFallback).toBe(false);
        expect(selected.search.teamPlayPolicy).toBe("squad-attack-v7");

        const legal = generateLegalMovesForColor(board, side);
        const move = findMatchingLegalMove(legal, selected);
        expect(move).not.toBeNull();
        const safety = assessImmediateMaterialSafety(board, move, side);
        expect(safety.safe).toBe(true);
        expect(safety.reason).not.toBe("queen-for-lower-piece-critical-blunder");

        movedBySide[side].add(move.pieceId);
        moveCountBySide[side] += 1;
        recentBySide[side].unshift(move.pieceId);
        recentBySide[side] = recentBySide[side].slice(0, 12);
        pieces = plainPieces(applyMoveForSearch(board, move));
        side = opposite(side);
      }

      for (const color of ["white", "black"]) {
        if (moveCountBySide[color] >= 3) {
          expect(movedBySide[color].size).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
});
