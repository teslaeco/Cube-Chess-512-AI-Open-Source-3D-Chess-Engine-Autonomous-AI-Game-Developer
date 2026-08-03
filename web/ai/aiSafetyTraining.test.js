import { describe, expect, it } from "vitest";
import { generateLegalMovesForColor } from "../../src/engine3d/index.ts";
import { assessImmediateMaterialSafety } from "./finalMoveSafety.js";
import { createBoard } from "./searchEngine.js";

function piece(id, type, color, x, y, z, hasMoved = false) {
  return { id, type, color, position: { x, y, z }, hasMoved };
}

function scenarioPieces(template, episode) {
  const suffix = `-${episode}`;
  const kings = [
    piece(`white-king${suffix}`, "king", "white", 7, 0, 7),
    piece(`black-king${suffix}`, "king", "black", 7, 7, 7),
  ];

  switch (template) {
    case 0:
      return {
        side: "black",
        pieceId: `black-queen${suffix}`,
        target: [0, 3, 0],
        pieces: [
          ...kings,
          piece(`black-queen${suffix}`, "queen", "black", 0, 4, 0, true),
          piece(`white-pawn${suffix}`, "pawn", "white", 0, 3, 0, true),
          piece(`white-rook${suffix}`, "rook", "white", 0, 0, 0, true),
        ],
      };
    case 1:
      return {
        side: "black",
        pieceId: `black-rook${suffix}`,
        target: [1, 3, 0],
        pieces: [
          ...kings,
          piece(`black-rook${suffix}`, "rook", "black", 1, 4, 0, true),
          piece(`white-pawn${suffix}`, "pawn", "white", 1, 3, 0, true),
          piece(`white-rook${suffix}`, "rook", "white", 1, 0, 0, true),
        ],
      };
    case 2:
      return {
        side: "black",
        pieceId: `black-bishop${suffix}`,
        target: [2, 3, 0],
        pieces: [
          ...kings,
          piece(`black-bishop${suffix}`, "bishop", "black", 1, 4, 0, true),
          piece(`white-pawn${suffix}`, "pawn", "white", 2, 3, 0, true),
          piece(`white-rook${suffix}`, "rook", "white", 2, 0, 0, true),
        ],
      };
    case 3:
      return {
        side: "black",
        pieceId: `black-knight${suffix}`,
        target: [3, 3, 0],
        pieces: [
          ...kings,
          piece(`black-knight${suffix}`, "knight", "black", 2, 5, 0, true),
          piece(`white-pawn${suffix}`, "pawn", "white", 3, 3, 0, true),
          piece(`white-rook${suffix}`, "rook", "white", 3, 0, 0, true),
        ],
      };
    case 4:
      return {
        side: "white",
        pieceId: `white-queen${suffix}`,
        target: [4, 4, 0],
        pieces: [
          ...kings,
          piece(`white-queen${suffix}`, "queen", "white", 4, 3, 0, true),
          piece(`black-pawn${suffix}`, "pawn", "black", 4, 4, 0, true),
          piece(`black-rook${suffix}`, "rook", "black", 4, 7, 0, true),
        ],
      };
    default:
      return {
        side: "white",
        pieceId: `white-rook${suffix}`,
        target: [5, 4, 0],
        pieces: [
          ...kings,
          piece(`white-rook${suffix}`, "rook", "white", 5, 3, 0, true),
          piece(`black-pawn${suffix}`, "pawn", "black", 5, 4, 0, true),
          piece(`black-rook${suffix}`, "rook", "black", 5, 7, 0, true),
        ],
      };
  }
}

describe("AI deterministic safety training", () => {
  it("rejects all 3000 generated immediate high-value-for-pawn episodes", () => {
    const failures = [];
    let executed = 0;

    for (let episode = 0; episode < 3000; episode += 1) {
      const scenario = scenarioPieces(episode % 6, episode);
      const board = createBoard(scenario.pieces);
      const legal = generateLegalMovesForColor(board, scenario.side);
      const [x, y, z] = scenario.target;
      const move = legal.find(
        (candidate) =>
          candidate.pieceId === scenario.pieceId &&
          candidate.to.x === x &&
          candidate.to.y === y &&
          candidate.to.z === z,
      );

      if (!move) {
        failures.push({ episode, reason: "training-move-not-legal" });
        continue;
      }

      const assessment = assessImmediateMaterialSafety(
        board,
        move,
        scenario.side,
      );
      executed += 1;
      if (assessment.safe) {
        failures.push({
          episode,
          reason: assessment.reason,
          materialNet: assessment.materialNet,
        });
      }
    }

    expect(executed).toBe(3000);
    expect(failures).toEqual([]);
  });
});
