import { describe, expect, it } from "vitest";
import { createInitialPieces } from "../state/initialPosition.js";
import { createBoard } from "./searchEngine.js";
import {
  chooseAdvancedMove,
  evaluateAdvanced,
  positionKey,
} from "./advancedSearch.js";

describe("strategic hard AI", () => {
  it("creates stable position keys independent of piece array order", () => {
    const pieces = createInitialPieces();
    const forward = createBoard(pieces);
    const reversed = createBoard([...pieces].reverse());
    expect(positionKey(forward, "white")).toBe(positionKey(reversed, "white"));
    expect(positionKey(forward, "white")).not.toBe(positionKey(forward, "black"));
  });

  it("evaluates the initial position symmetrically", () => {
    const board = createBoard(createInitialPieces());
    const whiteScore = evaluateAdvanced(board, "white");
    const blackScore = evaluateAdvanced(board, "black");

    expect(whiteScore).toBeCloseTo(-blackScore, 10);
    expect(Math.abs(whiteScore)).toBeCloseTo(0, 10);
    expect(Math.abs(blackScore)).toBeCloseTo(0, 10);
  });

  it("returns a legal serialized move and strategic search diagnostics", () => {
    const move = chooseAdvancedMove(createInitialPieces(), "white", {
      maxDepth: 1,
      quiescenceDepth: 0,
      milliseconds: 60_000,
      now: () => 0,
      transpositionEntries: 1_000,
    });
    expect(move).toMatchObject({
      pieceId: expect.any(String),
      square3D: expect.any(String),
      search: {
        engine: "strategic-3d-alpha-beta-v2",
        completedDepth: 1,
        nodes: expect.any(Number),
      },
    });
    expect(move.search.nodes).toBeGreaterThan(0);
  });

  it("uses recent move history without losing a legal move", () => {
    const first = chooseAdvancedMove(createInitialPieces(), "white", {
      maxDepth: 1,
      quiescenceDepth: 0,
      milliseconds: 60_000,
      now: () => 0,
    });
    const next = chooseAdvancedMove(createInitialPieces(), "white", {
      maxDepth: 1,
      quiescenceDepth: 0,
      milliseconds: 60_000,
      now: () => 0,
      recentAiPieceIds: [first.pieceId, first.pieceId, first.pieceId],
    });

    expect(next?.pieceId).toEqual(expect.any(String));
    expect(next?.square3D).toEqual(expect.any(String));
  });

  it("honours cancellation without losing the legal fallback move", () => {
    const move = chooseAdvancedMove(createInitialPieces(), "white", {
      maxDepth: 7,
      isCancelled: () => true,
      now: () => 0,
    });
    expect(move?.pieceId).toEqual(expect.any(String));
    expect(move?.search.completedDepth).toBe(0);
  });
});
