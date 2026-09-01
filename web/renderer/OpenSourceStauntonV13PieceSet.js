import * as THREE from "three";
import {
  OpenSourceStauntonV12PieceSet,
  countObjectTriangles,
  countUniquePieceResources,
} from "./OpenSourceStauntonV12PieceSet.js";
import { pieceCellEnvelope } from "./pieceScaleProfile.js";

const REVISION = "2026-09-01-open-source-staunton-v13-silhouette-pass";
const SOURCE_ID = "open-source-staunton-v13-silhouette-pass";
const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

function roleOf(child) {
  return child?.userData?.openSourceStauntonRole ?? child?.userData?.forgePremiumRole ?? null;
}

function removeRoles(group, roles) {
  const doomed = [];
  group.traverse((child) => {
    if (child !== group && roles.has(roleOf(child))) doomed.push(child);
  });
  for (const child of doomed) child.parent?.remove(child);
}

function mark(mesh, role) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.openSourceStauntonRole = role;
  mesh.userData.forgePremiumRole = role;
  return mesh;
}

function materialsOf(group) {
  let body = null;
  let trim = null;
  let inset = null;
  group.traverse((child) => {
    if (!child.isMesh) return;
    const role = roleOf(child);
    if (!body && (role === "base" || role?.endsWith("-stem") || role === "knight-sculpt")) body = child.material;
    if (!trim && (role === "base-trim" || role?.includes("gem") || role === "collar-trim")) trim = child.material;
    if (!inset && (role?.includes("slit") || role?.includes("recess") || role?.includes("nostril"))) inset = child.material;
  });
  return { body, trim: trim ?? body, inset: inset ?? body };
}

function refit(group, type) {
  const envelope = pieceCellEnvelope(type);
  group.position.set(0, 0, 0);
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const scale = Math.min(
    envelope.maxHeight / size.y,
    envelope.maxFootprint / size.x,
    envelope.maxFootprint / size.z,
  );
  group.scale.setScalar(scale);
  group.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.position.y -= box.min.y;
  group.updateMatrixWorld(true);
  return group;
}

function correctKnight(group) {
  const { body, trim, inset } = materialsOf(group);
  removeRoles(group, new Set(["knight-mane", "knight-brow"]));

  // The v12 cyan slab read as a fin, not a horse mane. Replace it with one
  // narrow continuous ridge following the rear S-curve of the neck.
  const maneCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.225, 0.99, 0),
    new THREE.Vector3(-0.238, 1.12, 0),
    new THREE.Vector3(-0.220, 1.27, 0),
    new THREE.Vector3(-0.182, 1.42, 0),
    new THREE.Vector3(-0.132, 1.56, 0),
    new THREE.Vector3(-0.078, 1.68, 0),
    new THREE.Vector3(-0.028, 1.79, 0),
    new THREE.Vector3(0.005, 1.86, 0),
  ]);
  const mane = mark(new THREE.Mesh(
    new THREE.TubeGeometry(maneCurve, 48, 0.027, 8, false),
    body,
  ), "knight-mane");
  mane.scale.z = 0.72;
  group.add(mane);

  // Add a restrained metallic crest line rather than painting the whole mane cyan.
  const crest = mark(new THREE.Mesh(
    new THREE.TubeGeometry(maneCurve, 48, 0.009, 6, false),
    trim,
  ), "knight-mane-trim");
  crest.position.z = 0.020;
  group.add(crest);

  // Sharpen the muzzle and brow silhouette while keeping them volumetric.
  const muzzle = mark(new THREE.Mesh(new THREE.SphereGeometry(0.105, 36, 24), body), "knight-muzzle-shell");
  muzzle.position.set(0.545, 1.405, 0);
  muzzle.scale.set(1.18, 0.56, 0.78);
  group.add(muzzle);

  const brow = mark(new THREE.Mesh(new THREE.SphereGeometry(0.068, 32, 20), body), "knight-brow");
  brow.position.set(0.255, 1.665, 0);
  brow.scale.set(1.20, 0.38, 0.90);
  group.add(brow);

  // Small dark mouth line makes the head read as a horse at mobile distance.
  const mouth = mark(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.018), inset), "knight-mouth");
  mouth.position.set(0.535, 1.365, 0.074);
  mouth.rotation.z = -0.12;
  group.add(mouth);
}

function correctBishop(group) {
  const { trim, inset } = materialsOf(group);
  removeRoles(group, new Set(["bishop-slit", "bishop-gem"]));

  // Keep the physical two-lobe mitre, but replace the huge colored wedge with
  // a narrow recessed diagonal mark that follows the classical bishop cut.
  const slit = mark(new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.34, 0.12, 1, 8, 1), inset), "bishop-slit");
  slit.position.set(0.012, 1.62, 0.105);
  slit.rotation.z = -0.56;
  group.add(slit);

  const gem = mark(new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 1), trim), "bishop-gem");
  gem.position.set(0, 1.73, 0.135);
  gem.scale.set(0.72, 1.20, 0.52);
  group.add(gem);
}

