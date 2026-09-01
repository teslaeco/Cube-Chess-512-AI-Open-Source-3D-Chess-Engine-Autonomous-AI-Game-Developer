import { describe, expect, it } from "vitest";
import {
  createCrayonCathedralMaterial,
  CRAYON_CATHEDRAL_TEXTURE_REVISION,
  CRAYON_CATHEDRAL_TEXTURE_STYLE,
  getCrayonCathedralTextures,
} from "./CrayonCathedralTextureSet.js";

const MAP_KEYS = ["color", "roughness", "metalness", "bump", "emissive"];

describe("Crayon Cathedral stained-glass PBR textures", () => {
  it("builds and caches a deterministic 256px five-map texture stack", () => {
    const first = getCrayonCathedralTextures("queen", "white");
    const repeated = getCrayonCathedralTextures("queen", "white");

    expect(repeated).toBe(first);
    expect(Object.keys(first)).toEqual(MAP_KEYS);
    for (const key of MAP_KEYS) {
      expect(first[key].image.width).toBe(256);
      expect(first[key].image.height).toBe(256);
      expect(first[key].userData.forgeTextureStyle).toBe(
        CRAYON_CATHEDRAL_TEXTURE_STYLE,
      );
      expect(first[key].userData.forgeTextureRevision).toBe(
        CRAYON_CATHEDRAL_TEXTURE_REVISION,
      );
    }
  });

  it("uses visibly different cool and warm stained-glass palettes", () => {
    const white = getCrayonCathedralTextures("king", "white").color.image.data;
    const black = getCrayonCathedralTextures("king", "black").color.image.data;
    expect(Array.from(white.slice(0, 2_048))).not.toEqual(
      Array.from(black.slice(0, 2_048)),
    );
  });

  it("attaches the complete PBR stack to body, frame, glass and crayon materials", () => {
    for (const role of ["body", "frame", "glass", "dark", "crayon"]) {
      const material = createCrayonCathedralMaterial(
        "rook",
        "white",
        role,
        role === "crayon" ? 0xff354f : null,
      );
      expect(material.map).toBeTruthy();
      expect(material.roughnessMap).toBeTruthy();
      expect(material.metalnessMap).toBeTruthy();
      expect(material.bumpMap).toBeTruthy();
      expect(material.emissiveMap).toBeTruthy();
      expect(material.userData.forgeTextureStyle).toBe(
        CRAYON_CATHEDRAL_TEXTURE_STYLE,
      );
    }
  });
});
