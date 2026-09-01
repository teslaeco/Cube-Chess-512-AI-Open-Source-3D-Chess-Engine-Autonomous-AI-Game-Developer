import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pieceCellEnvelope } from "./pieceScaleProfile.js";
import { CRAYON_CATHEDRAL_PRESET } from "../state/pieceVisualPresets.js";
import {
  createCrayonCathedralMaterial,
  CRAYON_CATHEDRAL_TEXTURE_REVISION,
  CRAYON_CATHEDRAL_TEXTURE_STYLE,
} from "./CrayonCathedralTextureSet.js";

export { CRAYON_CATHEDRAL_PRESET };
export const CRAYON_CATHEDRAL_REVISION =
  "2026-09-01-windowed-crayon-polyhedral-v1";
export const CRAYON_CATHEDRAL_SOURCE_ID =
  "original-procedural-crayon-cathedral";

const TYPES = Object.freeze(["pawn", "rook", "knight", "bishop", "queen", "king"]);
const LATHE_SEGMENTS = 128;
const RADIAL_SEGMENTS = 64;
const templateCache = new Map();
const materialCache = new Map();
const geometryProfileCache = new Map();
const CRAYON_COLORS = Object.freeze([
  0xff354f,
  0xff8a22,
  0xffd72e,
  0x58d35b,
  0x1baee8,
  0x784ee8,
  0xe842b3,
  0x24d6bd,
]);

