import { describe, expect, it } from "vitest";
import {
  LEGAL_PROMOTION_TYPES,
  assertPromotionType,
  chooseAIPromotion,
  createPromotionReplacement,
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

describe("promotion replacement state", () => {
  it.each(LEGAL_PROMOTION_TYPES)(
    "keeps the exchanged pawn outside the board when promoting to %s",
    (promotedTo) => {
      const originalPawn = {
        id: "white-pawn-1",
        type: "pawn",
        color: "white",
        position: position(4, 7, 7),
        hasMoved: true,
      };
      const { retiredPawn, promotedPiece } = createPromotionReplacement(
        originalPawn,
        promotedTo,
        9,
        3,
      );

      expect(retiredPawn).toMatchObject({
        id: "white-pawn-1",
        type: "pawn",
        color: "white",
        retiredByPromotion: true,
        captureIndex: 3,
      });
      expect(promotedPiece).toMatchObject({
        id: "white-pawn-1::promoted::9",
        type: promotedTo,
        color: "white",
        position: position(4, 7, 7),
        promotedFrom: "pawn",
        promotedFromPieceId: "white-pawn-1",
      });
      expect(promotedPiece.id).not.toBe(retiredPawn.id);
    },
  );

  it("rejects replacement of a non-pawn", () => {
    expect(() => createPromotionReplacement(piece("rook"), "queen", 1, 0))
      .toThrow(TypeError);
  });
});
