import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createHighDetailChessMaterial,
  ensureHighDetailChessUvs,
  getHighDetailChessTextures,
  HIGH_DETAIL_CHESS_TEXTURE_REVISION,
  HIGH_DETAIL_CHESS_TEXTURE_STYLE,
} from "./HighDetailChessTextureSet.js";

function countPixels(texture, predicate) {
  const data = texture.image.data;
  let count = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (predicate(data[index], data[index + 1], data[index + 2])) count += 1;
  }
  return count;
}

describe("reference-inspired high-detail chess textures", () => {
  it("builds and caches a complete five-map PBR texture stack", () => {
    const first = getHighDetailChessTextures("queen", "white");
    const second = getHighDetailChessTextures("queen", "white");
    expect(first).toBe(second);
    expect(Object.keys(first).sort()).toEqual(["bump", "color", "emissive", "metalness", "roughness"]);
    for (const texture of Object.values(first)) {
      expect(texture).toBeInstanceOf(THREE.DataTexture);
      expect(texture.image.width).toBe(256);
      expect(texture.image.height).toBe(256);
      expect(texture.userData.forgeTextureStyle).toBe(HIGH_DETAIL_CHESS_TEXTURE_STYLE);
      expect(texture.userData.forgeTextureRevision).toBe(HIGH_DETAIL_CHESS_TEXTURE_REVISION);
    }
  });

  it("contains marble, gold and blue pixels for white plus obsidian and cyan for black", () => {
    const white = getHighDetailChessTextures("king", "white").color;
    const black = getHighDetailChessTextures("king", "black").color;
    expect(countPixels(white, (r, g, b) => r > 150 && g > 95 && g < 190 && b < 115)).toBeGreaterThan(300);
    expect(countPixels(white, (r, g, b) => b > r * 1.3 && b > g * 1.15)).toBeGreaterThan(100);
    expect(countPixels(black, (r, g, b) => r < 40 && g < 55 && b < 75)).toBeGreaterThan(5_000);
    expect(countPixels(black, (r, g, b) => g > r * 2 && b > r * 2 && b > 120)).toBeGreaterThan(300);
  });

  it("adds bounded planar UV coordinates to uploaded geometry", () => {
    const geometry = new THREE.BoxGeometry(4, 8, 3, 2, 2, 2);
    ensureHighDetailChessUvs(geometry);
    const uv = geometry.getAttribute("uv");
    expect(uv.count).toBe(geometry.getAttribute("position").count);
    for (let index = 0; index < uv.count; index += 1) {
      expect(uv.getX(index)).toBeGreaterThanOrEqual(0);
      expect(uv.getX(index)).toBeLessThanOrEqual(1);
      expect(uv.getY(index)).toBeGreaterThanOrEqual(0);
      expect(uv.getY(index)).toBeLessThanOrEqual(1);
    }
  });

  it("creates per-piece materials while sharing the generated texture maps", () => {
    const template = new THREE.MeshPhysicalMaterial({ color: 0xffffff });
    const first = createHighDetailChessMaterial(template, "bishop", "black");
    const second = createHighDetailChessMaterial(template, "bishop", "black");
    expect(first).not.toBe(second);
    expect(first.map).toBe(second.map);
    expect(first.roughnessMap).toBe(second.roughnessMap);
    expect(first.metalnessMap).toBe(second.metalnessMap);
    expect(first.bumpMap).toBe(second.bumpMap);
    expect(first.emissiveMap).toBe(second.emissiveMap);
    expect(first.userData.forgeTextureStyle).toBe(HIGH_DETAIL_CHESS_TEXTURE_STYLE);
    expect(first.userData.forgePieceInstanceMaterial).toBe(true);
  });
});
