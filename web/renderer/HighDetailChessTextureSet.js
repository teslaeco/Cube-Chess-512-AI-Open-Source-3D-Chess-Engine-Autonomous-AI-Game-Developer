import * as THREE from "three";

export const HIGH_DETAIL_CHESS_TEXTURE_REVISION = "2026-09-01-marble-obsidian-inlay-v1";
export const HIGH_DETAIL_CHESS_TEXTURE_STYLE = "reference-marble-obsidian-cyan-gold";

const TEXTURE_SIZE = 256;
const textureCache = new Map();

const TYPE_STYLE = Object.freeze({
  pawn: Object.freeze({ seed: 17, bands: [0.045, 0.12, 0.20, 0.57, 0.68], gemY: 0.91, gemRadius: 0.050 }),
  rook: Object.freeze({ seed: 29, bands: [0.045, 0.12, 0.20, 0.63, 0.73, 0.88], gemY: 0.82, gemRadius: 0.044 }),
  knight: Object.freeze({ seed: 43, bands: [0.045, 0.12, 0.20, 0.48, 0.61], gemY: 0.76, gemRadius: 0.050 }),
  bishop: Object.freeze({ seed: 59, bands: [0.045, 0.12, 0.20, 0.56, 0.68, 0.82], gemY: 0.83, gemRadius: 0.055 }),
  queen: Object.freeze({ seed: 71, bands: [0.045, 0.12, 0.20, 0.55, 0.68, 0.82, 0.91], gemY: 0.86, gemRadius: 0.060 }),
  king: Object.freeze({ seed: 89, bands: [0.045, 0.12, 0.20, 0.54, 0.67, 0.80, 0.91], gemY: 0.84, gemRadius: 0.055 }),
});

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function hash(x, y, seed) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43_758.5453;
  return value - Math.floor(value);
}

function lineMask(value, center, halfWidth) {
  return 1 - smoothstep(halfWidth, halfWidth * 2.2, Math.abs(value - center));
}

function rgbMix(base, accent, amount) {
  const t = clamp01(amount);
  return [
    Math.round(base[0] + (accent[0] - base[0]) * t),
    Math.round(base[1] + (accent[1] - base[1]) * t),
    Math.round(base[2] + (accent[2] - base[2]) * t),
  ];
}

function writePixel(target, offset, rgb) {
  target[offset] = Math.min(255, Math.max(0, Math.round(rgb[0])));
  target[offset + 1] = Math.min(255, Math.max(0, Math.round(rgb[1])));
  target[offset + 2] = Math.min(255, Math.max(0, Math.round(rgb[2])));
  target[offset + 3] = 255;
}

