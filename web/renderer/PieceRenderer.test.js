import { describe, expect, it } from "vitest";
import { requiresPieceObjectReplacement } from "./PieceRenderer.js";

describe("PieceRenderer promotion replacement", () => {
  const object = (type, color = "white") => ({
    userData: { piece: { id: "white-pawn-1", type, color } },
  });

  it("rebuilds the 3D object when a pawn promotes to a queen", () => {
    expect(
      requiresPieceObjectReplacement(object("pawn"), {
        id: "white-pawn-1",
        type: "queen",
        color: "white",
      }),
    ).toBe(true);
  });

  it.each(["rook", "bishop", "knight"])(
    "rebuilds the 3D object for %s underpromotion",
    (type) => {
      expect(
        requiresPieceObjectReplacement(object("pawn"), {
          id: "white-pawn-1",
          type,
          color: "white",
        }),
      ).toBe(true);
    },
  );

  it("rebuilds the pawn when undo restores a promoted piece", () => {
    expect(
      requiresPieceObjectReplacement(object("queen"), {
        id: "white-pawn-1",
        type: "pawn",
        color: "white",
      }),
    ).toBe(true);
  });

  it("keeps the current object when type and colour are unchanged", () => {
    expect(
      requiresPieceObjectReplacement(object("queen"), {
        id: "white-pawn-1",
        type: "queen",
        color: "white",
      }),
    ).toBe(false);
  });
});
