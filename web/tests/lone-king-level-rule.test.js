import { describe, expect, it } from "vitest";
import { applyLoneKingLevelRule, loneKingLockedLevel } from "../rules/LoneKingLevelRule.js";

const king = {
  id: "white-king",
  type: "king",
  color: "white",
  position: { x: 4, y: 4, z: 3 },
};

const sameLevel = {
  pieceId: king.id,
  from: { x: 4, y: 4, z: 3 },
  to: { x: 5, y: 4, z: 3 },
};

const crossLevel = {
  pieceId: king.id,
  from: { x: 4, y: 4, z: 3 },
  to: { x: 4, y: 4, z: 4 },
};

describe("lone king level rule", () => {
  it("locks a side when its king is the only remaining piece", () => {
    expect(loneKingLockedLevel([king], "white")).toBe(3);
    expect(applyLoneKingLevelRule([king], "white", [sameLevel, crossLevel])).toEqual([
      sameLevel,
    ]);
  });

  it("does not lock a king while any friendly piece remains", () => {
    const pawn = {
      id: "white-pawn",
      type: "pawn",
      color: "white",
      position: { x: 0, y: 1, z: 0 },
    };
    expect(loneKingLockedLevel([king, pawn], "white")).toBeNull();
    expect(applyLoneKingLevelRule([king, pawn], "white", [sameLevel, crossLevel])).toEqual([
      sameLevel,
      crossLevel,
    ]);
  });
});
