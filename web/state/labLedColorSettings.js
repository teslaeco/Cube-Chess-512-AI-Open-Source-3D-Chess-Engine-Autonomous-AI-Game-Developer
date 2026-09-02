const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const LAB_LED_COLOR_STORAGE_KEY = "cubeChessLabLedColorSettings";

export const DEFAULT_LAB_LED_COLOR_SETTINGS = Object.freeze({
  lightSquareColor: "#d9d9d9",
  darkSquareColor: "#222a34",
  whitePieceColor: "#ffffff",
  blackPieceColor: "#ffffff",
  ledColor: "#62f4ff",
  lightColor: "#fff4dc",
  lightIntensity: 1,
});

function normalizeHexColor(value, fallback) {
  return HEX_COLOR.test(String(value ?? ""))
    ? String(value).toLowerCase()
    : fallback;
}

function normalizeIntensity(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_LAB_LED_COLOR_SETTINGS.lightIntensity;
  return Math.min(1.5, Math.max(0.5, Math.round(number * 20) / 20));
}

export function normalizeLabLedColorSettings(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    lightSquareColor: normalizeHexColor(
      source.lightSquareColor,
      DEFAULT_LAB_LED_COLOR_SETTINGS.lightSquareColor,
    ),
    darkSquareColor: normalizeHexColor(
      source.darkSquareColor,
      DEFAULT_LAB_LED_COLOR_SETTINGS.darkSquareColor,
    ),
    whitePieceColor: normalizeHexColor(
      source.whitePieceColor,
      DEFAULT_LAB_LED_COLOR_SETTINGS.whitePieceColor,
    ),
    blackPieceColor: normalizeHexColor(
      source.blackPieceColor,
      DEFAULT_LAB_LED_COLOR_SETTINGS.blackPieceColor,
    ),
    ledColor: normalizeHexColor(
      source.ledColor,
      DEFAULT_LAB_LED_COLOR_SETTINGS.ledColor,
    ),
    lightColor: normalizeHexColor(
      source.lightColor,
      DEFAULT_LAB_LED_COLOR_SETTINGS.lightColor,
    ),
    lightIntensity: normalizeIntensity(source.lightIntensity),
  };
}

export function readStoredLabLedColorSettings(storage = globalThis.localStorage) {
  if (!storage) return normalizeLabLedColorSettings();
  try {
    return normalizeLabLedColorSettings(
      JSON.parse(storage.getItem(LAB_LED_COLOR_STORAGE_KEY) ?? "{}"),
    );
  } catch {
    return normalizeLabLedColorSettings();
  }
}

export function storeLabLedColorSettings(
  settings,
  storage = globalThis.localStorage,
) {
  const normalized = normalizeLabLedColorSettings(settings);
  try {
    storage?.setItem(LAB_LED_COLOR_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // The live preview still works when storage is unavailable or full.
  }
  return normalized;
}

export function sameLabLedColorSettings(left, right) {
  return JSON.stringify(normalizeLabLedColorSettings(left)) ===
    JSON.stringify(normalizeLabLedColorSettings(right));
}
