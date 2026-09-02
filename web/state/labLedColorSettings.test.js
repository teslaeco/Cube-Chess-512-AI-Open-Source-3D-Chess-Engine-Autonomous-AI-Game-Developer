import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAB_LED_COLOR_SETTINGS,
  normalizeLabLedColorSettings,
  readStoredLabLedColorSettings,
  storeLabLedColorSettings,
} from "./labLedColorSettings.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("Lab LEDColor settings", () => {
  it("normalizes colors and clamps physical light intensity", () => {
    expect(normalizeLabLedColorSettings({
      lightSquareColor: "#ABCDEF",
      darkSquareColor: "not-a-color",
      lightIntensity: 9,
    })).toMatchObject({
      lightSquareColor: "#abcdef",
      darkSquareColor: DEFAULT_LAB_LED_COLOR_SETTINGS.darkSquareColor,
      lightIntensity: 1.5,
    });
  });

  it("round-trips the complete palette through local storage", () => {
    const storage = memoryStorage();
    const stored = storeLabLedColorSettings({
      ...DEFAULT_LAB_LED_COLOR_SETTINGS,
      ledColor: "#ff3366",
      lightIntensity: 0.75,
    }, storage);
    expect(readStoredLabLedColorSettings(storage)).toEqual(stored);
  });

  it("recovers safely from damaged storage", () => {
    const storage = memoryStorage({ cubeChessLabLedColorSettings: "{" });
    expect(readStoredLabLedColorSettings(storage)).toEqual(
      DEFAULT_LAB_LED_COLOR_SETTINGS,
    );
  });
});
