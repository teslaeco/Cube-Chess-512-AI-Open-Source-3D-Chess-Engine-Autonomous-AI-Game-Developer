import * as THREE from "three";

const RADIAL_SEGMENTS = 48;

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
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    outline.position.copy(child.position);
    outline.rotation.copy(child.rotation);
    outline.scale.copy(child.scale).multiplyScalar(1.025);
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
        [0.48, 0.03],
        [0.51, 0.1],
        [0.48, 0.16],
        [0.39, 0.2],
        [0.36, 0.27],
        [0.32, 0.3],
      ],
      material,
    ),
  );
}

function addCollar(group, material, height, radius = 0.3) {
  group.add(
    lathe(
      [
        [radius * 0.76, 0],
        [radius, 0.035],
        [radius * 1.04, 0.09],
        [radius * 0.9, 0.135],
        [radius * 0.72, 0.16],
      ],
      material,
      height,
    ),
  );
}

function createPawn(material) {
  const group = new THREE.Group();
  addBase(group, material);
  group.add(
    lathe(
      [
        [0.22, 0],
        [0.19, 0.08],
        [0.145, 0.32],
        [0.18, 0.43],
        [0.23, 0.47],
        [0.22, 0.52],
      ],
      material,
      0.27,
    ),
  );
  group.add(mesh(new THREE.SphereGeometry(0.235, 36, 24), material, 0.94));
  return group;
}

function createRook(material) {
  const group = new THREE.Group();
  addBase(group, material);
  group.add(
    lathe(
      [
        [0.27, 0],
        [0.25, 0.09],
        [0.22, 0.48],
        [0.28, 0.58],
        [0.34, 0.62],
        [0.36, 0.72],
      ],
      material,
      0.27,
    ),
  );

  const crown = new THREE.Group();
  crown.position.y = 1.01;
  crown.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 48), material));
  for (let index = 0; index < 6; index += 1) {
    const battlement = mesh(new THREE.BoxGeometry(0.18, 0.2, 0.18), material, 0.14);
    const angle = (index / 6) * Math.PI * 2;
    battlement.position.x = Math.cos(angle) * 0.27;
    battlement.position.z = Math.sin(angle) * 0.27;
    battlement.rotation.y = -angle;
    crown.add(battlement);
  }
  group.add(crown);
  return group;
}

function createBishop(material) {
  const group = new THREE.Group();
  addBase(group, material);
  group.add(
    lathe(
      [
        [0.25, 0],
        [0.2, 0.1],
        [0.15, 0.48],
        [0.22, 0.59],
        [0.29, 0.63],
        [0.22, 0.71],
        [0.16, 0.76],
      ],
      material,
      0.27,
    ),
  );
  const mitre = mesh(new THREE.SphereGeometry(0.285, 40, 28), material, 1.16);
  mitre.scale.y = 1.25;
  group.add(mitre);
  const finial = mesh(new THREE.SphereGeometry(0.075, 24, 16), material, 1.5);
  group.add(finial);

  const slash = mesh(
    new THREE.BoxGeometry(0.085, 0.56, 0.42),
    new THREE.MeshStandardMaterial({
      color: 0x0d1118,
      roughness: 0.8,
      metalness: 0,
    }),
    1.18,
  );
  slash.rotation.z = 0.62;
  slash.userData.decorative = true;
  group.add(slash);
  return group;
}

