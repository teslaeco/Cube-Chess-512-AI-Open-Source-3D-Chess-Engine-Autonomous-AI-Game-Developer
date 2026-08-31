import * as THREE from "three";
import { CELL_RENDER_SIZE, LEVEL_SPACING } from "./coordinates.js";

// Open-source contest renderer based on classical Staunton proportions.
// FIDE reference ratios are adapted to the 8x8x8 board envelope rather than copied at real-world scale.
const LATHE_SEGMENTS = 72;
const TORUS_RADIAL = 14;
const TORUS_TUBULAR = 56;
const OPEN_SOURCE_REVISION = "2026-08-31-opensource-staunton-v6";

const SAFE_FIT = Object.freeze({
  pawn: Object.freeze({ maxHeight: LEVEL_SPACING * 0.31, maxFootprint: CELL_RENDER_SIZE * 0.42 }),
  rook: Object.freeze({ maxHeight: LEVEL_SPACING * 0.34, maxFootprint: CELL_RENDER_SIZE * 0.45 }),
  knight: Object.freeze({ maxHeight: LEVEL_SPACING * 0.37, maxFootprint: CELL_RENDER_SIZE * 0.46 }),
  bishop: Object.freeze({ maxHeight: LEVEL_SPACING * 0.43, maxFootprint: CELL_RENDER_SIZE * 0.46 }),
  queen: Object.freeze({ maxHeight: LEVEL_SPACING * 0.52, maxFootprint: CELL_RENDER_SIZE * 0.48 }),
  king: Object.freeze({ maxHeight: LEVEL_SPACING * 0.58, maxFootprint: CELL_RENDER_SIZE * 0.49 }),
});

const materialCache = new Map();
const sharedEdgeMaterials = new Map();

function makeMaterial(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: options.metalness ?? 0.18,
    roughness: options.roughness ?? 0.38,
    clearcoat: options.clearcoat ?? 0.55,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.28,
    reflectivity: options.reflectivity ?? 0.55,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });
}

function materialsFor(color) {
  if (materialCache.has(color)) return materialCache.get(color);
  const white = color === "white";
  const set = white ? {
    body: makeMaterial(0xeee9dc, { metalness: 0.08, roughness: 0.42, clearcoat: 0.42 }),
    trim: makeMaterial(0xc9b37e, { metalness: 0.45, roughness: 0.32, clearcoat: 0.5 }),
    inset: makeMaterial(0x5b6773, { metalness: 0.25, roughness: 0.5 }),
    eye: makeMaterial(0x24394d, { metalness: 0.2, roughness: 0.35 }),
    edge: 0x4c5b68,
  } : {
    body: makeMaterial(0x171a1f, { metalness: 0.28, roughness: 0.34, clearcoat: 0.5 }),
    trim: makeMaterial(0x8c5a34, { metalness: 0.42, roughness: 0.34, clearcoat: 0.45 }),
    inset: makeMaterial(0x060708, { metalness: 0.18, roughness: 0.54 }),
    eye: makeMaterial(0xb88a55, { metalness: 0.34, roughness: 0.3 }),
    edge: 0xa4adb6,
  };
  materialCache.set(color, set);
  return set;
}

function mark(mesh, role) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.forgePremiumRole = role;
  mesh.userData.openSourceStauntonRole = role;
  return mesh;
}

function mesh(geometry, material, y = 0, role = "surface") {
  const out = mark(new THREE.Mesh(geometry, material), role);
  out.position.y = y;
  return out;
}

function lathe(profile, material, y = 0, role = "surface") {
  return mesh(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), LATHE_SEGMENTS), material, y, role);
}

function addRing(group, material, radius, y, tube = 0.022, role = "ring") {
  const ring = mesh(new THREE.TorusGeometry(radius, tube, TORUS_RADIAL, TORUS_TUBULAR), material, y, role);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
}

