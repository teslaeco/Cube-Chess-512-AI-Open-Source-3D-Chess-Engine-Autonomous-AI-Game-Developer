import { describe, expect, it } from "vitest";
import { createInitialPieces } from "../state/initialPosition.js";
import { createBoard } from "./searchEngine.js";
import {
  chooseAdvancedMove,
  evaluateAdvanced,
  positionKey,
} from "./advancedSearch.js";

describe("advanced hard AI", () => {
  it("creates stable position keys independent of piece array order", () => {
    const pieces = createInitialPieces();
    const forward = createBoard(pieces);
    const reversed = createBoard([...pieces].reverse());
    expect(positionKey(forward, "white")).toBe(positionKey(reversed, "white"));
    expect(positionKey(forward, "white")).not.toBe(positionKey(forward, "black"));
  });

  it("evaluates the initial position symmetrically", () => {
    const board = createBoard(createInitialPieces());
    expect(evaluateAdvanced(board, "white")).toBe(
      -evaluateAdvanced(board, "black"),
    );
  });

  it("returns a legal serialized move and search diagnostics", () => {
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
        engine: "advanced-alpha-beta-tt",
        completedDepth: 1,
        nodes: expect.any(Number),
      },
    });
    expect(move.search.nodes).toBeGreaterThan(0);
  });

  it("honours cancellation without losing the legal fallback move", () => {
    const move = chooseAdvancedMove(createInitialPieces(), "white", {
      maxDepth: 6,
      isCancelled: () => true,
      now: () => 0,
    });
    expect(move?.pieceId).toEqual(expect.any(String));
    expect(move?.search.completedDepth).toBe(0);
  });
});
