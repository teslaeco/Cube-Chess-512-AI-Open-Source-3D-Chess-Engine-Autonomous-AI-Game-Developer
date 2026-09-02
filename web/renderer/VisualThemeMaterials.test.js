import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  CLASSIC_BLACK_WHITE_MATERIAL_STYLE,
  LAB_LED_COLOR_MATERIAL_STYLE,
  createClassicBlackWhiteMaterial,
  createLabLedColorMaterial,
} from "./VisualThemeMaterials.js";
import { visualThemeForPreset } from "./visualThemes.js";
import {
  CLASSIC_BLACK_WHITE_PRESET,
  FORGEMCP_PREMIUM_PRESET,
} from "../state/pieceVisualPresets.js";

describe("player-selectable visual themes", () => {
  it("uses fixed white and black PBR materials for the classic high-detail pieces", () => {
    const template = new THREE.MeshPhysicalMaterial();
    const white = createClassicBlackWhiteMaterial(template, "queen", "white");
    const black = createClassicBlackWhiteMaterial(template, "queen", "black");

    expect(white.color.getHex()).toBe(0xf5f2e9);
    expect(black.color.getHex()).toBe(0x08090b);
    expect(white.userData.forgeTextureStyle).toBe(
      CLASSIC_BLACK_WHITE_MATERIAL_STYLE,
    );
    expect(white.roughnessMap).toBeTruthy();
    expect(white.bumpMap).toBeTruthy();
    expect(white.emissiveIntensity).toBe(0);
  });

  it("applies player colors and LED color without losing the five-map Lab stack", () => {
    const material = createLabLedColorMaterial(
      new THREE.MeshPhysicalMaterial(),
      "king",
      "white",
      {
        whitePieceColor: "#ff8844",
        ledColor: "#33ff99",
      },
    );
    expect(material.color.getHexString()).toBe("ff8844");
    expect(material.emissive.getHexString()).toBe("33ff99");
    expect(material.userData.forgeTextureStyle).toBe(
      LAB_LED_COLOR_MATERIAL_STYLE,
    );
    expect([
      material.map,
      material.roughnessMap,
      material.metalnessMap,
      material.bumpMap,
      material.emissiveMap,
    ].every(Boolean)).toBe(true);
  });

  it("keeps Classic fixed while Lab follows editable board and lighting colors", () => {
    const classic = visualThemeForPreset(CLASSIC_BLACK_WHITE_PRESET);
    const lab = visualThemeForPreset(FORGEMCP_PREMIUM_PRESET, {
      lightSquareColor: "#112233",
      darkSquareColor: "#445566",
      ledColor: "#abcdef",
      lightColor: "#fedcba",
      lightIntensity: 1.5,
    });
    expect(classic).toMatchObject({
      lightSquareColor: "#f2f0e9",
      darkSquareColor: "#090a0d",
      name: "CLASSIC_BLACK_WHITE",
    });
    expect(lab).toMatchObject({
      lightSquareColor: "#112233",
      darkSquareColor: "#445566",
      gridColor: "#abcdef",
      keyLightColor: "#fedcba",
      selectedPreset: FORGEMCP_PREMIUM_PRESET,
    });
    expect(lab.keyLightIntensity).toBeCloseTo(4.05, 5);
  });
});