function addClassicalBase(group, m, scale = 1) {
  group.add(lathe([
    [0.00, 0.00], [0.34 * scale, 0.00], [0.46 * scale, 0.025], [0.50 * scale, 0.055],
    [0.51 * scale, 0.085], [0.48 * scale, 0.115], [0.43 * scale, 0.145], [0.40 * scale, 0.185],
    [0.38 * scale, 0.23], [0.36 * scale, 0.275],
  ], m.body, 0, "base"));
  addRing(group, m.trim, 0.455 * scale, 0.105, 0.018, "base-trim");
  addRing(group, m.body, 0.38 * scale, 0.265, 0.012, "base-lip");
}

function addNeckRing(group, m, radius, y, tube = 0.018) {
  addRing(group, m.trim, radius, y, tube, "neck-ring");
}

function fitInsideCell(group, type) {
  const envelope = SAFE_FIT[type] ?? SAFE_FIT.pawn;
  group.position.set(0, 0, 0);
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((v) => Number.isFinite(v) && v > 0)) throw new Error(`Invalid ${type} geometry bounds`);
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

function addReadabilityEdges(group, m) {
  const key = String(m.edge);
  let edgeMaterial = sharedEdgeMaterials.get(key);
  if (!edgeMaterial) {
    edgeMaterial = new THREE.LineBasicMaterial({ color: m.edge, transparent: true, opacity: 0.42, depthWrite: false });
    sharedEdgeMaterials.set(key, edgeMaterial);
  }
  const important = new Set(["head", "crown", "battlement", "mitre-left", "mitre-right", "knight-body", "muzzle", "ear", "mane", "cross"]);
  const targets = [];
  group.traverse((child) => { if (child.isMesh && important.has(child.userData?.openSourceStauntonRole)) targets.push(child); });
  for (const child of targets) {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(child.geometry, 28), edgeMaterial);
    edges.position.copy(child.position);
    edges.rotation.copy(child.rotation);
    edges.scale.copy(child.scale).multiplyScalar(1.002);
    edges.userData.decorative = true;
    child.parent.add(edges);
  }
}

function createPawn(m) {
  const g = new THREE.Group();
  addClassicalBase(g, m, 0.88);
  g.add(lathe([
    [0.30,0], [0.28,0.04], [0.24,0.11], [0.205,0.22], [0.185,0.38], [0.18,0.52],
    [0.20,0.62], [0.24,0.69], [0.255,0.735], [0.215,0.77],
  ], m.body, 0.275, "stem"));
  addNeckRing(g, m, 0.215, 1.02, 0.017);
  const head = mesh(new THREE.SphereGeometry(0.225, 48, 32), m.body, 1.235, "head");
  g.add(head);
  return g;
}

function createRook(m) {
  const g = new THREE.Group();
  addClassicalBase(g, m, 0.94);
  g.add(lathe([
    [0.30,0], [0.285,0.07], [0.255,0.14], [0.225,0.28], [0.21,0.49], [0.21,0.68],
    [0.235,0.78], [0.285,0.86], [0.315,0.90],
  ], m.body, 0.28, "tower"));
  addNeckRing(g, m, 0.30, 1.12, 0.022);
  const crown = mesh(new THREE.CylinderGeometry(0.35, 0.32, 0.22, 48, 2), m.body, 1.25, "crown");
  g.add(crown);
  const inset = mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.11, 48, 1), m.inset, 1.34, "recess");
  g.add(inset);
  const battlementGeometry = new THREE.BoxGeometry(0.16, 0.24, 0.16, 2, 3, 2);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const block = mesh(battlementGeometry, m.body, 1.48, "battlement");
    block.position.set(Math.cos(a) * 0.285, 1.48, Math.sin(a) * 0.285);
    block.rotation.y = -a + Math.PI / 4;
    g.add(block);
  }
  return g;
}

