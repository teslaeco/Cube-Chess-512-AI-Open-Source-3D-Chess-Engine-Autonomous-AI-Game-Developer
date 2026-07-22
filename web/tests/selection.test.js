import { describe, expect, it } from "vitest";
import {
  POINTER_DRAG_THRESHOLD,
  isClickGesture,
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
});
