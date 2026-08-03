import { describe, expect, it } from "vitest";
import { createInitialPieces } from "../state/initialPosition.js";
import { chooseMoveWithVariantRules } from "./ai.worker.js";
import { chooseCompletedRootBaseline } from "./classicalRootBaseline.js";

function piece(id, type, color, x, y, z, hasMoved = false) {
  return {
    id,
    type,
    color,
    hasMoved,
    position: { x, y, z },
  };
}

function freeQueenPosition() {
  return [
    piece("white-king", "king", "white", 7, 0, 0),
    piece("white-queen", "queen", "white", 0, 3, 0),
    piece("black-king", "king", "black", 7, 7, 7),
    piece("black-rook", "rook", "black", 0, 7, 0, true),
    piece("black-pawn", "pawn", "black", 4, 6, 0),
  ];
}

describe("completed classical root baseline", () => {
  it("compares the complete safe root set before recursive search", () => {
    const move = chooseCompletedRootBaseline(createInitialPieces(), "white");

    expect(move).toMatchObject({
      pieceId: expect.any(String),
      search: {
        engine: "classical-completed-root-v1",
        completedDepth: 0,
        baselineCompleted: true,
        baselineCandidateCount: expect.any(Number),
        resultSource: "completed-static-root",
      },
    });
    expect(move.search.baselineCandidateCount).toBeGreaterThan(1);
  });

  it("keeps a winning queen capture when hard search is cancelled before depth one", () => {
    const move = chooseMoveWithVariantRules(
      freeQueenPosition(),
      "black",
      "hard",
      {
        isCancelled: () => true,
        now: () => 0,
        recentAiPieceIds: ["black-rook", "black-rook", "black-rook"],
      },
    );

    expect(move).toMatchObject({
      pieceId: "black-rook",
      capturedPieceId: "white-queen",
      to: { x: 0, y: 3, z: 0 },
      search: {
        baselineCompleted: true,
        resultSource: "completed-static-root",
        advancedCompletedDepth: 0,
        advancedAbortedBeforeCompletedDepth: true,
      },
    });
  });

  it("does not let hard mode become tactically weaker than easy on timeout", () => {
    const pieces = freeQueenPosition();
    const easy = chooseMoveWithVariantRules(pieces, "black", "easy", {
      maxDepth: 1,
      quiescenceDepth: 0,
      milliseconds: 60_000,
      now: () => 0,
    });
    const hard = chooseMoveWithVariantRules(pieces, "black", "hard", {
      isCancelled: () => true,
      now: () => 0,
    });

    expect(easy).toMatchObject({
      pieceId: "black-rook",
      capturedPieceId: "white-queen",
    });
    expect(hard).toMatchObject({
      pieceId: "black-rook",
      capturedPieceId: "white-queen",
    });
  });
});
