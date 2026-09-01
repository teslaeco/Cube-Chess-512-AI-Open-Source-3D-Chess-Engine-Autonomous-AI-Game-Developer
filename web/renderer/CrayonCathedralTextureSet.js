import * as THREE from "three";

export const CRAYON_CATHEDRAL_TEXTURE_REVISION =
  "2026-09-01-stained-glass-crayon-pbr-v1";
export const CRAYON_CATHEDRAL_TEXTURE_STYLE =
  "original-stained-glass-crayon-cathedral";

const TEXTURE_SIZE = 256;
const textureCache = new Map();

const TYPE_SEEDS = Object.freeze({
  pawn: 19,
  rook: 31,
  knight: 47,
  bishop: 61,
  queen: 73,
  king: 97,
});

const WHITE_GLASS = Object.freeze([
  [18, 190, 196],
  [30, 111, 205],
  [113, 46, 191],
  [45, 215, 157],
  [184, 57, 201],
]);
const BLACK_GLASS = Object.freeze([
  [224, 48, 76],
  [239, 104, 28],
  [204, 45, 146],
  [116, 47, 179],
  [231, 171, 28],
]);

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function hash(x, y, seed) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 91.7) * 43_758.5453;
  return value - Math.floor(value);
}

function mixRgb(from, to, amount) {
  const t = clamp01(amount);
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ];
}

function writePixel(target, offset, rgb) {
  target[offset] = Math.round(Math.min(255, Math.max(0, rgb[0])));
  target[offset + 1] = Math.round(Math.min(255, Math.max(0, rgb[1])));
  target[offset + 2] = Math.round(Math.min(255, Math.max(0, rgb[2])));
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
  texture.name = `crayon-cathedral-${channel}`;
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  texture.userData = {
    forgeSharedPieceTexture: true,
    forgeTextureStyle: CRAYON_CATHEDRAL_TEXTURE_STYLE,
    forgeTextureRevision: CRAYON_CATHEDRAL_TEXTURE_REVISION,
    channel,
    width: TEXTURE_SIZE,
    height: TEXTURE_SIZE,
  };
  return texture;
}

function buildTextureSet(type, side) {
  const seed = TYPE_SEEDS[type] ?? TYPE_SEEDS.pawn;
  const palette = side === "black" ? BLACK_GLASS : WHITE_GLASS;
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
      const gridX = u * 11;
      const gridY = v * 15;
      const cellX = Math.floor(gridX);
      const cellY = Math.floor(gridY);
      const localX = gridX - cellX;
      const localY = gridY - cellY;
      const cellNoise = hash(cellX, cellY, seed);
      const fleck = hash(Math.floor(u * 93), Math.floor(v * 113), seed + 37);
      const edgeDistance = Math.min(localX, 1 - localX, localY, 1 - localY);
      const gridLead = 1 - smoothstep(0.045, 0.105, edgeDistance);
      const diagonalDistance = (cellX + cellY + seed) % 2 === 0
        ? Math.abs(localX - localY)
        : Math.abs(localX + localY - 1);
      const diagonalLead = 1 - smoothstep(0.025, 0.065, diagonalDistance);
      const lead = Math.max(gridLead, diagonalLead * 0.82);
      const paletteIndex = Math.floor(cellNoise * palette.length) % palette.length;
      const neighbour = palette[(paletteIndex + 1 + (cellY % 2)) % palette.length];
      const glass = mixRgb(palette[paletteIndex], neighbour, fleck * 0.32);
      const sparkle = Math.pow(fleck, 18);
      const frame = side === "black" ? [67, 18, 25] : [11, 94, 78];
      let base = mixRgb(glass, frame, lead);
      base = mixRgb(base, [245, 231, 180], sparkle * 0.62);
      const warmSpeck = Math.pow(hash(x, y, seed + 101), 24);
      base = mixRgb(base, side === "black" ? [255, 151, 56] : [74, 255, 221], warmSpeck);

      writePixel(color, offset, base);
      const rough = clamp01(0.17 + lead * 0.29 + (1 - fleck) * 0.08);
      writePixel(roughness, offset, [rough * 255, rough * 255, rough * 255]);
      const metal = clamp01(0.08 + lead * 0.78 + sparkle * 0.38);
      writePixel(metalness, offset, [metal * 255, metal * 255, metal * 255]);
      const relief = clamp01(0.38 + lead * 0.43 + (fleck - 0.5) * 0.14);
      writePixel(bump, offset, [relief * 255, relief * 255, relief * 255]);
      const glow = clamp01((1 - lead) * (0.32 + cellNoise * 0.44) + sparkle * 0.58);
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

export function getCrayonCathedralTextures(type, color = "white") {
  const safeType = Object.hasOwn(TYPE_SEEDS, type) ? type : "pawn";
  const side = color === "black" ? "black" : "white";
  const key = `${safeType}:${side}`;
  if (!textureCache.has(key)) textureCache.set(key, buildTextureSet(safeType, side));
  return textureCache.get(key);
}

const ROLE_SETTINGS = Object.freeze({
  body: Object.freeze({ white: 0xffffff, black: 0xf4d7d7, metalness: 0.34, roughness: 0.28 }),
  frame: Object.freeze({ white: 0x41d4ad, black: 0xe04c38, metalness: 0.88, roughness: 0.16 }),
  glass: Object.freeze({ white: 0x8aefff, black: 0xff936f, metalness: 0.18, roughness: 0.12 }),
  dark: Object.freeze({ white: 0x07191a, black: 0x16070b, metalness: 0.82, roughness: 0.14 }),
  crayon: Object.freeze({ white: 0xffffff, black: 0xffffff, metalness: 0.24, roughness: 0.22 }),
});

export function createCrayonCathedralMaterial(
  type,
  color = "white",
  role = "body",
  tint = null,
) {
  const side = color === "black" ? "black" : "white";
  const settings = ROLE_SETTINGS[role] ?? ROLE_SETTINGS.body;
  const textures = getCrayonCathedralTextures(type, side);
  const material = new THREE.MeshPhysicalMaterial({
    color: tint ?? settings[side],
    map: textures.color,
    roughness: settings.roughness,
    roughnessMap: textures.roughness,
    metalness: settings.metalness,
    metalnessMap: textures.metalness,
    bumpMap: textures.bump,
    bumpScale: role === "glass" ? 0.007 : 0.016,
    emissive: role === "glass"
      ? side === "black" ? 0xff3b77 : 0x30eaff
      : role === "frame"
        ? side === "black" ? 0x541008 : 0x063c36
        : 0x080a0d,
    emissiveMap: textures.emissive,
    emissiveIntensity: role === "glass" ? 0.9 : role === "frame" ? 0.22 : 0.09,
    clearcoat: role === "glass" ? 1 : 0.88,
    clearcoatRoughness: role === "glass" ? 0.06 : 0.15,
    envMapIntensity: role === "glass" ? 1.55 : 1.18,
    transparent: role === "glass",
    opacity: role === "glass" ? 0.9 : 1,
    side: role === "glass" ? THREE.DoubleSide : THREE.FrontSide,
  });
  material.userData = {
    forgePieceInstanceMaterial: false,
    forgeSharedPieceMaterial: true,
    forgeTextureStyle: CRAYON_CATHEDRAL_TEXTURE_STYLE,
    forgeTextureRevision: CRAYON_CATHEDRAL_TEXTURE_REVISION,
    forgeCrayonCathedralRole: role,
    forgeBaseEmissiveHex: material.emissive.getHex(),
    forgeBaseEmissiveIntensity: material.emissiveIntensity,
  };
  return material;
}
