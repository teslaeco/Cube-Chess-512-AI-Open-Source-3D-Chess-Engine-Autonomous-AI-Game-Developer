import { describe, expect, it } from "vitest";
import { generateLegalMovesForColor } from "../../src/engine3d/index.ts";
import { createInitialPieces } from "../state/initialPosition.js";
import { chooseAdvancedMove } from "./advancedSearch.js";
import {
  chooseMoveWithVariantRules,
  enforceFinalWorkerSafety,
} from "./ai.worker.js";
import { createBoard, serializeMove } from "./searchEngine.js";

function piece(id, type, color, x, y, z, hasMoved = false) {
  return { id, type, color, position: { x, y, z }, hasMoved };
}

function unsafeQueenForPawnPosition() {
  return [
    piece("white-king", "king", "white", 7, 0, 7),
    piece("black-king", "king", "black", 7, 7, 7),
    piece("black-queen", "queen", "black", 0, 4, 0, true),
    piece("black-knight", "knight", "black", 4, 5, 4, true),
    piece("white-pawn", "pawn", "white", 0, 3, 0, true),
    piece("white-rook", "rook", "white", 0, 0, 0, true),
  ];
}

describe("hard AI worker integration", () => {
  it("keeps the searched principal move even after repeated use of its piece", () => {
    const pieces = createInitialPieces();
    const options = {
      maxDepth: 1,
      quiescenceDepth: 0,
      milliseconds: 60_000,
      now: () => 0,
      recentAiPieceIds: ["irrelevant", "irrelevant"],
    };
    const searched = chooseAdvancedMove(pieces, "black", options);
    const repeatedOptions = {
      ...options,
      recentAiPieceIds: [searched.pieceId, searched.pieceId, searched.pieceId],
    };
    const expected = chooseAdvancedMove(pieces, "black", repeatedOptions);
    const selected = chooseMoveWithVariantRules(
      pieces,
      "black",
      "hard",
      repeatedOptions,
    );

    expect(selected).toMatchObject({
      pieceId: expected.pieceId,
      square3D: expected.square3D,
    });
  });

  it("returns a legal hard move with final runtime safety diagnostics", () => {
    const selected = chooseMoveWithVariantRules(
      createInitialPieces(),
      "black",
      "hard",
      {
        maxDepth: 1,
        quiescenceDepth: 0,
        milliseconds: 60_000,
        now: () => 0,
      },
    );

    expect(selected).toMatchObject({
      pieceId: expect.any(String),
      square3D: expect.any(String),
      search: {
        engine: "strategic-3d-alpha-beta-v3",
        completedDepth: 1,
        policy: "runtime-blunder-veto-v7",
        runtimeSafetyPolicy: "final-worker-static-exchange-gate-v2",
        safetyVetoApplied: false,
      },
    });
  });

  it("vetoes an unsafe searched queen capture and returns a safe replacement", () => {
    const pieces = unsafeQueenForPawnPosition();
    const board = createBoard(pieces);
    const unsafe = generateLegalMovesForColor(board, "black").find(
      (move) =>
        move.pieceId === "black-queen" &&
        move.to.x === 0 &&
        move.to.y === 3 &&
        move.to.z === 0,
    );
    expect(unsafe).toBeDefined();

    const selected = enforceFinalWorkerSafety(
      pieces,
      "black",
      "hard",
      serializeMove(unsafe),
      {
        maxDepth: 1,
        quiescenceDepth: 0,
        milliseconds: 60_000,
        now: () => 0,
      },
    );

    expect(selected).not.toMatchObject({
      pieceId: "black-queen",
      capturedPieceId: "white-pawn",
      to: { x: 0, y: 3, z: 0 },
    });
    expect(selected.search).toMatchObject({
      policy: "runtime-blunder-veto-v7",
      runtimeSafetyPolicy: "final-worker-static-exchange-gate-v2",
      safetyVetoApplied: true,
      forcedUnsafeFallback: false,
    });
    expect(selected.search.safeCandidateCount).toBeGreaterThan(0);
  });

  it("applies the final queen blunder veto even when difficulty is not hard", () => {
    const pieces = unsafeQueenForPawnPosition();
    const board = createBoard(pieces);
    const unsafe = generateLegalMovesForColor(board, "black").find(
      (move) =>
        move.pieceId === "black-queen" &&
        move.to.x === 0 &&
        move.to.y === 3 &&
        move.to.z === 0,
    );

    const selected = enforceFinalWorkerSafety(
      pieces,
      "black",
      "easy",
      serializeMove(unsafe),
    );

    expect(selected).not.toMatchObject({
      pieceId: "black-queen",
      capturedPieceId: "white-pawn",
      to: { x: 0, y: 3, z: 0 },
    });
    expect(selected.search.safetyVetoApplied).toBe(true);
  });
});