function correctRook(group) {
  const { trim } = materialsOf(group);
  // Thin crown band gives the tower a deliberate architectural top without
  // changing the eight real battlements.
  const band = mark(new THREE.Mesh(new THREE.TorusGeometry(0.292, 0.012, 12, 64), trim), "rook-crown-trim");
  band.position.y = 1.325;
  band.rotation.x = Math.PI / 2;
  group.add(band);
}

function correctQueen(group) {
  const { body, trim } = materialsOf(group);
  removeRoles(group, new Set(["queen-crown-point", "queen-gem", "queen-center-gem"]));
  const prongGeometry = new THREE.ConeGeometry(0.047, 0.215, 18, 2);
  const tipGeometry = new THREE.OctahedronGeometry(0.030, 1);
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    const prong = mark(new THREE.Mesh(prongGeometry, body), "queen-crown-point");
    prong.position.set(Math.cos(a) * 0.205, 1.555, Math.sin(a) * 0.205);
    prong.rotation.z = Math.sin(a) * 0.10;
    prong.rotation.x = -Math.cos(a) * 0.10;
    group.add(prong);
    const tip = mark(new THREE.Mesh(tipGeometry, trim), "queen-gem");
    tip.position.set(Math.cos(a) * 0.205, 1.675, Math.sin(a) * 0.205);
    tip.scale.set(0.78, 1.20, 0.78);
    group.add(tip);
  }
  const center = mark(new THREE.Mesh(new THREE.OctahedronGeometry(0.050, 1), trim), "queen-center-gem");
  center.position.set(0, 1.575, 0);
  center.scale.set(0.82, 1.30, 0.82);
  group.add(center);
}

function correctKing(group) {
  const { trim } = materialsOf(group);
  const halo = mark(new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.011, 12, 56), trim), "king-crown-trim");
  halo.position.y = 1.555;
  halo.rotation.x = Math.PI / 2;
  group.add(halo);
}

function applySilhouettePass(group, type) {
  if (type === "knight") correctKnight(group);
  if (type === "bishop") correctBishop(group);
  if (type === "rook") correctRook(group);
  if (type === "queen") correctQueen(group);
  if (type === "king") correctKing(group);
  return refit(group, type);
}

export class OpenSourceStauntonV13PieceSet {
  constructor() {
    this.base = new OpenSourceStauntonV12PieceSet();
    this.templates = new Map();
    this.stats = new Map();
  }

  key(type, side) { return `${type}:${side}`; }

  create(type, side = "white") {
    const safeType = TYPES.includes(type) ? type : "pawn";
    const safeSide = side === "black" ? "black" : "white";
    const key = this.key(safeType, safeSide);
    if (!this.templates.has(key)) {
      const object = applySilhouettePass(this.base.create(safeType, safeSide), safeType);
      object.userData = {
        ...object.userData,
        forgeVisualSource: SOURCE_ID,
        openSourceStauntonRevision: REVISION,
        referenceAssetsPolicy: "reference-only-not-runtime",
        freeForPublicRenderer: true,
      };
      this.templates.set(key, object);
      this.stats.set(key, this.inspectObject(object, safeType, safeSide));
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
      type,
      side,
      revision: REVISION,
      style: "Open-source Staunton v13 silhouette correction",
      runtimePrimarySource: SOURCE_ID,
      referenceAssetsPolicy: "reference-only-not-runtime",
      freeForPublicRenderer: true,
      triangles: countObjectTriangles(object),
      meshes: resources.meshes,
      uniqueGeometries: resources.uniqueGeometries,
      uniqueMaterials: resources.uniqueMaterials,
      uniqueTextures: resources.uniqueTextures,
      width: size.x,
      height: size.y,
      depth: size.z,
      bounds: { x: size.x, y: size.y, z: size.z },
      finite: [size.x, size.y, size.z].every(Number.isFinite),
      fitsCell: size.x <= envelope.maxFootprint + 1e-6 && size.z <= envelope.maxFootprint + 1e-6,
      fitsLevel: size.y <= envelope.maxHeight + 1e-6,
      roleTextureKey: object.userData.roleTextureKey,
    };
  }

  inspect(type, side = "white") {
    const safeType = TYPES.includes(type) ? type : "pawn";
    const safeSide = side === "black" ? "black" : "white";
    const key = this.key(safeType, safeSide);
    if (!this.stats.has(key)) this.create(safeType, safeSide);
    return { ...this.stats.get(key) };
  }

  inspectAll(side = "white") { return TYPES.map((type) => this.inspect(type, side)); }
}

export class OpenSourceStauntonPieceSet extends OpenSourceStauntonV13PieceSet {}
export const OPEN_SOURCE_STAUNTON_REVISION = REVISION;
export const OPEN_SOURCE_STAUNTON_SOURCE_ID = SOURCE_ID;
export const OPEN_SOURCE_STAUNTON_TYPES = TYPES;
export { countObjectTriangles, countUniquePieceResources };
