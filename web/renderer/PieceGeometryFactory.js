import * as THREE from "three";
import { ExternalKnightModel } from "./ExternalKnightModel.js";

const RADIAL_SEGMENTS = 40;
const MAX_PIECE_HEIGHT = 0.78;
const MAX_PIECE_FOOTPRINT = 0.68;

function mesh(geometry, material, y = 0) {
  const item = new THREE.Mesh(geometry, material);
  item.position.y = y;
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function lathe(points, material, y = 0) {
  return mesh(
    new THREE.LatheGeometry(
      points.map(([radius, height]) => new THREE.Vector2(radius, height)),
      RADIAL_SEGMENTS,
    ),
    material,
    y,
  );
}

function addOutline(group, color) {
  const sourceMeshes = [];
  group.traverse((child) => {
    if (child.isMesh && !child.userData.decorative) sourceMeshes.push(child);
  });
  for (const child of sourceMeshes) {
    const outline = new THREE.Mesh(
      child.geometry,
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
      }),
    );
    outline.position.copy(child.position);
    outline.rotation.copy(child.rotation);
    outline.scale.copy(child.scale).multiplyScalar(1.024);
    outline.renderOrder = 30;
    outline.userData.decorative = true;
    child.parent.add(outline);
  }
}

export function fitPieceInsideCell(group) {
  group.position.set(0, 0, 0);
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Piece geometry has invalid bounds");
  }
  const scale = Math.min(
    MAX_PIECE_HEIGHT / size.y,
    MAX_PIECE_FOOTPRINT / size.x,
    MAX_PIECE_FOOTPRINT / size.z,
  );
  group.scale.setScalar(scale);
  group.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.position.y -= bounds.min.y;
  group.updateMatrixWorld(true);
  return group;
}

function addBase(group, material) {
  group.add(
    lathe(
      [
        [0.34, 0],
        [0.49, 0.04],
        [0.51, 0.1],
        [0.47, 0.17],
        [0.38, 0.22],
        [0.33, 0.3],
      ],
      material,
    ),
  );
}

function createPawn(material) {
  const group = new THREE.Group();
  addBase(group, material);
  group.add(
    lathe(
      [
        [0.23, 0],
        [0.19, 0.12],
        [0.14, 0.38],
        [0.2, 0.5],
      ],
      material,
      0.27,
    ),
  );
  group.add(mesh(new THREE.SphereGeometry(0.235, 32, 20), material, 0.94));
  return group;
}

function createRook(material) {
  const group = new THREE.Group();
  addBase(group, material);
  group.add(
    lathe(
      [
        [0.27, 0],
        [0.23, 0.18],
        [0.22, 0.5],
        [0.34, 0.65],
      ],
      material,
      0.27,
    ),
  );
  const crown = new THREE.Group();
  crown.position.y = 1.0;
  crown.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.13, 40), material));
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const block = mesh(new THREE.BoxGeometry(0.18, 0.2, 0.18), material, 0.14);
    block.position.set(Math.cos(angle) * 0.27, 0.14, Math.sin(angle) * 0.27);
    block.rotation.y = -angle;
    crown.add(block);
  }
  group.add(crown);
  return group;
}

function createBishop(material, cutMaterial) {
  const group = new THREE.Group();
  addBase(group, material);
  group.add(
    lathe(
      [
        [0.26, 0],
        [0.21, 0.12],
        [0.14, 0.5],
        [0.21, 0.66],
        [0.29, 0.72],
        [0.2, 0.82],
      ],
      material,
      0.27,
    ),
  );
  const mitre = mesh(new THREE.SphereGeometry(0.27, 36, 24), material, 1.21);
  mitre.scale.set(0.88, 1.38, 0.88);
  group.add(mitre);
  group.add(mesh(new THREE.SphereGeometry(0.07, 20, 12), material, 1.55));
  const slash = mesh(new THREE.BoxGeometry(0.07, 0.6, 0.42), cutMaterial, 1.22);
  slash.rotation.z = 0.58;
  slash.userData.decorative = true;
  group.add(slash);
  return group;
}