function bishopHalfShape(side = 1) {
  const s = new THREE.Shape();
  s.moveTo(0.00, -0.30);
  s.quadraticCurveTo(0.16 * side, -0.16, 0.16 * side, 0.03);
  s.quadraticCurveTo(0.15 * side, 0.20, 0.04 * side, 0.34);
  s.lineTo(0.015 * side, 0.10);
  s.lineTo(-0.06 * side, -0.03);
  s.quadraticCurveTo(-0.05 * side, -0.18, 0.00, -0.30);
  return s;
}

function createBishop(m) {
  const g = new THREE.Group();
  addClassicalBase(g, m, 0.90);
  g.add(lathe([
    [0.29,0], [0.27,0.06], [0.235,0.14], [0.19,0.30], [0.155,0.50], [0.145,0.64],
    [0.17,0.75], [0.225,0.84], [0.245,0.88], [0.205,0.93],
  ], m.body, 0.28, "stem"));
  addNeckRing(g, m, 0.22, 1.14, 0.018);
  const opts = { depth: 0.22, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: 0.025, bevelThickness: 0.025, curveSegments: 20 };
  const left = mesh(new THREE.ExtrudeGeometry(bishopHalfShape(-1), opts), m.body, 1.47, "mitre-left");
  const right = mesh(new THREE.ExtrudeGeometry(bishopHalfShape(1), opts), m.body, 1.47, "mitre-right");
  left.position.z = -0.11; right.position.z = -0.11;
  left.rotation.z = -0.08; right.rotation.z = 0.08;
  g.add(left, right);
  const notch = mesh(new THREE.BoxGeometry(0.035, 0.42, 0.30, 2, 10, 2), m.inset, 1.54, "bishop-notch");
  notch.rotation.z = 0.58;
  g.add(notch);
  return g;
}

function createQueen(m) {
  const g = new THREE.Group();
  addClassicalBase(g, m, 0.94);
  g.add(lathe([
    [0.30,0], [0.28,0.06], [0.245,0.15], [0.20,0.32], [0.16,0.56], [0.15,0.72],
    [0.18,0.83], [0.235,0.92], [0.285,0.97], [0.25,1.02],
  ], m.body, 0.28, "stem"));
  addNeckRing(g, m, 0.26, 1.31, 0.02);
  const crownBase = mesh(new THREE.CylinderGeometry(0.255, 0.275, 0.12, 48, 2), m.body, 1.40, "crown");
  g.add(crownBase);
  const pointGeometry = new THREE.ConeGeometry(0.055, 0.28, 20, 2);
  const orbGeometry = new THREE.SphereGeometry(0.042, 20, 14);
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    const point = mesh(pointGeometry, m.body, 1.58, "crown");
    point.position.set(Math.cos(a) * 0.225, 1.58, Math.sin(a) * 0.225);
    point.rotation.z = -Math.cos(a) * 0.12;
    point.rotation.x = Math.sin(a) * 0.12;
    g.add(point);
    const orb = mesh(orbGeometry, m.trim, 1.74, "crown-orb");
    orb.position.set(Math.cos(a) * 0.225, 1.74, Math.sin(a) * 0.225);
    g.add(orb);
  }
  const top = mesh(new THREE.SphereGeometry(0.10, 32, 20), m.trim, 1.64, "head");
  g.add(top);
  return g;
}

function createKing(m) {
  const g = new THREE.Group();
  addClassicalBase(g, m, 0.96);
  g.add(lathe([
    [0.31,0], [0.29,0.06], [0.25,0.15], [0.205,0.34], [0.165,0.60], [0.155,0.76],
    [0.19,0.88], [0.25,0.96], [0.30,1.02], [0.265,1.08],
  ], m.body, 0.28, "stem"));
  addNeckRing(g, m, 0.275, 1.38, 0.022);
  const crown = mesh(new THREE.CylinderGeometry(0.23, 0.27, 0.20, 48, 2), m.body, 1.52, "crown");
  g.add(crown);
  const orb = mesh(new THREE.SphereGeometry(0.115, 36, 24), m.trim, 1.69, "head");
  g.add(orb);
  const vertical = mesh(new THREE.BoxGeometry(0.075, 0.45, 0.075, 2, 8, 2), m.body, 2.02, "cross");
  const horizontal = mesh(new THREE.BoxGeometry(0.36, 0.075, 0.075, 8, 2, 2), m.body, 2.04, "cross");
  g.add(vertical, horizontal);
  return g;
}

function createKnightShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.28, -0.42);
  s.bezierCurveTo(-0.34, -0.10, -0.31, 0.20, -0.17, 0.43);
  s.bezierCurveTo(-0.07, 0.60, 0.05, 0.70, 0.14, 0.83);
  s.bezierCurveTo(0.23, 0.94, 0.31, 0.96, 0.38, 0.89);
  s.lineTo(0.48, 0.77);
  s.bezierCurveTo(0.58, 0.68, 0.56, 0.56, 0.42, 0.50);
  s.lineTo(0.26, 0.43);
  s.bezierCurveTo(0.18, 0.32, 0.16, 0.21, 0.18, 0.08);
  s.bezierCurveTo(0.19, -0.10, 0.13, -0.28, 0.02, -0.42);
  s.closePath();
  return s;
}

function createKnight(m) {
  const g = new THREE.Group();
  addClassicalBase(g, m, 0.94);
  g.add(lathe([
    [0.30,0], [0.28,0.06], [0.24,0.15], [0.215,0.30], [0.22,0.44], [0.27,0.54], [0.30,0.58],
  ], m.body, 0.28, "pedestal"));
  const opts = { depth: 0.34, bevelEnabled: true, bevelSegments: 6, steps: 1, bevelSize: 0.055, bevelThickness: 0.055, curveSegments: 28 };
  const body = mesh(new THREE.ExtrudeGeometry(createKnightShape(), opts), m.body, 1.08, "knight-body");
  body.position.x = -0.05;
  body.position.z = -0.17;
  body.scale.set(0.72, 0.72, 0.72);
  g.add(body);
  const cheek = mesh(new THREE.SphereGeometry(0.20, 36, 24), m.body, 1.58, "head");
  cheek.position.x = 0.13; cheek.scale.set(1.15, 0.86, 0.82); g.add(cheek);
  const muzzle = mesh(new THREE.CylinderGeometry(0.115, 0.145, 0.34, 28, 4), m.body, 1.49, "muzzle");
  muzzle.rotation.z = Math.PI / 2 - 0.12; muzzle.position.x = 0.35; muzzle.scale.z = 0.78; g.add(muzzle);
  const jaw = mesh(new THREE.SphereGeometry(0.12, 28, 18), m.body, 1.44, "muzzle");
  jaw.position.x = 0.49; jaw.scale.set(1.15, 0.72, 0.68); g.add(jaw);
  for (const side of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.055, 0.23, 20, 3), m.body, 1.84, "ear");
    ear.position.set(0.04, 1.84, side * 0.11); ear.rotation.z = -0.10; ear.rotation.x = side * 0.08; g.add(ear);
    const eye = mesh(new THREE.SphereGeometry(0.027, 20, 14), m.eye, 1.66, "eye");
    eye.position.set(0.28, 1.66, side * 0.17); g.add(eye);
  }
  const maneGeometry = new THREE.ConeGeometry(0.045, 0.18, 16, 2);
  for (let i = 0; i < 8; i += 1) {
    const mane = mesh(maneGeometry, m.trim, 1.30 + i * 0.075, "mane");
    mane.position.x = -0.24 + i * 0.015;
    mane.rotation.z = -Math.PI / 2 - 0.08;
    g.add(mane);
  }
  return g;
}

const BUILDERS = { pawn: createPawn, rook: createRook, knight: createKnight, bishop: createBishop, queen: createQueen, king: createKing };

export function countObjectTriangles(object, { includeDecorative = false } = {}) {
  let triangles = 0;
  object?.traverse?.((child) => {
    if (!child.isMesh) return;
    if (!includeDecorative && child.userData?.decorative) return;
    const geometry = child.geometry;
    if (geometry?.index?.count) triangles += Math.floor(geometry.index.count / 3);
    else triangles += Math.floor((geometry?.attributes?.position?.count ?? 0) / 3);
  });
  return triangles;
}

