import { describe, expect, it } from "vitest";
import {
  inferAuthoritativeMove,
  oppositeColor,
  shouldApplyAuthoritativeState,
  squareOf,
} from "./authoritativeSync.js";

describe("authoritative online synchronization helpers", () => {
  it("returns the opposite side", () => {
    expect(oppositeColor("white")).toBe("black");
    expect(oppositeColor("black")).toBe("white");
  });

  it("reads a 3D square defensively", () => {
    expect(squareOf({ position: { square3D: "a1A" } })).toBe("a1A");
    expect(squareOf(null)).toBe("");
  });

  it("infers the single moved piece from authoritative state", () => {
    const localPieces = [
      { id: "white-rook-1", position: { square3D: "a1A" } },
      { id: "white-pawn-1", position: { square3D: "a2A" } },
    ];
    const state = {
      pieces: [
        { id: "white-rook-1", position: { square3D: "a1A" } },
        { id: "white-pawn-1", position: { square3D: "a3A" } },
      ],
    };

    expect(inferAuthoritativeMove(localPieces, state)).toEqual({
      pieceId: "white-pawn-1",
      square3D: "a3A",
    });
  });

  it("returns null when no existing piece changed square", () => {
    const localPieces = [{ id: "white-rook-1", position: { square3D: "a1A" } }];
    const state = {
      pieces: [
        { id: "white-rook-1", position: { square3D: "a1A" } },
        { id: "promoted-piece", position: { square3D: "h8H" } },
      ],
    };

    expect(inferAuthoritativeMove(localPieces, state)).toBeNull();
  });

  it("only applies started states with a newer sequence", () => {
    expect(shouldApplyAuthoritativeState(4, { started: true, sequence: 5 })).toBe(true);
    expect(shouldApplyAuthoritativeState(5, { started: true, sequence: 5 })).toBe(false);
    expect(shouldApplyAuthoritativeState(6, { started: true, sequence: 5 })).toBe(false);
    expect(shouldApplyAuthoritativeState(0, { started: false, sequence: 1 })).toBe(false);
    expect(shouldApplyAuthoritativeState(0, null)).toBe(false);
  });
});
