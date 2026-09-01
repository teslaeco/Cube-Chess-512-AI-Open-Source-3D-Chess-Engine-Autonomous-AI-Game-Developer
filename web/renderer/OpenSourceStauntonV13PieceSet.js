import * as THREE from "three";
import { pieceCellEnvelope } from "./pieceScaleProfile.js";

const REVISION = "2026-09-01-open-source-staunton-v13-sculpted-silhouette";
const SOURCE_ID = "open-source-staunton-v13-sculpted-silhouette";
const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];
const LATHE_SEGMENTS = 96;
const textureCache = new Map();
const roughnessCache = new Map();
const materialCache = new Map();

function seededNoise(x, y, seed) {
  let n = (x * 374761393 + y * 668265263 + seed * 69069) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function makeRoleTexture(type, side) {
  const key = `${type}:${side}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const role = TYPES.indexOf(type) + 1;
  const seed = role * 113 + (side === "white" ? 29 : 71);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const n = seededNoise(x, y, seed);
      const vein = Math.pow(Math.max(0, Math.cos((x * 0.105 + y * 0.072) + n * 2.4)), 18);
      const facet = Math.pow(Math.max(0, Math.cos((x - y) * (0.065 + role * 0.004))), 24);
      if (side === "white") {
        const base = 224 + Math.round(n * 18);
        data[i] = Math.min(255, base + Math.round(vein * 14));
        data[i + 1] = Math.min(255, base + Math.round(vein * 8));
        data[i + 2] = Math.min(255, base - 5 + Math.round(facet * 11));
      } else {
        const base = 12 + Math.round(n * 16);
        data[i] = Math.min(255, base + Math.round(vein * 8));
        data[i + 1] = Math.min(255, base + Math.round(vein * 18) + Math.round(facet * 3));
        data[i + 2] = Math.min(255, base + Math.round(vein * 22) + Math.round(facet * 5));
      }
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.8, 2.8);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.userData = { roleTexture: true, type, side, width: size, height: size };
  textureCache.set(key, texture);
  return texture;
}

function makeRoughnessTexture(side) {
  if (roughnessCache.has(side)) return roughnessCache.get(side);
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const n = seededNoise(x, y, side === "white" ? 401 : 733);
      const v = side === "white" ? 76 + Math.round(n * 44) : 48 + Math.round(n * 50);
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 2.4);
  roughnessCache.set(side, texture);
  return texture;
}

function materialsFor(type, side) {
  const key = `${type}:${side}`;
  if (materialCache.has(key)) return materialCache.get(key);
  const white = side === "white";
  const roleMap = makeRoleTexture(type, side);
  const roughnessMap = makeRoughnessTexture(side);
  const body = new THREE.MeshPhysicalMaterial({
    color: white ? 0xf2efe8 : 0x101419,
    map: roleMap,
    bumpMap: roleMap,
    bumpScale: white ? 0.014 : 0.010,
    roughnessMap,
    roughness: white ? 0.28 : 0.21,
    metalness: white ? 0.08 : 0.30,
    clearcoat: white ? 0.72 : 0.86,
    clearcoatRoughness: 0.13,
    envMapIntensity: 1.28,
  });
  const trim = new THREE.MeshPhysicalMaterial({
    color: white ? 0xc9a75d : 0x16c4bb,
    metalness: 0.78,
    roughness: 0.15,
    clearcoat: 0.86,
    clearcoatRoughness: 0.08,
    emissive: white ? 0x2f210e : 0x063f3b,
    emissiveIntensity: white ? 0.06 : 0.20,
  });
  const inset = new THREE.MeshPhysicalMaterial({
    color: white ? 0x365d75 : 0x07161d,
    metalness: 0.46,
    roughness: 0.18,
    clearcoat: 0.72,
  });
  const eye = new THREE.MeshPhysicalMaterial({
    color: white ? 0x17384b : 0xd9ae62,
    metalness: 0.48,
    roughness: 0.12,
    clearcoat: 0.94,
  });
  const set = { body, trim, inset, eye };
  materialCache.set(key, set);
  return set;
}

function mark(object, role) {
  object.castShadow = true;
  object.receiveShadow = true;
  object.userData.openSourceStauntonRole = role;
  object.userData.forgePremiumRole = role;
  return object;
}

function mesh(geometry, material, y = 0, role = "surface") {
  const result = mark(new THREE.Mesh(geometry, material), role);
  result.position.y = y;
  return result;
}

function lathe(profile, material, y = 0, role = "lathe") {
  const points = profile.map(([r, h]) => new THREE.Vector2(r, h));
  return mesh(new THREE.LatheGeometry(points, LATHE_SEGMENTS), material, y, role);
}

function ring(group, material, radius, y, tube = 0.012, role = "ring") {
  const item = mesh(new THREE.TorusGeometry(radius, tube, 16, 72), material, y, role);
  item.rotation.x = Math.PI / 2;
  group.add(item);
}

function bevelExtrude(shape, depth, role, material, bevel = 0.022, bevelSegments = 6) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 2,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 28,
  });
  geometry.center();
  return mesh(geometry, material, 0, role);
}

function addBase(group, m, scale = 1) {
  group.add(lathe([
    [0.00,0.00],[0.22*scale,0.00],[0.34*scale,0.007],[0.43*scale,0.022],[0.49*scale,0.048],
    [0.52*scale,0.075],[0.515*scale,0.105],[0.49*scale,0.135],[0.445*scale,0.17],[0.405*scale,0.21],
    [0.375*scale,0.25],[0.355*scale,0.285],[0.345*scale,0.305],
  ], m.body, 0, "base"));
  ring(group, m.trim, 0.477 * scale, 0.10, 0.012, "base-trim");
  ring(group, m.body, 0.362 * scale, 0.278, 0.010, "base-lip");
}

function addCollar(group, m, radius, y) {
  group.add(mesh(new THREE.CylinderGeometry(radius, radius * 0.91, 0.065, 72, 2), m.body, y, "collar"));
  ring(group, m.trim, radius * 0.97, y + 0.020, 0.010, "collar-trim");
}

function addGem(group, m, x, y, z, scale = 1, role = "gem") {
  const gem = mesh(new THREE.OctahedronGeometry(0.045 * scale, 1), m.trim, y, role);
  gem.position.set(x, y, z);
  gem.scale.set(0.82, 1.30, 0.82);
  group.add(gem);
}

function fit(group, type) {
  const envelope = pieceCellEnvelope(type);
  group.position.set(0, 0, 0);
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((v) => Number.isFinite(v) && v > 0)) throw new Error(`Invalid ${type} bounds`);
  const s = Math.min(envelope.maxHeight / size.y, envelope.maxFootprint / size.x, envelope.maxFootprint / size.z);
  group.scale.setScalar(s);
  group.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.position.y -= box.min.y;
  group.updateMatrixWorld(true);
  return group;
}

function createPawn(m) {
  const g = new THREE.Group();
  addBase(g, m, 0.78);
  g.add(lathe([
    [0.245,0.00],[0.23,0.05],[0.205,0.12],[0.178,0.22],[0.158,0.34],[0.149,0.46],
    [0.153,0.565],[0.168,0.64],[0.191,0.695],[0.218,0.73],
  ], m.body, 0.29, "pawn-stem"));
  addCollar(g, m, 0.202, 1.00);
  g.add(mesh(new THREE.SphereGeometry(0.205, 64, 40), m.body, 1.205, "pawn-head"));
  addGem(g, m, 0, 1.39, 0, 0.52, "pawn-gem");
  return g;
}

function createRook(m) {
  const g = new THREE.Group();
  addBase(g, m, 0.84);
  g.add(lathe([
    [0.285,0.00],[0.266,0.06],[0.238,0.15],[0.211,0.27],[0.193,0.41],[0.19,0.55],
    [0.202,0.68],[0.226,0.79],[0.262,0.87],[0.292,0.91],
  ], m.body, 0.29, "rook-tower"));
  addCollar(g, m, 0.29, 1.12);
  g.add(mesh(new THREE.CylinderGeometry(0.338, 0.305, 0.17, 72, 3), m.body, 1.255, "rook-crown"));
  g.add(mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.075, 64, 2), m.inset, 1.34, "rook-recess"));
  const battlementShape = new THREE.Shape();
  battlementShape.moveTo(-0.070, -0.085);
  battlementShape.lineTo(0.070, -0.085);
  battlementShape.lineTo(0.070, 0.085);
  battlementShape.lineTo(-0.070, 0.085);
  battlementShape.closePath();
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    const b = bevelExtrude(battlementShape, 0.13, "rook-battlement", m.body, 0.012, 3);
    b.position.set(Math.cos(a) * 0.275, 1.435, Math.sin(a) * 0.275);
    b.rotation.y = -a;
    g.add(b);
  }
  return g;
}

function horseBodyShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.21, 0.02);
  s.bezierCurveTo(-0.28, 0.22, -0.23, 0.48, -0.11, 0.66);
  s.bezierCurveTo(-0.03, 0.78, 0.00, 0.94, 0.07, 1.05);
  s.bezierCurveTo(0.14, 1.16, 0.27, 1.23, 0.42, 1.22);
  s.bezierCurveTo(0.52, 1.21, 0.58, 1.14, 0.60, 1.07);
  s.bezierCurveTo(0.61, 1.01, 0.57, 0.96, 0.50, 0.93);
  s.bezierCurveTo(0.43, 0.90, 0.36, 0.88, 0.30, 0.83);
  s.bezierCurveTo(0.22, 0.76, 0.16, 0.64, 0.12, 0.51);
  s.bezierCurveTo(0.08, 0.36, 0.07, 0.21, 0.10, 0.08);
  s.bezierCurveTo(0.03, 0.00, -0.10, -0.03, -0.21, 0.02);
  return s;
}

function maneShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.17, 0.10);
  s.lineTo(-0.31, 0.28);
  s.lineTo(-0.23, 0.34);
  s.lineTo(-0.34, 0.44);
  s.lineTo(-0.24, 0.50);
  s.lineTo(-0.35, 0.61);
  s.lineTo(-0.23, 0.67);
  s.lineTo(-0.30, 0.80);
  s.lineTo(-0.18, 0.83);
  s.lineTo(-0.20, 0.98);
  s.lineTo(-0.07, 0.96);
  s.bezierCurveTo(-0.02, 0.73, -0.03, 0.46, -0.05, 0.18);
  s.closePath();
  return s;
}

function createKnight(m) {
  const g = new THREE.Group();
  addBase(g, m, 0.88);
  addCollar(g, m, 0.31, 0.40);

  const horse = bevelExtrude(horseBodyShape(), 0.34, "knight-sculpt", m.body, 0.042, 8);
  horse.position.set(-0.04, 0.44, -0.17);
  g.add(horse);

  const cheek = mesh(new THREE.SphereGeometry(0.105, 36, 24), m.body, 1.54, "knight-cheek");
  cheek.scale.set(1.15, 0.82, 0.65);
  cheek.position.x = 0.29;
  g.add(cheek);

  const jawShape = new THREE.Shape();
  jawShape.moveTo(-0.02, -0.03);
  jawShape.bezierCurveTo(0.08, -0.08, 0.20, -0.06, 0.30, 0.00);
  jawShape.bezierCurveTo(0.21, 0.08, 0.09, 0.10, -0.02, 0.06);
  jawShape.closePath();
  const jaw = bevelExtrude(jawShape, 0.22, "knight-jaw", m.body, 0.018, 5);
  jaw.position.set(0.22, 1.39, -0.11);
  g.add(jaw);

  const earShape = new THREE.Shape();
  earShape.moveTo(-0.035, 0);
  earShape.bezierCurveTo(-0.05, 0.12, -0.025, 0.24, 0, 0.31);
  earShape.bezierCurveTo(0.04, 0.22, 0.05, 0.10, 0.035, 0);
  earShape.closePath();
  for (const z of [-0.095, 0.095]) {
    const ear = bevelExtrude(earShape, 0.055, "knight-ear", m.body, 0.010, 4);
    ear.position.set(0.05, 1.72, z - 0.0275);
    ear.rotation.z = z < 0 ? -0.10 : 0.10;
    g.add(ear);
  }

  for (const z of [-0.181, 0.181]) {
    const eye = mesh(new THREE.SphereGeometry(0.028, 24, 16), m.eye, 1.59, "knight-eye");
    eye.position.set(0.31, 1.59, z);
    g.add(eye);
  }
  const nostril = mesh(new THREE.SphereGeometry(0.020, 20, 14), m.inset, 1.47, "knight-nostril");
  nostril.position.set(0.49, 1.47, 0.181);
  g.add(nostril);

  const mane = bevelExtrude(maneShape(), 0.12, "knight-mane", m.trim, 0.018, 5);
  mane.position.set(-0.10, 0.78, -0.06);
  g.add(mane);
  return g;
}

function mitreLobe(side) {
  const s = new THREE.Shape();
  const sign = side;
  s.moveTo(0.00, 0.00);
  s.bezierCurveTo(0.13 * sign, 0.08, 0.22 * sign, 0.23, 0.20 * sign, 0.40);
  s.bezierCurveTo(0.18 * sign, 0.58, 0.10 * sign, 0.78, 0.00, 0.95);
  s.bezierCurveTo(0.025 * sign, 0.67, 0.015 * sign, 0.36, 0.00, 0.00);
  s.closePath();
  return s;
}

function createBishop(m) {
  const g = new THREE.Group();
  addBase(g, m, 0.84);
  g.add(lathe([
    [0.27,0.00],[0.25,0.06],[0.22,0.16],[0.19,0.29],[0.165,0.45],[0.15,0.62],
    [0.15,0.77],[0.165,0.89],[0.195,0.98],[0.225,1.03],
  ], m.body, 0.29, "bishop-stem"));
  addCollar(g, m, 0.245, 1.34);

  const left = bevelExtrude(mitreLobe(-1), 0.22, "bishop-mitre-left", m.body, 0.026, 7);
  left.position.set(-0.018, 1.39, -0.11);
  left.rotation.z = -0.06;
  g.add(left);
  const right = bevelExtrude(mitreLobe(1), 0.22, "bishop-mitre-right", m.body, 0.026, 7);
  right.position.set(0.018, 1.39, -0.11);
  right.rotation.z = 0.06;
  g.add(right);

  const slitShape = new THREE.Shape();
  slitShape.moveTo(-0.025, -0.18);
  slitShape.lineTo(0.025, -0.18);
  slitShape.lineTo(0.19, 0.26);
  slitShape.lineTo(0.14, 0.28);
  slitShape.closePath();
  const slit = bevelExtrude(slitShape, 0.235, "bishop-slit", m.inset, 0.008, 2);
  slit.position.set(0.00, 1.78, -0.117);
  g.add(slit);
  addGem(g, m, 0, 1.99, 0.13, 0.72, "bishop-gem");
  return g;
}

function crownPetal(material, role) {
  const s = new THREE.Shape();
  s.moveTo(-0.055, 0);
  s.bezierCurveTo(-0.07, 0.12, -0.035, 0.28, 0, 0.39);
  s.bezierCurveTo(0.035, 0.28, 0.07, 0.12, 0.055, 0);
  s.closePath();
  return bevelExtrude(s, 0.075, role, material, 0.012, 4);
}

function createQueen(m) {
  const g = new THREE.Group();
  addBase(g, m, 0.89);
  g.add(lathe([
    [0.285,0.00],[0.264,0.06],[0.235,0.16],[0.205,0.30],[0.177,0.47],[0.158,0.65],
    [0.157,0.82],[0.17,0.95],[0.20,1.05],[0.24,1.11],
  ], m.body, 0.29, "queen-stem"));
  addCollar(g, m, 0.255, 1.43);
  g.add(mesh(new THREE.CylinderGeometry(0.255, 0.235, 0.12, 72, 2), m.body, 1.54, "queen-crown-base"));
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    const petal = crownPetal(m.body, "queen-crown-point");
    petal.position.set(Math.cos(a) * 0.205, 1.57, Math.sin(a) * 0.205);
    petal.rotation.y = -a + Math.PI / 2;
    petal.rotation.z = -0.12;
    g.add(petal);
    addGem(g, m, Math.cos(a) * 0.20, 1.91, Math.sin(a) * 0.20, 0.50, "queen-crown-gem");
  }
  addGem(g, m, 0, 1.99, 0, 0.82, "queen-center-gem");
  return g;
}

function createKing(m) {
  const g = new THREE.Group();
  addBase(g, m, 0.91);
  g.add(lathe([
    [0.29,0.00],[0.27,0.06],[0.24,0.16],[0.208,0.31],[0.179,0.49],[0.158,0.68],
    [0.157,0.85],[0.171,0.99],[0.204,1.10],[0.245,1.17],
  ], m.body, 0.29, "king-stem"));
  addCollar(g, m, 0.262, 1.49);
  g.add(mesh(new THREE.CylinderGeometry(0.225, 0.25, 0.16, 72, 3), m.body, 1.62, "king-crown"));
  g.add(mesh(new THREE.SphereGeometry(0.10, 40, 26), m.trim, 1.78, "king-orb"));
  const s = new THREE.Shape();
  s.moveTo(-0.035, 0); s.lineTo(0.035, 0); s.lineTo(0.035, 0.12); s.lineTo(0.13, 0.12);
  s.lineTo(0.13, 0.20); s.lineTo(0.035, 0.20); s.lineTo(0.035, 0.34); s.lineTo(-0.035, 0.34);
  s.lineTo(-0.035, 0.20); s.lineTo(-0.13, 0.20); s.lineTo(-0.13, 0.12); s.lineTo(-0.035, 0.12); s.closePath();
  const cross = bevelExtrude(s, 0.085, "king-cross", m.body, 0.014, 4);
  cross.position.set(0, 1.89, -0.042);
  g.add(cross);
  addGem(g, m, 0, 2.21, 0.05, 0.52, "king-gem");
  return g;
}

const BUILDERS = { pawn: createPawn, rook: createRook, knight: createKnight, bishop: createBishop, queen: createQueen, king: createKing };

export function countObjectTriangles(object) {
  let triangles = 0;
  object?.traverse?.((child) => {
    if (!child.isMesh) return;
    const geometry = child.geometry;
    triangles += geometry?.index?.count ? Math.floor(geometry.index.count / 3) : Math.floor((geometry?.attributes?.position?.count ?? 0) / 3);
  });
  return triangles;
}

export function countUniquePieceResources(object) {
  const geometries = new Set(); const materials = new Set(); const textures = new Set(); let meshes = 0;
  object?.traverse?.((child) => {
    if (!child.isMesh) return;
    meshes += 1;
    if (child.geometry) geometries.add(child.geometry.uuid);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (!material) continue;
      materials.add(material.uuid);
      for (const tex of [material.map, material.bumpMap, material.roughnessMap]) if (tex) textures.add(tex.uuid);
    }
  });
  return { meshes, uniqueGeometries: geometries.size, uniqueMaterials: materials.size, uniqueTextures: textures.size };
}

export class OpenSourceStauntonV13PieceSet {
  constructor() { this.templates = new Map(); this.stats = new Map(); }
  key(type, side) { return `${type}:${side}`; }
  create(type, side) {
    const safeType = TYPES.includes(type) ? type : "pawn";
    const safeSide = side === "black" ? "black" : "white";
    const key = this.key(safeType, safeSide);
    if (!this.templates.has(key)) {
      const raw = BUILDERS[safeType](materialsFor(safeType, safeSide));
      const fitted = fit(raw, safeType);
      fitted.userData.forgeVisualSource = SOURCE_ID;
      fitted.userData.openSourceStauntonRevision = REVISION;
      fitted.userData.referenceAssetsPolicy = "reference-only-not-runtime";
      fitted.userData.freeForPublicRenderer = true;
      fitted.userData.roleTextureKey = `${safeType}:${safeSide}`;
      this.templates.set(key, fitted);
      this.stats.set(key, this.inspectObject(fitted, safeType, safeSide));
    }
    const clone = this.templates.get(key).clone(true);
    clone.userData = { ...this.templates.get(key).userData };
    return clone;
  }
  inspectObject(object, type, side) {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const envelope = pieceCellEnvelope(type);
    const resources = countUniquePieceResources(object);
    return {
      type, side, revision: REVISION, style: "Open-source sculpted Staunton v13", runtimePrimarySource: SOURCE_ID,
      referenceAssetsPolicy: "reference-only-not-runtime", freeForPublicRenderer: true,
      triangles: countObjectTriangles(object), meshes: resources.meshes, uniqueGeometries: resources.uniqueGeometries,
      uniqueMaterials: resources.uniqueMaterials, uniqueTextures: resources.uniqueTextures,
      width: size.x, height: size.y, depth: size.z, bounds: { x: size.x, y: size.y, z: size.z },
      finite: [size.x, size.y, size.z].every(Number.isFinite),
      fitsCell: size.x <= envelope.maxFootprint + 1e-6 && size.z <= envelope.maxFootprint + 1e-6,
      fitsLevel: size.y <= envelope.maxHeight + 1e-6, roleTextureKey: object.userData.roleTextureKey,
    };
  }
  inspect(type, side = "white") {
    const t = TYPES.includes(type) ? type : "pawn"; const s = side === "black" ? "black" : "white"; const key = this.key(t, s);
    if (!this.stats.has(key)) this.create(t, s);
    return { ...this.stats.get(key) };
  }
  inspectAll(side = "white") { return TYPES.map((type) => this.inspect(type, side)); }
}

export const OPEN_SOURCE_STAUNTON_REVISION = REVISION;
export const OPEN_SOURCE_STAUNTON_SOURCE_ID = SOURCE_ID;
export const OPEN_SOURCE_STAUNTON_TYPES = TYPES;
export function getRoleTexture(type, side) { return makeRoleTexture(type, side); }
