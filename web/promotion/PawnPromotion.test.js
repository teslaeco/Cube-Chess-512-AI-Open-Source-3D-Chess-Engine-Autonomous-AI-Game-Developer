import { describe, expect, it } from "vitest";
import {
  LEGAL_PROMOTION_TYPES,
  assertPromotionType,
  chooseAIPromotion,
  evaluatePawnPromotion,
} from "./PawnPromotion.js";

const position = (x, y, z) => ({ x, y, z });
const pawn = (color) => ({ id: `${color}-pawn`, type: "pawn", color });
const piece = (type, color = "white") => ({ id: `${color}-${type}`, type, color });

describe("3D pawn promotion evaluation", () => {
  it.each([
    ["white", 0], ["white", 2], ["white", 6],
  ])("requires white final-rank promotion on level index %i", (color, z) => {
    expect(evaluatePawnPromotion(pawn(color), position(0, 6, z), position(0, 7, z)))
      .toEqual({ required: true, reason: "final-rank" });
  });

  it.each([["black", 1], ["black", 5]])(
    "requires black final-rank promotion on level index %i",
    (color, z) => {
      expect(evaluatePawnPromotion(pawn(color), position(7, 1, z), position(7, 0, z)))
        .toEqual({ required: true, reason: "final-rank" });
    },
  );

  it("does not promote a normal pawn move below Level 8", () => {
    expect(evaluatePawnPromotion(pawn("white"), position(3, 3, 4), position(3, 4, 4)))
      .toEqual({ required: false });
  });

  it.each([
    ["white", position(0, 0, 7)],
    ["white", position(4, 4, 7)],
    ["black", position(7, 3, 7)],
  ])("promotes %s immediately on every tested Level 8 square", (color, to) => {
    expect(evaluatePawnPromotion(pawn(color), position(to.x, to.y, 6), to))
      .toEqual({ required: true, reason: "level-eight" });
  });

  it.each([piece("rook"), piece("knight")])("never promotes non-pawns", (candidate) => {
    expect(evaluatePawnPromotion(candidate, position(0, 6, 6), position(0, 7, 7)))
      .toEqual({ required: false });
  });
});

describe("promotion choices", () => {
  it("exposes exactly queen, rook, bishop and knight", () => {
    expect(LEGAL_PROMOTION_TYPES).toEqual(["queen", "rook", "bishop", "knight"]);
  });

  it.each(LEGAL_PROMOTION_TYPES)("accepts %s", (type) => {
    expect(assertPromotionType(type)).toBe(type);
  });

  it.each(["king", "pawn"])("rejects %s", (type) => {
    expect(() => assertPromotionType(type)).toThrow(RangeError);
  });

  it("defaults AI promotion to queen", () => {
    expect(chooseAIPromotion({}, {})).toBe("queen");
  });
});