function materials(type, side) {
  const key = `${type}:${side}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, {
      body: createCrayonCathedralMaterial(type, side, "body"),
      frame: createCrayonCathedralMaterial(type, side, "frame"),
      glass: createCrayonCathedralMaterial(type, side, "glass"),
      dark: createCrayonCathedralMaterial(type, side, "dark"),
      crayons: CRAYON_COLORS.map((color) =>
        createCrayonCathedralMaterial(type, side, "crayon", color),
      ),
    });
  }
  return materialCache.get(key);
}

function mark(mesh, role) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = {
    ...mesh.userData,
    forgeVisualSource: CRAYON_CATHEDRAL_SOURCE_ID,
    forgeCrayonCathedralRole: role,
  };
  return mesh;
}

function mesh(geometry, material, role) {
  return mark(new THREE.Mesh(geometry, material), role);
}

function lathe(points, material, role) {
  return mesh(
    new THREE.LatheGeometry(
      points.map(([radius, y]) => new THREE.Vector2(radius, y)),
      LATHE_SEGMENTS,
    ),
    material,
    role,
  );
}

function ring(group, material, y, radius, tube, role) {
  const object = mesh(
    new THREE.TorusGeometry(radius, tube, 20, 96),
    material,
    role,
  );
  object.rotation.x = Math.PI / 2;
  object.position.y = y;
  group.add(object);
  return object;
}

function cylinder(radiusTop, radiusBottom, height, material, role, segments = RADIAL_SEGMENTS) {
  return mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 4),
    material,
    role,
  );
}

function extrude(shape, depth, material, role, bevelSize = 0.012, bevelSegments = 5) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 2,
    bevelEnabled: true,
    bevelSize,
    bevelThickness: bevelSize,
    bevelSegments,
    curveSegments: 40,
  });
  geometry.center();
  return mesh(geometry, material, role);
}

function archedWindowShape(width, height) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height * 0.12);
  shape.bezierCurveTo(
    width / 2,
    height * 0.36,
    width * 0.26,
    height / 2,
    0,
    height / 2,
  );
  shape.bezierCurveTo(
    -width * 0.26,
    height / 2,
    -width / 2,
    height * 0.36,
    -width / 2,
    height * 0.12,
  );
  shape.closePath();
  return shape;
}

function addWindow(group, mats, angle, radius, y, width, height, role) {
  const frame = extrude(
    archedWindowShape(width, height),
    0.035,
    mats.dark,
    `${role}-frame`,
    0.012,
    5,
  );
  frame.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  frame.rotation.y = Math.PI / 2 - angle;
  group.add(frame);

  const pane = extrude(
    archedWindowShape(width * 0.72, height * 0.76),
    0.041,
    mats.glass,
    `${role}-stained-glass`,
    0.007,
    4,
  );
  pane.position.set(
    Math.cos(angle) * (radius + 0.012),
    y,
    Math.sin(angle) * (radius + 0.012),
  );
  pane.rotation.y = Math.PI / 2 - angle;
  group.add(pane);
}

function addWindowBand(group, mats, {
  count = 8,
  radius,
  y,
  width,
  height,
  role = "window",
  offset = 0,
}) {
  for (let index = 0; index < count; index += 1) {
    addWindow(
      group,
      mats,
      offset + (index / count) * Math.PI * 2,
      radius,
      y,
      width,
      height,
      `${role}-${index + 1}`,
    );
  }
}

function addRoseWindow(group, mats, x, y, z, rotationY, scale, role) {
  const frame = mesh(
    new THREE.TorusGeometry(0.12 * scale, 0.019 * scale, 18, 72),
    mats.dark,
    `${role}-frame`,
  );
  frame.position.set(x, y, z);
  frame.rotation.y = rotationY;
  group.add(frame);
  const glass = mesh(
    new THREE.CircleGeometry(0.105 * scale, 64),
    mats.glass,
    `${role}-glass`,
  );
  glass.position.set(x, y, z);
  glass.rotation.y = rotationY;
  group.add(glass);
}

function crayonSpike(mats, colorIndex, length = 0.32, radius = 0.045, role = "crayon") {
  const group = new THREE.Group();
  group.name = role;
  const material = mats.crayons[colorIndex % mats.crayons.length];
  const shaftHeight = length * 0.63;
  const tipHeight = length - shaftHeight;
  const shaft = cylinder(radius * 0.86, radius, shaftHeight, material, `${role}-shaft`, 48);
  shaft.position.y = shaftHeight / 2;
  group.add(shaft);
  const tip = mesh(
    new THREE.ConeGeometry(radius * 0.88, tipHeight, 48, 4),
    material,
    `${role}-tip`,
  );
  tip.position.y = shaftHeight + tipHeight / 2;
  group.add(tip);
  for (const bandY of [shaftHeight * 0.72, shaftHeight * 0.88]) {
    const band = mesh(
      new THREE.TorusGeometry(radius * 0.86, radius * 0.12, 12, 48),
      mats.dark,
      `${role}-band`,
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = bandY;
    group.add(band);
  }
  return group;
}

function addCrayonCrown(group, mats, {
  count = 8,
  radius,
  y,
  length,
  tilt = 0.18,
  role,
}) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const spike = crayonSpike(mats, index, length, 0.043, `${role}-${index + 1}`);
    spike.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    spike.rotation.z = -Math.cos(angle) * tilt;
    spike.rotation.x = Math.sin(angle) * tilt;
    group.add(spike);
  }
}

function addBase(group, mats, scale = 1) {
  group.add(lathe([
    [0.24 * scale, 0],
    [0.38 * scale, 0.008],
    [0.49 * scale, 0.045],
    [0.53 * scale, 0.09],
    [0.51 * scale, 0.14],
    [0.46 * scale, 0.19],
    [0.43 * scale, 0.255],
    [0.37 * scale, 0.31],
  ], mats.body, "cathedral-base"));
  ring(group, mats.glass, 0.055, 0.49 * scale, 0.018, "base-light-ring");
  ring(group, mats.dark, 0.145, 0.47 * scale, 0.016, "base-lead-ring");
  ring(group, mats.frame, 0.275, 0.37 * scale, 0.014, "base-frame-ring");
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const gem = mesh(
      new THREE.OctahedronGeometry(0.034, 2),
      mats.glass,
      `base-glass-gem-${index + 1}`,
    );
    gem.position.set(
      Math.cos(angle) * 0.445 * scale,
      0.19,
      Math.sin(angle) * 0.445 * scale,
    );
    gem.scale.set(0.72, 1.25, 0.72);
    group.add(gem);
  }
}

function addTowerBody(group, mats, {
  bottomY = 0.29,
  topY = 1.12,
  bottomRadius = 0.3,
  waistRadius = 0.2,
  topRadius = 0.27,
  windows = 6,
  windowY = 0.72,
  windowHeight = 0.34,
  role = "tower",
}) {
  group.add(lathe([
    [bottomRadius, bottomY],
    [bottomRadius * 0.92, bottomY + 0.08],
    [waistRadius * 1.08, bottomY + (topY - bottomY) * 0.36],
    [waistRadius, bottomY + (topY - bottomY) * 0.60],
    [waistRadius * 1.08, bottomY + (topY - bottomY) * 0.82],
    [topRadius * 0.90, topY - 0.05],
    [topRadius, topY],
  ], mats.body, `${role}-body`));
  addWindowBand(group, mats, {
    count: windows,
    radius: waistRadius * 1.055,
    y: windowY,
    width: Math.min(0.105, (Math.PI * 2 * waistRadius) / windows * 0.64),
    height: windowHeight,
    role: `${role}-window`,
    offset: Math.PI / windows,
  });
  ring(group, mats.dark, topY + 0.015, topRadius * 1.02, 0.015, `${role}-top-lead`);
  ring(group, mats.frame, bottomY + 0.07, bottomRadius * 0.96, 0.014, `${role}-bottom-frame`);
}

function pawn(mats) {
  const group = new THREE.Group();
  addBase(group, mats, 0.74);
  addTowerBody(group, mats, {
    topY: 0.89,
    bottomRadius: 0.25,
    waistRadius: 0.15,
    topRadius: 0.19,
    windows: 5,
    windowY: 0.60,
    windowHeight: 0.23,
    role: "pawn-lantern",
  });
  const orb = mesh(new THREE.IcosahedronGeometry(0.19, 4), mats.glass, "pawn-rose-orb");
  orb.position.y = 1.10;
  group.add(orb);
  ring(group, mats.dark, 0.955, 0.18, 0.015, "pawn-orb-frame");
  const tip = crayonSpike(mats, 3, 0.22, 0.038, "pawn-crayon-finial");
  tip.position.y = 1.26;
  group.add(tip);
  return group;
}

function rook(mats) {
  const group = new THREE.Group();
  addBase(group, mats, 0.84);
  addTowerBody(group, mats, {
    topY: 1.10,
    bottomRadius: 0.3,
    waistRadius: 0.21,
    topRadius: 0.29,
    windows: 8,
    windowY: 0.74,
    windowHeight: 0.38,
    role: "rook-window-tower",
  });
  const lantern = cylinder(0.33, 0.31, 0.20, mats.frame, "rook-octagonal-lantern", 8);
  lantern.position.y = 1.22;
  group.add(lantern);
  addWindowBand(group, mats, {
    count: 8,
    radius: 0.326,
    y: 1.22,
    width: 0.092,
    height: 0.12,
    role: "rook-upper-window",
    offset: Math.PI / 8,
  });
  addCrayonCrown(group, mats, {
    count: 8,
    radius: 0.275,
    y: 1.31,
    length: 0.23,
    tilt: 0.13,
    role: "rook-crayon-battlement",
  });
  return group;
}

function knightProfile() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.23, 0.02);
  shape.bezierCurveTo(-0.33, 0.22, -0.31, 0.51, -0.19, 0.72);
  shape.bezierCurveTo(-0.11, 0.89, -0.06, 1.10, 0.07, 1.23);
  shape.bezierCurveTo(0.22, 1.38, 0.47, 1.38, 0.60, 1.22);
  shape.bezierCurveTo(0.67, 1.13, 0.60, 1.01, 0.46, 0.98);
  shape.bezierCurveTo(0.31, 0.94, 0.23, 0.82, 0.19, 0.65);
  shape.bezierCurveTo(0.15, 0.46, 0.16, 0.23, 0.14, 0.08);
  shape.bezierCurveTo(0.04, -0.02, -0.12, -0.05, -0.23, 0.02);
  shape.closePath();
  return shape;
}

function knight(mats) {
  const group = new THREE.Group();
  addBase(group, mats, 0.86);
  group.add(lathe([
    [0.30, 0.29],
    [0.28, 0.36],
    [0.25, 0.43],
    [0.24, 0.51],
  ], mats.body, "knight-window-plinth"));
  ring(group, mats.frame, 0.47, 0.255, 0.017, "knight-plinth-frame");
  const neck = cylinder(0.19, 0.235, 0.38, mats.body, "knight-window-neck", 8);
  neck.position.y = 0.65;
  group.add(neck);
  addWindowBand(group, mats, {
    count: 4,
    radius: 0.225,
    y: 0.64,
    width: 0.085,
    height: 0.21,
    role: "knight-neck-window",
    offset: Math.PI / 4,
  });
  ring(group, mats.dark, 0.82, 0.195, 0.014, "knight-neck-lead-ring");
  const head = extrude(knightProfile(), 0.32, mats.body, "knight-sculpted-head", 0.024, 8);
  head.position.set(-0.03, 1.20, 0);
  group.add(head);
  addRoseWindow(group, mats, -0.08, 1.18, 0.171, 0, 0.74, "knight-near-rose-window");
  addRoseWindow(group, mats, -0.08, 1.18, -0.171, Math.PI, 0.74, "knight-far-rose-window");
  for (let index = 0; index < 7; index += 1) {
    const spike = crayonSpike(
      mats,
      index,
      0.19 + index * 0.012,
      0.030,
      `knight-crayon-mane-${index + 1}`,
    );
    spike.position.set(-0.36 - index * 0.018, 0.94 + index * 0.13, 0);
    spike.rotation.z = -0.52 + index * 0.04;
    group.add(spike);
  }
  for (const [index, z] of [-0.10, 0.10].entries()) {
    const ear = crayonSpike(mats, index + 2, 0.26, 0.033, `knight-crayon-ear-${index + 1}`);
    ear.position.set(0.04, 1.77, z);
    ear.rotation.z = index === 0 ? 0.20 : -0.08;
    group.add(ear);
  }
  for (const z of [-0.12, 0.12]) {
    const eye = mesh(new THREE.OctahedronGeometry(0.028, 2), mats.glass, "knight-glass-eye");
    eye.position.set(0.43, 1.68, z < 0 ? -0.174 : 0.174);
    group.add(eye);
    const nostril = mesh(new THREE.OctahedronGeometry(0.018, 1), mats.dark, "knight-nostril");
    nostril.position.set(0.455, 1.53, z < 0 ? -0.174 : 0.174);
    group.add(nostril);
  }
  return group;
}

function bishop(mats) {
  const group = new THREE.Group();
  addBase(group, mats, 0.82);
  addTowerBody(group, mats, {
    topY: 1.18,
    bottomRadius: 0.28,
    waistRadius: 0.18,
    topRadius: 0.23,
    windows: 6,
    windowY: 0.78,
    windowHeight: 0.43,
    role: "bishop-chapel",
  });
  const mitre = lathe([
    [0.16, 1.15],
    [0.24, 1.23],
    [0.245, 1.38],
    [0.21, 1.53],
    [0.14, 1.68],
    [0.065, 1.82],
    [0.008, 1.94],
  ], mats.glass, "bishop-pointed-window-mitre");
  group.add(mitre);
  const slash = crayonSpike(mats, 1, 0.39, 0.034, "bishop-diagonal-crayon-slit");
  slash.position.set(-0.11, 1.46, 0.18);
  slash.rotation.z = -0.58;
  slash.rotation.y = -0.08;
  group.add(slash);
  const finial = crayonSpike(mats, 5, 0.19, 0.033, "bishop-crayon-finial");
  finial.position.y = 1.88;
  group.add(finial);
  return group;
}

function queen(mats) {
  const group = new THREE.Group();
  addBase(group, mats, 0.87);
  addTowerBody(group, mats, {
    topY: 1.22,
    bottomRadius: 0.30,
    waistRadius: 0.19,
    topRadius: 0.27,
    windows: 8,
    windowY: 0.82,
    windowHeight: 0.46,
    role: "queen-gallery",
  });
  const crown = cylinder(0.31, 0.28, 0.16, mats.frame, "queen-window-crown", 12);
  crown.position.y = 1.30;
  group.add(crown);
  addWindowBand(group, mats, {
    count: 8,
    radius: 0.304,
    y: 1.30,
    width: 0.085,
    height: 0.105,
    role: "queen-crown-window",
    offset: Math.PI / 8,
  });
  addCrayonCrown(group, mats, {
    count: 8,
    radius: 0.245,
    y: 1.37,
    length: 0.39,
    tilt: 0.26,
    role: "queen-colored-crayon-crown",
  });
  const jewel = mesh(new THREE.DodecahedronGeometry(0.11, 2), mats.glass, "queen-central-glass-jewel");
  jewel.position.y = 1.60;
  group.add(jewel);
  return group;
}

function king(mats) {
  const group = new THREE.Group();
  addBase(group, mats, 0.90);
  addTowerBody(group, mats, {
    topY: 1.22,
    bottomRadius: 0.31,
    waistRadius: 0.20,
    topRadius: 0.28,
    windows: 8,
    windowY: 0.82,
    windowHeight: 0.48,
    role: "king-cathedral-nave",
  });
  const lantern = cylinder(0.34, 0.31, 0.28, mats.frame, "king-octagonal-window-lantern", 8);
  lantern.position.y = 1.35;
  group.add(lantern);
  addWindowBand(group, mats, {
    count: 8,
    radius: 0.334,
    y: 1.35,
    width: 0.096,
    height: 0.19,
    role: "king-lantern-window",
    offset: Math.PI / 8,
  });
  ring(group, mats.glass, 1.52, 0.28, 0.016, "king-cyan-crown-ring");
  const support = cylinder(0.065, 0.09, 0.19, mats.dark, "king-cross-support", 48);
  support.position.y = 1.65;
  group.add(support);
  const vertical = crayonSpike(mats, 3, 0.42, 0.043, "king-vertical-crayon");
  vertical.position.y = 1.69;
  group.add(vertical);
  const left = crayonSpike(mats, 4, 0.30, 0.040, "king-left-crayon");
  left.position.set(-0.02, 1.89, 0);
  left.rotation.z = Math.PI / 2;
  group.add(left);
  const right = crayonSpike(mats, 6, 0.30, 0.040, "king-right-crayon");
  right.position.set(0.02, 1.89, 0);
  right.rotation.z = -Math.PI / 2;
  group.add(right);
  return group;
}

const BUILDERS = Object.freeze({ pawn, rook, knight, bishop, queen, king });

function consolidatedRole(role = "detail") {
  if (role.includes("crayon") || role.includes("battlement") || role.includes("mane")) {
    return "crayon-detail";
  }
  if (
    role.includes("window") ||
    role.includes("glass") ||
    role.includes("rose") ||
    role.includes("gem") ||
    role.includes("orb") ||
    role.includes("jewel") ||
    role.includes("light")
  ) {
    return "window-glass-detail";
  }
  if (role.includes("frame") || role.includes("lead") || role.includes("ring")) {
    return "architectural-frame";
  }
  return "cathedral-body";
}

/**
 * Preserve the reference-level polygon count while merging repeated windows,
 * rings and crayons into a small number of draw calls per figure. The details
 * remain real geometry, but a complete 32-piece set stays practical on mobile.
 */
function consolidateGeometry(content) {
  content.updateMatrixWorld(true);
  const originalGeometries = new Set();
  const batches = new Map();

  content.traverse((child) => {
    if (!child.isMesh || !child.geometry || !child.material) return;
    originalGeometries.add(child.geometry);
    const role = consolidatedRole(child.userData?.forgeCrayonCathedralRole);
    const key = `${child.material.uuid}:${role}`;
    if (!batches.has(key)) {
      batches.set(key, { material: child.material, role, geometries: [] });
    }
    const geometry = child.geometry.index
      ? child.geometry.toNonIndexed()
      : child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    for (const attribute of Object.keys(geometry.attributes)) {
      if (!["position", "normal", "uv"].includes(attribute)) {
        geometry.deleteAttribute(attribute);
      }
    }
    batches.get(key).geometries.push(geometry);
  });

  content.clear();
  for (const { material, role, geometries } of batches.values()) {
    const geometry = geometries.length === 1
      ? geometries[0]
      : mergeGeometries(geometries, false);
    if (!geometry) throw new Error(`Unable to merge Crayon Cathedral ${role} geometry`);
    if (geometries.length > 1) geometries.forEach((item) => item.dispose());
    const batch = mesh(geometry, material, role);
    batch.name = role;
    content.add(batch);
  }
  originalGeometries.forEach((geometry) => geometry.dispose());
  content.updateMatrixWorld(true);
  return content;
}

function fitInsideEnvelope(content, type) {
  const envelope = pieceCellEnvelope(type);
  content.position.set(0, 0, 0);
  content.scale.setScalar(1);
  content.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(content);
  const size = bounds.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error(`Crayon Cathedral ${type} has invalid bounds`);
  }
  const verticalScale = envelope.maxHeight / size.y;
  const horizontalScale = Math.min(
    envelope.maxFootprint / size.x,
    envelope.maxFootprint / size.z,
  ) * 0.94;
  // The reference designs use broad architectural bases and lantern crowns.
  // Fit height and footprint independently so they remain readable on mobile
  // without crossing either the next 1.25-spaced level or the 1.19-wide cell.
  content.scale.set(horizontalScale, verticalScale, horizontalScale);
  content.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(content);
  const center = bounds.getCenter(new THREE.Vector3());
  content.position.x -= center.x;
  content.position.z -= center.z;
  content.position.y -= bounds.min.y;
  content.updateMatrixWorld(true);

  const root = new THREE.Group();
  root.name = `${type}-crayon-cathedral`;
  root.add(content);
  root.userData = {
    forgeVisualPreset: CRAYON_CATHEDRAL_PRESET,
    forgeVisualSource: CRAYON_CATHEDRAL_SOURCE_ID,
    forgeVisualRevision: CRAYON_CATHEDRAL_REVISION,
    forgeTextureStyle: CRAYON_CATHEDRAL_TEXTURE_STYLE,
    forgeTextureRevision: CRAYON_CATHEDRAL_TEXTURE_REVISION,
    crayonCathedralModelState: "ready",
    originalProceduralChessAsset: true,
  };
  return root;
}

export function countCrayonCathedralTriangles(object) {
  let triangles = 0;
  object?.traverse?.((child) => {
    if (!child.geometry) return;
    triangles += child.geometry.index?.count
      ? child.geometry.index.count / 3
      : (child.geometry.attributes?.position?.count ?? 0) / 3;
  });
  return Math.round(triangles);
}

function inspectResources(object) {
  const geometries = new Set();
  const materialsFound = new Set();
  const textures = new Set();
  let meshes = 0;
  let fullyTexturedMeshes = 0;
  const roles = new Set();
  object.traverse((child) => {
    if (!child.isMesh) return;
    meshes += 1;
    geometries.add(child.geometry);
    if (child.userData?.forgeCrayonCathedralRole) roles.add(child.userData.forgeCrayonCathedralRole);
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const fullyTextured = childMaterials.every((material) => {
      if (!material) return false;
      materialsFound.add(material);
      for (const key of ["map", "roughnessMap", "metalnessMap", "bumpMap", "emissiveMap"]) {
        if (material[key]) textures.add(material[key]);
      }
      return Boolean(
        material.map &&
        material.roughnessMap &&
        material.metalnessMap &&
        material.bumpMap &&
        material.emissiveMap,
      );
    });
    if (fullyTextured) fullyTexturedMeshes += 1;
  });
  return {
    meshes,
    uniqueGeometries: geometries.size,
    uniqueMaterials: materialsFound.size,
    uniqueTextures: textures.size,
    fullyTexturedMeshes,
    roles: [...roles],
  };
}

function makeTemplate(type, side) {
  const content = consolidateGeometry(BUILDERS[type](materials(type, side)));
  const root = fitInsideEnvelope(content, type);
  root.userData = { ...root.userData, type, side };
  const templateMeshes = [];
  root.traverse((child) => {
    if (child.isMesh && child.geometry) templateMeshes.push(child);
  });
  const sharedProfile = geometryProfileCache.get(type);
  if (sharedProfile) {
    if (sharedProfile.length !== templateMeshes.length) {
      throw new Error(`Crayon Cathedral ${type} material batches are inconsistent between sides`);
    }
    templateMeshes.forEach((child, index) => {
      child.geometry.dispose();
      child.geometry = sharedProfile[index];
    });
  } else {
    geometryProfileCache.set(type, templateMeshes.map((child) => child.geometry));
  }
  root.traverse((child) => {
    if (child.geometry) {
      child.geometry.userData = {
        ...child.geometry.userData,
        forgeSharedPieceGeometry: true,
        forgeVisualSource: CRAYON_CATHEDRAL_SOURCE_ID,
      };
    }
  });
  return root;
}

function cloneTemplate(template) {
  const object = template.clone(true);
  const materialClones = new Map();
  object.traverse((child) => {
    if (!child.material) return;
    const cloneMaterial = (material) => {
      if (!materialClones.has(material)) {
        const clone = material.clone();
        clone.userData = {
          ...material.userData,
          forgeSharedPieceMaterial: false,
          forgePieceInstanceMaterial: true,
          forgeBaseEmissiveHex: clone.emissive?.getHex?.() ?? 0x000000,
          forgeBaseEmissiveIntensity: clone.emissiveIntensity ?? 0,
        };
        materialClones.set(material, clone);
      }
      return materialClones.get(material);
    };
    child.material = Array.isArray(child.material)
      ? child.material.map(cloneMaterial)
      : cloneMaterial(child.material);
  });
  object.userData = { ...template.userData };
  return object;
}

export class CrayonCathedralPieceSet {
  create(type, side = "white") {
    const safeType = TYPES.includes(type) ? type : "pawn";
    const safeSide = side === "black" ? "black" : "white";
    const key = `${safeType}:${safeSide}`;
    if (!templateCache.has(key)) templateCache.set(key, makeTemplate(safeType, safeSide));
    return cloneTemplate(templateCache.get(key));
  }

  inspect(type, side = "white") {
    const object = this.create(type, side);
    object.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const envelope = pieceCellEnvelope(type);
    const resources = inspectResources(object);
    return {
      type,
      side,
      triangles: countCrayonCathedralTriangles(object),
      bounds: { x: size.x, y: size.y, z: size.z },
      finite: [size.x, size.y, size.z].every(Number.isFinite),
      fitsCell: size.x <= envelope.maxFootprint + 1e-6 && size.z <= envelope.maxFootprint + 1e-6,
      fitsLevel: size.y <= envelope.maxHeight + 1e-6,
      runtimePrimarySource: CRAYON_CATHEDRAL_SOURCE_ID,
      revision: CRAYON_CATHEDRAL_REVISION,
      textureStyle: CRAYON_CATHEDRAL_TEXTURE_STYLE,
      textureRevision: CRAYON_CATHEDRAL_TEXTURE_REVISION,
      resources,
    };
  }

  inspectAll(side = "white") {
    return TYPES.map((type) => this.inspect(type, side));
  }
}
