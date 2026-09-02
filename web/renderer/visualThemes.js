import {
  DEFAULT_LAB_LED_COLOR_SETTINGS,
  normalizeLabLedColorSettings,
} from "../state/labLedColorSettings.js";
import {
  CLASSIC_BLACK_WHITE_PRESET,
  CRAYON_CATHEDRAL_PRESET,
  FORGEMCP_PREMIUM_PRESET,
} from "../state/pieceVisualPresets.js";

const LAB_BASE = Object.freeze({
  name: "LAB_LED_COLOR",
  lightSquareColor: DEFAULT_LAB_LED_COLOR_SETTINGS.lightSquareColor,
  darkSquareColor: DEFAULT_LAB_LED_COLOR_SETTINGS.darkSquareColor,
  gridColor: DEFAULT_LAB_LED_COLOR_SETTINGS.ledColor,
  backgroundColor: "#101822",
  groundColor: "#162233",
  hemisphereSkyColor: "#eaf2ff",
  hemisphereGroundColor: "#263243",
  fillLightColor: "#bfdcff",
  rimLightColor: "#62f4ff",
  ambientIntensity: 1.05,
  hemisphereIntensity: 1.7,
  keyLightIntensity: 2.7,
  fillLightIntensity: 1.15,
  rimLightIntensity: 0.55,
  activeOpacity: 0.72,
  roughness: 0.82,
  metalness: 0.02,
  clearcoat: 0.12,
});

const CRAYON = Object.freeze({
  ...LAB_BASE,
  name: "CRAYON_CATHEDRAL",
  gridColor: "#35dec9",
  backgroundColor: "#101422",
  groundColor: "#171b30",
  hemisphereSkyColor: "#d7f7ff",
  hemisphereGroundColor: "#371c43",
  keyLightColor: "#fff0dc",
  fillLightColor: "#b7c8ff",
  rimLightColor: "#d56dff",
  rimLightIntensity: 0.75,
});

const CLASSIC = Object.freeze({
  ...LAB_BASE,
  name: "CLASSIC_BLACK_WHITE",
  lightSquareColor: "#f2f0e9",
  darkSquareColor: "#090a0d",
  gridColor: "#5d626a",
  backgroundColor: "#111318",
  groundColor: "#1d2025",
  hemisphereSkyColor: "#f8f5ed",
  hemisphereGroundColor: "#1a1c21",
  keyLightColor: "#fff0d2",
  fillLightColor: "#b8c9e5",
  rimLightColor: "#ffffff",
  ambientIntensity: 0.7,
  hemisphereIntensity: 1.2,
  keyLightIntensity: 3.35,
  fillLightIntensity: 0.92,
  rimLightIntensity: 0.72,
  activeOpacity: 0.94,
  roughness: 0.38,
  metalness: 0.05,
  clearcoat: 0.48,
});

export function visualThemeForPreset(preset, labLedColorSettings = {}) {
  if (preset === CLASSIC_BLACK_WHITE_PRESET) return { ...CLASSIC };
  if (preset === CRAYON_CATHEDRAL_PRESET) return { ...CRAYON };

  const lab = normalizeLabLedColorSettings(labLedColorSettings);
  const lightScale = lab.lightIntensity;
  return {
    ...LAB_BASE,
    lightSquareColor: lab.lightSquareColor,
    darkSquareColor: lab.darkSquareColor,
    gridColor: lab.ledColor,
    keyLightColor: lab.lightColor,
    rimLightColor: lab.ledColor,
    keyLightIntensity: LAB_BASE.keyLightIntensity * lightScale,
    fillLightIntensity: LAB_BASE.fillLightIntensity * lightScale,
    rimLightIntensity: LAB_BASE.rimLightIntensity * lightScale,
    selectedPreset: FORGEMCP_PREMIUM_PRESET,
  };
}
