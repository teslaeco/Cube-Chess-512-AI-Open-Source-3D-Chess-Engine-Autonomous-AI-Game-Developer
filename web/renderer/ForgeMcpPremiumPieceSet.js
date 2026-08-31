import * as THREE from "three";
import {
  OpenSourceStauntonV8PieceSet,
  countObjectTriangles,
  countUniquePieceResources,
} from "./OpenSourceStauntonV8PieceSet.js";
import { pieceCellEnvelope, PIECE_CELL_ENVELOPE } from "./pieceScaleProfile.js";

// NORMAL / PUBLIC / OPEN-SOURCE renderer for every player.
// Uploaded chess source assets are REFERENCE ONLY. They are not loaded, copied, or rendered here.
// The live game uses newly generated Three.js geometry derived from the project's own procedural set.
const REVISION = "2026-09-01-open-source-reference-guided-v9";
const SOURCE_ID = "open-source-reference-guided-generated-v9";
const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

const detailMaterials = new Map();
function detailMaterial(color) {
  if (detailMaterials.has(color)) return detailMaterials.get(color);
  const m = new THREE.MeshPhysicalMaterial({
    color: color === "white" ? 0xd7bf83 : 0x9b643b,
    metalness: 0.38,
    roughness: 0.28,
    clearcoat: 0.48,
    clearcoatRoughness: 0.22,
  });
  detailMaterials.set(color, m);
  return m;
}

function mark(mesh, role) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.openSourceStauntonRole = role;
  mesh.userData.referenceGuidedDetail = true;
  mesh.userData.forgePremiumRole = role; // compatibility marker only; no paid tier exists.
  return mesh;
}

function wedgeGeometry(width = 0.08, height = 0.12, depth = 0.035) {
  const w = width / 2;
  const d = depth / 2;
  const positions = [
    -w, 0, -d,  w, 0, -d,  w, 0, d, -w, 0, d,
    -w * 0.45, height, -d * 0.55, w * 0.45, height, -d * 0.55,
    w * 0.45, height, d * 0.55, -w * 0.45, height, d * 0.55,
  ];
  const indices = [
    0,1,2, 0,2,3,
    4,7,6, 4,6,5,
    0,4,5, 0,5,1,
    1,5,6, 1,6,2,
    2,6,7, 2,7,3,
    3,7,4, 3,4,0,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function diamondGeometry(radius = 0.055, height = 0.12) {
  const g = new THREE.OctahedronGeometry(radius, 1);
  g.scale(1, height / (radius * 2), 1);
  return g;
}

function addReferenceGuidedDetails(group, type, color) {
  const mat = detailMaterial(color);
  if (type === "pawn") {
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const d = mark(new THREE.Mesh(diamondGeometry(0.035, 0.075), mat), "pawn-facet");
      d.position.set(Math.cos(a) * 0.16, 0.18, Math.sin(a) * 0.16);
      group.add(d);
    }
  } else if (type === "rook") {
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const b = mark(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.18, 0.04, 2, 4, 1), mat), "rook-buttress");
      b.position.set(Math.cos(a) * 0.205, 0.42, Math.sin(a) * 0.205);
      b.rotation.y = -a;
      group.add(b);
    }
  } else if (type === "knight") {
    // Mane plates follow the neck backwards. They are flattened faceted fins, not cone "pencils".
    const mane = wedgeGeometry(0.09, 0.13, 0.026);
    for (let i = 0; i < 10; i += 1) {
      const t = i / 9;
      const fin = mark(new THREE.Mesh(mane, mat), "mane-plate");
      fin.position.set(-0.20 + t * 0.22, 0.94 + t * 0.55, -0.005);
      fin.rotation.z = 0.30 - t * 0.15;
      fin.rotation.x = Math.PI / 2;
      fin.scale.setScalar(0.95 - t * 0.25);
      group.add(fin);
    }
    for (const side of [-1, 1]) {
      const cheek = mark(new THREE.Mesh(new THREE.IcosahedronGeometry(0.10, 2), mat), "knight-cheek-facet");
      cheek.scale.set(1.15, 0.72, 0.35);
      cheek.position.set(0.18, 1.48, side * 0.115);
      group.add(cheek);
    }
  } else if (type === "bishop") {
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const rib = mark(new THREE.Mesh(wedgeGeometry(0.045, 0.19, 0.025), mat), "bishop-rib");
      rib.position.set(Math.cos(a) * 0.115, 1.38, Math.sin(a) * 0.115);
      rib.rotation.y = -a;
      rib.rotation.z = 0.14;
      group.add(rib);
    }
  } else if (type === "queen") {
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      const jewel = mark(new THREE.Mesh(diamondGeometry(0.038, 0.09), mat), "queen-crown-facet");
      jewel.position.set(Math.cos(a) * 0.205, 1.53, Math.sin(a) * 0.205);
      jewel.rotation.y = a;
      group.add(jewel);
    }
  } else if (type === "king") {
    const core = mark(new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 1), mat), "king-cross-core");
    core.position.set(0, 1.73, 0);
    core.scale.set(0.55, 1.55, 0.55);
    group.add(core);
    for (const x of [-0.095, 0.095]) {
      const arm = mark(new THREE.Mesh(diamondGeometry(0.04, 0.09), mat), "king-cross-facet");
      arm.position.set(x, 1.78, 0);
      arm.rotation.z = Math.PI / 2;
      group.add(arm);
    }
  }
}

