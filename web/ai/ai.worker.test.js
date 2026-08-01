import { describe, expect, it } from "vitest";
import { createInitialPieces } from "../state/initialPosition.js";
import { chooseAdvancedMove } from "./advancedSearch.js";
import { chooseMoveWithVariantRules } from "./ai.worker.js";

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

  it("returns a legal hard move with search diagnostics", () => {
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
        engine: "strategic-3d-alpha-beta-v2",
        completedDepth: 1,
      },
    });
  });
});
