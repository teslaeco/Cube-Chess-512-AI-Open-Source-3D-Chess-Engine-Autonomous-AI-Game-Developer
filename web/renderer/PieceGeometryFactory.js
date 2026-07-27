import * as THREE from "three";
import { ExternalKnightModel } from "./ExternalKnightModel.js";

const RADIAL_SEGMENTS = 40;

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

  const neck = mesh(new THREE.CapsuleGeometry(0.2, 0.58, 8, 18), material, 0.94);
  neck.rotation.z = -0.48;
  neck.scale.set(0.9, 1.14, 0.78);
  neck.position.x = -0.02;
  group.add(neck);

  const head = mesh(new THREE.SphereGeometry(0.25, 30, 20), material, 1.28);
  head.scale.set(1.18, 0.82, 0.82);
  head.position.x = 0.13;
  head.rotation.z = -0.18;
  group.add(head);

  const muzzle = mesh(new THREE.CapsuleGeometry(0.12, 0.3, 6, 16), material, 1.24);
  muzzle.rotation.z = Math.PI / 2 - 0.15;
  muzzle.position.x = 0.35;
  muzzle.scale.set(0.78, 1, 0.72);
  group.add(muzzle);

  for (const z of [-0.12, 0.12]) {
    const ear = mesh(new THREE.ConeGeometry(0.075, 0.27, 14), material, 1.56);
    ear.position.set(0.0, 1.56, z);
    ear.rotation.z = -0.14;
    group.add(ear);

    const eye = mesh(new THREE.SphereGeometry(0.035, 14, 10), accentMaterial, 1.36);
    eye.position.set(0.3, 1.36, z * 1.22);
    eye.userData.decorative = true;
    group.add(eye);
  }

  const mane = mesh(new THREE.ConeGeometry(0.19, 0.74, 6), accentMaterial, 1.08);
  mane.rotation.z = -0.52;
  mane.position.x = -0.19;
  mane.scale.z = 0.55;
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
    const builders = {
      pawn: () => createPawn(material),
      rook: () => createRook(material),
      knight: () =>
        this.externalKnight.create(color, createKnightFallback(material, accent)),
      bishop: () => createBishop(material, this.bishopCuts[color]),
      queen: () => createQueen(material, accent),
      king: () => createKing(material, accent),
    };
    const group = builders[type]?.() ?? createPawn(material);
    group.name = `${color}-${type}`;
    if (type !== "knight") {
      addOutline(group, color === "white" ? 0x202733 : 0xc8d3df);
    }
    return group;
  }
}