function refit(group, type) {
  // IMPORTANT: runtime fitting and WebMCP QA use exactly the same source of truth.
  // This prevents a piece from passing renderer fit but failing agent verification.
  const envelope = pieceCellEnvelope(type);
  group.position.set(0, 0, 0);
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error(`Generated ${type} has invalid bounds`);
  }
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

export class OpenSourceReferenceGuidedV9PieceSet {
  constructor() {
    this.base = new OpenSourceStauntonV8PieceSet();
    this.templates = new Map();
  }

  key(type, color) { return `${type}:${color}`; }

  build(type, color) {
    const group = this.base.create(type, color);
    addReferenceGuidedDetails(group, type, color);
    refit(group, type);
    const triangles = countObjectTriangles(group);
    group.userData.forgeVisualSource = SOURCE_ID;
    group.userData.openSourceStauntonRevision = REVISION;
    group.userData.openSourceStauntonType = type;
    group.userData.openSourceStauntonColor = color;
    group.userData.referenceAssetsPolicy = "reference-only-not-runtime";
    group.userData.openSourceStauntonTriangles = triangles;
    return group;
  }

  getTemplate(type, color) {
    const k = this.key(type, color);
    if (!this.templates.has(k)) this.templates.set(k, this.build(type, color));
    return this.templates.get(k);
  }

  create(type, color) {
    const source = this.getTemplate(type, color);
    const clone = source.clone(true);
    clone.userData = { ...source.userData };
    return clone;
  }

  inspect(type, color = "white") {
    const object = this.getTemplate(type, color);
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const envelope = pieceCellEnvelope(type);
    return {
      type,
      color,
      revision: REVISION,
      style: "Open-source reference-guided generated Staunton v9",
      runtimePrimarySource: SOURCE_ID,
      referenceAssetsPolicy: "reference-only-not-runtime",
      triangles: countObjectTriangles(object),
      bounds: { x: size.x, y: size.y, z: size.z },
      resources: countUniquePieceResources(object),
      finite: [size.x, size.y, size.z].every((v) => Number.isFinite(v) && v > 0),
      fitsLevel: size.y <= envelope.maxHeight + 1e-6,
      fitsCell: size.x <= envelope.maxFootprint + 1e-6 && size.z <= envelope.maxFootprint + 1e-6,
      freeForPublicRenderer: true,
    };
  }

  inspectAll() { return TYPES.map((type) => this.inspect(type, "white")); }
}

export class OpenSourceStauntonPieceSet extends OpenSourceReferenceGuidedV9PieceSet {}

// Compatibility only: old WebMCP code imports this name. It is the same FREE public renderer.
export class ForgeMcpPremiumPieceSet extends OpenSourceReferenceGuidedV9PieceSet {}

export const OPEN_SOURCE_STAUNTON_REVISION = REVISION;
export const FORGEMCP_PREMIUM_REVISION = REVISION;
export const OPEN_SOURCE_STAUNTON_SAFE_FIT = PIECE_CELL_ENVELOPE;
export { countObjectTriangles, countUniquePieceResources };
export const FORGEMCP_PREMIUM_SAFE_FIT = PIECE_CELL_ENVELOPE;