function makeTexture(data, channel, colorSpace = THREE.NoColorSpace) {
  const texture = new THREE.DataTexture(
    data,
    TEXTURE_SIZE,
    TEXTURE_SIZE,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.name = `high-detail-chess-${channel}`;
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  texture.userData = {
    forgeSharedPieceTexture: true,
    forgeTextureStyle: HIGH_DETAIL_CHESS_TEXTURE_STYLE,
    forgeTextureRevision: HIGH_DETAIL_CHESS_TEXTURE_REVISION,
    channel,
    width: TEXTURE_SIZE,
    height: TEXTURE_SIZE,
  };
  return texture;
}

function buildTextureSet(type, side) {
  const style = TYPE_STYLE[type] ?? TYPE_STYLE.pawn;
  const color = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
  const roughness = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
  const metalness = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
  const bump = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
  const emissive = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);

  for (let y = 0; y < TEXTURE_SIZE; y += 1) {
    const v = y / (TEXTURE_SIZE - 1);
    for (let x = 0; x < TEXTURE_SIZE; x += 1) {
      const u = x / (TEXTURE_SIZE - 1);
      const offset = (y * TEXTURE_SIZE + x) * 4;
      const grain = hash(Math.floor(u * 72), Math.floor(v * 96), style.seed);
      const facet = hash(Math.floor(u * 18), Math.floor(v * 26), style.seed + 19);
      const warped = u * 5.8 + v * 2.7 + Math.sin(v * 17 + style.seed) * 0.13;
      const marble = Math.pow(1 - Math.abs(Math.sin(warped * Math.PI)), 15);
      const hairline = Math.pow(1 - Math.abs(Math.sin((u * 11.4 - v * 8.1 + facet) * Math.PI)), 28);

      let ring = 0;
      for (const band of style.bands) ring = Math.max(ring, lineMask(v, band, 0.0065));

      const bodyWindow = smoothstep(0.27, 0.34, v) * (1 - smoothstep(0.69, 0.78, v));
      const chevronTarget = 0.095 + Math.abs(v - 0.52) * 0.34;
      const chevron = (1 - smoothstep(0.010, 0.024, Math.abs(Math.abs(u - 0.5) - chevronTarget))) * bodyWindow;
      const centralInlay = (1 - smoothstep(0.010, 0.023, Math.abs(u - 0.5))) * bodyWindow;

      const gemDx = Math.abs(u - 0.5) / style.gemRadius;
      const gemDy = Math.abs(v - style.gemY) / (style.gemRadius * 1.45);
      const gem = 1 - smoothstep(0.72, 1.0, gemDx + gemDy);
      const gemCore = 1 - smoothstep(0.15, 0.72, gemDx + gemDy);
      const cyanRing = Math.max(
        lineMask(v, 0.045, 0.0045),
        lineMask(v, style.bands.at(-1), 0.0045) * 0.62,
      );

      let baseColor;
      let goldMask = 0;
      let cyanMask;
      let roughnessValue;
      let metalnessValue;
      if (side === "black") {
        const obsidianLift = facet * 13 + grain * 6 + marble * 16;
        baseColor = [5 + obsidianLift * 0.45, 10 + obsidianLift * 0.70, 17 + obsidianLift];
        cyanMask = Math.max(ring * 0.92, chevron * 0.72, centralInlay * 0.35, gem, cyanRing);
        baseColor = rgbMix(baseColor, [18, 205, 220], cyanMask * 0.86);
        baseColor = rgbMix(baseColor, [110, 250, 255], gemCore * 0.84);
        roughnessValue = 0.16 + (1 - facet) * 0.09 + hairline * 0.08;
        metalnessValue = Math.max(0.74, cyanMask * 0.97);
      } else {
        const marbleShade = 224 + facet * 13 + grain * 7 - hairline * 31;
        baseColor = [marbleShade + marble * 8, marbleShade + marble * 6, marbleShade + 4 + marble * 11];
        goldMask = Math.max(ring * 0.88, chevron * 0.84, centralInlay * 0.30) * (1 - gem);
        cyanMask = Math.max(gem, cyanRing * 0.78);
        baseColor = rgbMix(baseColor, [195, 145, 51], goldMask * 0.94);
        baseColor = rgbMix(baseColor, [39, 142, 226], cyanMask * 0.92);
        baseColor = rgbMix(baseColor, [135, 235, 255], gemCore * 0.78);
        roughnessValue = 0.31 + (1 - facet) * 0.13 + hairline * 0.10;
        metalnessValue = Math.max(0.10, goldMask * 0.92, cyanMask * 0.70);
      }

      writePixel(color, offset, baseColor);
      const rough = clamp01(roughnessValue * (1 - Math.max(goldMask, cyanMask) * 0.58));
      writePixel(roughness, offset, [rough * 255, rough * 255, rough * 255]);
      writePixel(metalness, offset, [metalnessValue * 255, metalnessValue * 255, metalnessValue * 255]);
      const relief = clamp01(0.43 + (facet - 0.5) * 0.12 + marble * 0.24 - hairline * 0.20 + Math.max(goldMask, cyanMask) * 0.20);
      writePixel(bump, offset, [relief * 255, relief * 255, relief * 255]);
      const glow = clamp01(cyanMask * (side === "black" ? 1 : 0.72) + gemCore * 0.35);
      writePixel(emissive, offset, [glow * 255, glow * 255, glow * 255]);
    }
  }

  return Object.freeze({
    color: makeTexture(color, `${side}-${type}-color`, THREE.SRGBColorSpace),
    roughness: makeTexture(roughness, `${side}-${type}-roughness`),
    metalness: makeTexture(metalness, `${side}-${type}-metalness`),
    bump: makeTexture(bump, `${side}-${type}-bump`),
    emissive: makeTexture(emissive, `${side}-${type}-emissive`, THREE.SRGBColorSpace),
  });
}

