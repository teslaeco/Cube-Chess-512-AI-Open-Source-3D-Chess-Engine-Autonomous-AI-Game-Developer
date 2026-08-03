import { describe, expect, it } from "vitest";
import { chooseAdvancedMove } from "./advancedSearch.js";
import { createBoard } from "./searchEngine.js";
import {
  evaluateStrategicPosition,
  evaluateTeamCoordination,
} from "./strategicEvaluation.js";

function p(id, type, color, x, y, z, hasMoved = false) {
  return { id, type, color, position: { x, y, z }, hasMoved };
}

const kings = [
  p("wk", "king", "white", 0, 0, 0),
  p("bk", "king", "black", 7, 7, 7),
];

describe("strategic 3D AI evaluation", () => {
  it("strongly penalizes an undefended hanging queen", () => {
    const safe = createBoard([
      ...kings,
      p("wq", "queen", "white", 1, 1, 1),
      p("wp", "pawn", "white", 2, 2, 2),
      p("br", "rook", "black", 7, 1, 1),
    ]);
    const hanging = createBoard([
      ...kings,
      p("wq", "queen", "white", 3, 1, 1),
      p("br", "rook", "black", 7, 1, 1),
    ]);

    expect(evaluateStrategicPosition(safe, "white"))
      .toBeGreaterThan(evaluateStrategicPosition(hanging, "white"));
  });

  it("rewards a connected pawn group over isolated pawns", () => {
    const connected = createBoard([
      ...kings,
      p("p1", "pawn", "white", 2, 2, 1, true),
      p("p2", "pawn", "white", 3, 2, 1, true),
      p("p3", "pawn", "white", 3, 3, 2, true),
    ]);
    const isolated = createBoard([
      ...kings,
      p("p1", "pawn", "white", 0, 2, 0, true),
      p("p2", "pawn", "white", 4, 2, 4, true),
      p("p3", "pawn", "white", 7, 3, 7, true),
    ]);

    expect(evaluateStrategicPosition(connected, "white"))
      .toBeGreaterThan(evaluateStrategicPosition(isolated, "white"));
  });

  it("scores a multi-piece attack higher than an isolated attack", () => {
    const coordinated = createBoard([
      ...kings,
      p("wr", "rook", "white", 0, 3, 3, true),
      p("wb", "bishop", "white", 1, 0, 0, true),
      p("bq", "queen", "black", 4, 3, 3, true),
    ]);
    const isolated = createBoard([
      ...kings,
      p("wr", "rook", "white", 0, 3, 3, true),
      p("wb", "bishop", "white", 1, 0, 1, true),
      p("bq", "queen", "black", 4, 3, 3, true),
    ]);

    expect(evaluateTeamCoordination(coordinated, "white"))
      .toBeGreaterThan(evaluateTeamCoordination(isolated, "white"));
  });

  it("returns a legal move with whole-army strategic diagnostics", () => {
    let tick = 0;
    const move = chooseAdvancedMove(
      [
        ...kings,
        p("wp", "pawn", "white", 3, 1, 0),
        p("wn", "knight", "white", 1, 0, 0),
        p("bp", "pawn", "black", 3, 6, 0),
        p("bn", "knight", "black", 1, 7, 0),
      ],
      "black",
      {
        maxDepth: 2,
        quiescenceDepth: 1,
        milliseconds: 10_000,
        now: () => tick++,
        aiUsageCounts: { bp: 1 },
      },
    );

    expect(move).not.toBeNull();
    expect(move.search.engine).toBe("strategic-3d-alpha-beta-v4-army");
    expect(move.search.completedDepth).toBeGreaterThan(0);
    expect(move.search.armyUsageEntries).toBe(1);
  });
});
