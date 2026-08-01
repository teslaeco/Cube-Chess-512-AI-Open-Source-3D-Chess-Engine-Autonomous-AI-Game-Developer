import { describe, expect, it } from "vitest";
import {
  POINTER_DRAG_THRESHOLD,
  isClickGesture,
  selectNearestMetadata,
} from "../renderer/SelectionController.js";

describe("pointer selection gesture", () => {
  const start = { pointerId: 1, clientX: 100, clientY: 100 };

  it("accepts a short tap or click", () => {
    expect(
      isClickGesture(start, {
        pointerId: 1,
        clientX: 103,
        clientY: 104,
      }),
    ).toBe(true);
  });

  it("rejects pointerup after camera drag", () => {
    expect(
      isClickGesture(start, {
        pointerId: 1,
        clientX: 100 + POINTER_DRAG_THRESHOLD + 2,
        clientY: 100,
      }),
    ).toBe(false);
  });

  it("rejects a different pointer id", () => {
    expect(
      isClickGesture(start, { pointerId: 2, clientX: 100, clientY: 100 }),
    ).toBe(false);
  });

  it("keeps raycast distance order instead of preferring a farther piece", () => {
    const nearSquare = { kind: "square", square: { z: 3, square3D: "D:e2" } };
    const farPiece = { kind: "piece", piece: { id: "white-rook-1", position: { z: 3 } } };
    const metadata = new Map([
      ["near-square", nearSquare],
      ["far-piece", farPiece],
    ]);

    const selected = selectNearestMetadata(
      [{ object: "near-square" }, { object: "far-piece" }],
      3,
      (object) => metadata.get(object),
    );

    expect(selected).toBe(nearSquare);
  });

  it("skips intersections from other levels and selects the nearest active-level target", () => {
    const otherLevelPiece = { kind: "piece", piece: { id: "black-rook-1", position: { z: 6 } } };
    const activeSquare = { kind: "square", square: { z: 3, square3D: "D:e2" } };
    const metadata = new Map([
      ["other-level-piece", otherLevelPiece],
      ["active-square", activeSquare],
    ]);

    const selected = selectNearestMetadata(
      [{ object: "other-level-piece" }, { object: "active-square" }],
      3,
      (object) => metadata.get(object),
    );

    expect(selected).toBe(activeSquare);
  });
});