function createQueen(material, accentMaterial) {
  const group = new THREE.Group();
  addBase(group, material);
  group.add(
    lathe(
      [
        [0.26, 0],
        [0.22, 0.12],
        [0.16, 0.52],
        [0.23, 0.68],
        [0.32, 0.74],
        [0.28, 0.83],
        [0.22, 0.88],
      ],
      material,
      0.27,
    ),
  );
  addCollar(group, material, 1.08, 0.31);

  const crown = new THREE.Group();
  crown.position.y = 1.25;
  crown.add(mesh(new THREE.TorusGeometry(0.245, 0.05, 14, 48), material));
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const point = mesh(new THREE.ConeGeometry(0.065, 0.27, 16), material, 0.13);
    point.position.x = Math.cos(angle) * 0.235;
    point.position.z = Math.sin(angle) * 0.235;
    crown.add(point);
    const jewel = mesh(new THREE.SphereGeometry(0.055, 18, 12), accentMaterial, 0.29);
    jewel.position.x = Math.cos(angle) * 0.235;
    jewel.position.z = Math.sin(angle) * 0.235;
    crown.add(jewel);
  }
  crown.add(mesh(new THREE.SphereGeometry(0.11, 24, 16), accentMaterial, 0.32));
  group.add(crown);
  return group;
}

function createKing(material, accentMaterial) {
  const group = new THREE.Group();
  addBase(group, material);
  group.add(
    lathe(
      [
        [0.27, 0],
        [0.22, 0.12],
        [0.16, 0.58],
        [0.24, 0.72],
        [0.32, 0.78],
        [0.26, 0.89],
        [0.19, 0.94],
      ],
      material,
      0.27,
    ),
  );
  addCollar(group, material, 1.13, 0.3);
  group.add(mesh(new THREE.SphereGeometry(0.16, 28, 18), accentMaterial, 1.41));
  group.add(mesh(new THREE.BoxGeometry(0.105, 0.46, 0.105), material, 1.67));
  group.add(mesh(new THREE.BoxGeometry(0.39, 0.105, 0.105), material, 1.72));
  return group;
}

function createKnight(material, accentMaterial) {
  const group = new THREE.Group();
  addBase(group, material);
  group.add(
    lathe(
      [
        [0.25, 0],
        [0.23, 0.12],
        [0.19, 0.32],
        [0.27, 0.42],
        [0.3, 0.48],
      ],
      material,
      0.27,
    ),
  );

  const neck = mesh(new THREE.CapsuleGeometry(0.22, 0.52, 8, 20), material, 0.91);
  neck.rotation.z = -0.34;
  neck.scale.set(0.92, 1.15, 0.78);
  group.add(neck);

  const muzzle = mesh(new THREE.SphereGeometry(0.23, 32, 20), material, 1.2);
  muzzle.scale.set(1.25, 0.75, 0.82);
  muzzle.position.x = 0.12;
  group.add(muzzle);

  const mane = mesh(new THREE.ConeGeometry(0.16, 0.62, 5), accentMaterial, 1.02);
  mane.rotation.z = -0.35;
  mane.position.x = -0.16;
  mane.scale.z = 0.55;
  group.add(mane);

  for (const z of [-0.115, 0.115]) {
    const ear = mesh(new THREE.ConeGeometry(0.07, 0.24, 12), material, 1.48);
    ear.position.x = -0.02;
    ear.position.z = z;
    ear.rotation.z = -0.18;
    group.add(ear);

    const eye = mesh(new THREE.SphereGeometry(0.035, 14, 10), accentMaterial, 1.32);
    eye.position.x = 0.235;
    eye.position.z = z * 1.35;
    eye.userData.decorative = true;
    group.add(eye);
  }
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
      white: new THREE.MeshStandardMaterial({ color: 0xc7a95b, metalness: 0.7, roughness: 0.22 }),
      black: new THREE.MeshStandardMaterial({ color: 0x7697bd, metalness: 0.72, roughness: 0.2 }),
    };
  }

  create(type, color) {
    const material = this.materials[color];
    const accentMaterial = this.accents[color];
    const builders = {
      pawn: () => createPawn(material),
      rook: () => createRook(material),
      knight: () => createKnight(material, accentMaterial),
      bishop: () => createBishop(material),
      queen: () => createQueen(material, accentMaterial),
      king: () => createKing(material, accentMaterial),
    };
    const group = builders[type]?.() ?? createPawn(material);
    group.name = `${color}-${type}`;
    addOutline(group, color === "white" ? 0x202733 : 0xc8d3df);
    return group;
  }
}