function createKnightFallback(material, accentMaterial) {
  const group = new THREE.Group();
  addBase(group, material);
  group.add(
    lathe(
      [
        [0.27, 0],
        [0.23, 0.14],
        [0.2, 0.34],
        [0.29, 0.5],
      ],
      material,
      0.27,
    ),
  );

  const silhouette = new THREE.Shape();
  silhouette.moveTo(-0.28, 0.02);
  silhouette.bezierCurveTo(-0.34, 0.28, -0.27, 0.58, -0.12, 0.83);
  silhouette.bezierCurveTo(-0.02, 1.01, 0.02, 1.18, -0.04, 1.36);
  silhouette.lineTo(0.03, 1.55);
  silhouette.lineTo(0.14, 1.34);
  silhouette.bezierCurveTo(0.31, 1.30, 0.49, 1.20, 0.61, 1.04);
  silhouette.bezierCurveTo(0.69, 0.93, 0.63, 0.83, 0.48, 0.80);
  silhouette.lineTo(0.29, 0.76);
  silhouette.bezierCurveTo(0.21, 0.62, 0.17, 0.46, 0.19, 0.30);
  silhouette.bezierCurveTo(0.20, 0.18, 0.12, 0.07, -0.02, 0.02);
  silhouette.closePath();

  const body = mesh(
    new THREE.ExtrudeGeometry(silhouette, {
      depth: 0.34,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.055,
      bevelThickness: 0.055,
      curveSegments: 20,
    }),
    material,
    0.68,
  );
  body.position.z = -0.17;
  body.rotation.y = Math.PI / 2;
  group.add(body);

  const eye = mesh(new THREE.SphereGeometry(0.035, 16, 12), accentMaterial, 1.84);
  eye.position.set(0.17, 1.84, -0.19);
  eye.userData.decorative = true;
  group.add(eye);

  const mane = mesh(new THREE.BoxGeometry(0.12, 0.72, 0.3), accentMaterial, 1.35);
  mane.position.x = -0.17;
  mane.rotation.z = -0.16;
  mane.userData.decorative = true;
  group.add(mane);
  return group;
}

function createQueen(material, accentMaterial) {
  const group = new THREE.Group();
  addBase(group, material);
  group.add(
    lathe(
      [
        [0.27, 0],
        [0.21, 0.16],
        [0.15, 0.56],
        [0.24, 0.76],
        [0.31, 0.84],
      ],
      material,
      0.27,
    ),
  );
  const crown = new THREE.Group();
  crown.position.y = 1.23;
  crown.add(mesh(new THREE.TorusGeometry(0.25, 0.05, 12, 40), material));
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const point = mesh(new THREE.ConeGeometry(0.06, 0.28, 14), material, 0.14);
    point.position.set(Math.cos(angle) * 0.23, 0.14, Math.sin(angle) * 0.23);
    crown.add(point);
  }
  crown.add(mesh(new THREE.SphereGeometry(0.1, 20, 14), accentMaterial, 0.34));
  group.add(crown);
  return group;
}

function createKing(material, accentMaterial) {
  const group = new THREE.Group();
  addBase(group, material);
  group.add(
    lathe(
      [
        [0.28, 0],
        [0.21, 0.16],
        [0.15, 0.62],
        [0.25, 0.8],
        [0.31, 0.88],
      ],
      material,
      0.27,
    ),
  );
  group.add(mesh(new THREE.SphereGeometry(0.16, 24, 16), accentMaterial, 1.41));
  group.add(mesh(new THREE.BoxGeometry(0.105, 0.46, 0.105), material, 1.68));
  group.add(mesh(new THREE.BoxGeometry(0.39, 0.105, 0.105), material, 1.73));
  return group;
}

export class PieceGeometryFactory {
  constructor() {
    this.materials = {
      white: new THREE.MeshPhysicalMaterial({
        color: 0xf2ede2,
        metalness: 0.08,
        roughness: 0.24,
        clearcoat: 0.65,
        clearcoatRoughness: 0.22,
      }),
      black: new THREE.MeshPhysicalMaterial({
        color: 0x151a22,
        metalness: 0.34,
        roughness: 0.2,
        clearcoat: 0.72,
        clearcoatRoughness: 0.18,
      }),
    };
    this.accents = {
      white: new THREE.MeshStandardMaterial({ color: 0xb99845, metalness: 0.68, roughness: 0.24 }),
      black: new THREE.MeshStandardMaterial({ color: 0x7898bd, metalness: 0.7, roughness: 0.22 }),
    };
    this.bishopCuts = {
      white: new THREE.MeshStandardMaterial({ color: 0x171b22, roughness: 0.8 }),
      black: new THREE.MeshStandardMaterial({ color: 0xd7dde5, roughness: 0.72 }),
    };
    this.externalKnight = new ExternalKnightModel(this.materials);
  }

  create(type, color) {
    const material = this.materials[color];
    const accent = this.accents[color];
    const outlineColor = color === "white" ? 0x202733 : 0xc8d3df;
    if (type === "knight") {
      const fallback = fitPieceInsideCell(createKnightFallback(material, accent));
      addOutline(fallback, outlineColor);
      const knight = this.externalKnight.create(color, fallback);
      knight.name = `${color}-${type}`;
      return knight;
    }
    const builders = {
      pawn: () => createPawn(material),
      rook: () => createRook(material),
      bishop: () => createBishop(material, this.bishopCuts[color]),
      queen: () => createQueen(material, accent),
      king: () => createKing(material, accent),
    };
    const group = fitPieceInsideCell(builders[type]?.() ?? createPawn(material));
    group.name = `${color}-${type}`;
    addOutline(group, outlineColor);
    return group;
  }
}
