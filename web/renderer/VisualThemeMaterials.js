import * as THREE from "three";
import { normalizeLabLedColorSettings } from "../state/labLedColorSettings.js";
import {
  createHighDetailChessMaterial,
  getHighDetailChessTextures,
} from "./HighDetailChessTextureSet.js";

export const LAB_LED_COLOR_MATERIAL_STYLE = "lab-ledcolor-customizable-pbr";
export const CLASSIC_BLACK_WHITE_MATERIAL_STYLE =
  "classic-black-white-sculpted-pbr";
export const CLASSIC_BLACK_WHITE_MATERIAL_REVISION =
  "2026-09-02-classic-black-white-v1";

function markBaseEmissive(material) {
  material.userData.forgeBaseEmissiveHex = material.emissive.getHex();
  material.userData.forgeBaseEmissiveIntensity = material.emissiveIntensity;
  return material;
}

export function createLabLedColorMaterial(
  materialTemplate,
  type,
  color = "white",
  settings = {},
) {
  const side = color === "black" ? "black" : "white";
  const appearance = normalizeLabLedColorSettings(settings);
  const material = createHighDetailChessMaterial(
    materialTemplate,
    type,
    side,
  );
  material.color.set(
    side === "black"
      ? appearance.blackPieceColor
      : appearance.whitePieceColor,
  );
  material.emissive.set(appearance.ledColor);
  material.userData = {
    ...material.userData,
    forgeTextureStyle: LAB_LED_COLOR_MATERIAL_STYLE,
    forgeTextureBaseStyle: material.userData.forgeTextureStyle,
    forgeLabLedColor: true,
    forgeLabPieceTint:
      side === "black"
        ? appearance.blackPieceColor
        : appearance.whitePieceColor,
    forgeLabLedColorHex: appearance.ledColor,
  };
  return markBaseEmissive(material);
}

export function createClassicBlackWhiteMaterial(
  materialTemplate,
  type,
  color = "white",
) {
  const side = color === "black" ? "black" : "white";
  const white = side === "white";
  const textures = getHighDetailChessTextures(type, side);
  const material = materialTemplate.clone();

  material.color.setHex(white ? 0xf5f2e9 : 0x08090b);
  material.map = null;
  material.roughness = white ? 0.3 : 0.2;
  material.roughnessMap = textures.roughness;
  material.metalness = white ? 0.06 : 0.14;
  material.metalnessMap = null;
  material.bumpMap = textures.bump;
  material.bumpScale = white ? 0.012 : 0.016;
  material.emissive.setHex(0x000000);
  material.emissiveMap = null;
  material.emissiveIntensity = 0;
  material.clearcoat = white ? 0.78 : 0.94;
  material.clearcoatRoughness = white ? 0.18 : 0.1;
  material.envMapIntensity = white ? 1.15 : 1.48;
  material.side = THREE.FrontSide;
  material.userData = {
    ...material.userData,
    forgeSharedPieceMaterial: false,
    forgePieceInstanceMaterial: true,
    forgeTextureStyle: CLASSIC_BLACK_WHITE_MATERIAL_STYLE,
    forgeTextureRevision: CLASSIC_BLACK_WHITE_MATERIAL_REVISION,
    forgeClassicBlackWhite: true,
    forgeClassicSide: side,
  };
  material.needsUpdate = true;
  return markBaseEmissive(material);
}

export function applyLabLedColorFallback(object, color = "white", settings = {}) {
  const side = color === "black" ? "black" : "white";
  const appearance = normalizeLabLedColorSettings(settings);
  object?.traverse?.((child) => {
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const material of materials) {
      if (!material?.color) continue;
      material.color.multiply(
        new THREE.Color(
          side === "black"
            ? appearance.blackPieceColor
            : appearance.whitePieceColor,
        ),
      );
      if (material.emissive) material.emissive.set(appearance.ledColor);
      material.userData = {
        ...material.userData,
        forgeTextureStyle: LAB_LED_COLOR_MATERIAL_STYLE,
        forgeLabLedColor: true,
        forgeLabLedColorHex: appearance.ledColor,
        forgeBaseEmissiveHex: material.emissive?.getHex?.() ?? 0x000000,
        forgeBaseEmissiveIntensity: material.emissiveIntensity ?? 0,
      };
      material.needsUpdate = true;
    }
  });
  return object;
}

export function applyClassicBlackWhiteFallback(object, color = "white") {
  const side = color === "black" ? "black" : "white";
  object?.traverse?.((child) => {
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const material of materials) {
      if (!material?.color) continue;
      material.color.setHex(side === "white" ? 0xf5f2e9 : 0x08090b);
      if (material.emissive) material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0;
      material.roughness = side === "white" ? 0.3 : 0.2;
      material.metalness = side === "white" ? 0.06 : 0.14;
      material.clearcoat = side === "white" ? 0.78 : 0.94;
      material.clearcoatRoughness = side === "white" ? 0.18 : 0.1;
      material.userData = {
        ...material.userData,
        forgeTextureStyle: CLASSIC_BLACK_WHITE_MATERIAL_STYLE,
        forgeTextureRevision: CLASSIC_BLACK_WHITE_MATERIAL_REVISION,
        forgeClassicBlackWhite: true,
        forgeBaseEmissiveHex: 0x000000,
        forgeBaseEmissiveIntensity: 0,
      };
      material.needsUpdate = true;
    }
  });
  return object;
}