export function getHighDetailChessTextures(type, color = "white") {
  const safeType = Object.hasOwn(TYPE_STYLE, type) ? type : "pawn";
  const side = color === "black" ? "black" : "white";
  const key = `${safeType}:${side}`;
  if (!textureCache.has(key)) textureCache.set(key, buildTextureSet(safeType, side));
  return textureCache.get(key);
}

export function ensureHighDetailChessUvs(geometry) {
  if (geometry.getAttribute("uv")?.userData?.forgeHighDetailUvRevision === HIGH_DETAIL_CHESS_TEXTURE_REVISION) {
    return geometry;
  }
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const rangeX = Math.max(1e-9, bounds.max.x - bounds.min.x);
  const rangeY = Math.max(1e-9, bounds.max.y - bounds.min.y);
  const position = geometry.getAttribute("position");
  const uv = new Float32Array(position.count * 2);
  for (let index = 0; index < position.count; index += 1) {
    uv[index * 2] = clamp01((position.getX(index) - bounds.min.x) / rangeX);
    uv[index * 2 + 1] = clamp01((position.getY(index) - bounds.min.y) / rangeY);
  }
  const attribute = new THREE.BufferAttribute(uv, 2);
  attribute.userData = { forgeHighDetailUvRevision: HIGH_DETAIL_CHESS_TEXTURE_REVISION };
  geometry.setAttribute("uv", attribute);
  geometry.userData.forgeTextureStyle = HIGH_DETAIL_CHESS_TEXTURE_STYLE;
  geometry.userData.forgeTextureRevision = HIGH_DETAIL_CHESS_TEXTURE_REVISION;
  return geometry;
}

export function createHighDetailChessMaterial(materialTemplate, type, color = "white") {
  const side = color === "black" ? "black" : "white";
  const textures = getHighDetailChessTextures(type, side);
  const material = materialTemplate.clone();
  material.color.setHex(0xffffff);
  material.map = textures.color;
  material.roughness = 1;
  material.roughnessMap = textures.roughness;
  material.metalness = 1;
  material.metalnessMap = textures.metalness;
  material.bumpMap = textures.bump;
  material.bumpScale = side === "black" ? 0.018 : 0.014;
  material.emissive.setHex(side === "black" ? 0x62f4ff : 0x78bfff);
  material.emissiveMap = textures.emissive;
  material.emissiveIntensity = side === "black" ? 1.05 : 0.48;
  material.clearcoat = 0.95;
  material.clearcoatRoughness = side === "black" ? 0.10 : 0.16;
  material.envMapIntensity = side === "black" ? 1.35 : 1.08;
  material.userData = {
    ...material.userData,
    forgeSharedPieceMaterial: false,
    forgePieceInstanceMaterial: true,
    forgeTextureStyle: HIGH_DETAIL_CHESS_TEXTURE_STYLE,
    forgeTextureRevision: HIGH_DETAIL_CHESS_TEXTURE_REVISION,
    forgeBaseEmissiveHex: material.emissive.getHex(),
    forgeBaseEmissiveIntensity: material.emissiveIntensity,
  };
  material.needsUpdate = true;
  return material;
}