export function countUniquePieceResources(object) {
  const geometries = new Set(); const materials = new Set(); let meshes = 0;
  object?.traverse?.((child) => {
    if (!child.isMesh) return;
    meshes += 1;
    if (child.geometry) geometries.add(child.geometry.uuid);
    const list = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of list) if (material) materials.add(material.uuid);
  });
  return { meshes, uniqueGeometries: geometries.size, uniqueMaterials: materials.size };
}

function cloneTemplate(template) {
  const clone = template.clone(true);
  clone.traverse((child) => { if (child.userData) child.userData = { ...child.userData }; });
  return clone;
}

export class OpenSourceStauntonPieceSet {
  constructor() { this.templates = new Map(); this.stats = new Map(); }
  templateKey(type, color) { return `${type}:${color}`; }
  buildTemplate(type, color) {
    const builder = BUILDERS[type] ?? BUILDERS.pawn;
    const m = materialsFor(color);
    const group = builder(m);
    group.name = `${color}-${type}-open-source-staunton-template`;
    fitInsideCell(group, type);
    addReadabilityEdges(group, m);
    fitInsideCell(group, type);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const triangles = countObjectTriangles(group);
    const envelope = SAFE_FIT[type] ?? SAFE_FIT.pawn;
    const resources = countUniquePieceResources(group);
    group.userData.forgeVisualSource = "open-source-staunton-v6";
    group.userData.forgePremiumRevision = OPEN_SOURCE_REVISION;
    group.userData.openSourceStauntonRevision = OPEN_SOURCE_REVISION;
    group.userData.openSourceStauntonType = type;
    group.userData.openSourceStauntonColor = color;
    group.userData.openSourceStauntonTriangles = triangles;
    this.stats.set(this.templateKey(type, color), {
      type, color, triangles, bounds: { x: size.x, y: size.y, z: size.z }, resources,
      finite: [size.x, size.y, size.z].every((v) => Number.isFinite(v) && v > 0),
      fitsLevel: size.y <= envelope.maxHeight + 1e-6,
      fitsCell: size.x <= envelope.maxFootprint + 1e-6 && size.z <= envelope.maxFootprint + 1e-6,
      maxHeight: envelope.maxHeight, maxFootprint: envelope.maxFootprint,
      levelSpacing: LEVEL_SPACING, cellRenderSize: CELL_RENDER_SIZE,
      style: "Staunton-inspired open-source 3D",
      revision: OPEN_SOURCE_REVISION,
    });
    return group;
  }
  getTemplate(type, color) {
    const key = this.templateKey(type, color);
    if (!this.templates.has(key)) this.templates.set(key, this.buildTemplate(type, color));
    return this.templates.get(key);
  }
  create(type, color) {
    const template = this.getTemplate(type, color);
    const result = cloneTemplate(template);
    result.name = `${color}-${type}-open-source-staunton`;
    result.userData = { ...template.userData };
    return result;
  }
  inspect(type, color = "white") { this.getTemplate(type, color); return this.stats.get(this.templateKey(type, color)); }
  inspectAll() { return Object.keys(BUILDERS).map((type) => this.inspect(type, "white")); }
}

// Compatibility export used by existing WebMCP visual tools. The implementation is now open-source Staunton v6, not the old premium/crystal set.
export class ForgeMcpPremiumPieceSet extends OpenSourceStauntonPieceSet {}
export const FORGEMCP_PREMIUM_REVISION = OPEN_SOURCE_REVISION;
export const FORGEMCP_PREMIUM_SAFE_FIT = SAFE_FIT;
export const OPEN_SOURCE_STAUNTON_REVISION = OPEN_SOURCE_REVISION;
export const OPEN_SOURCE_STAUNTON_SAFE_FIT = SAFE_FIT;
