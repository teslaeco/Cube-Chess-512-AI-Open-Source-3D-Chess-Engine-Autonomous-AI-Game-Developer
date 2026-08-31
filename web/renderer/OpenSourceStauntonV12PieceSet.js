import * as THREE from "three";
import { pieceCellEnvelope } from "./pieceScaleProfile.js";

const REVISION = "2026-09-01-open-source-staunton-v12-sculpt-textured";
const SOURCE_ID = "open-source-staunton-v12-sculpt-textured";
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

function roleSeed(type, side) {
  return (TYPES.indexOf(type) + 1) * 97 + (side === "white" ? 17 : 53);
}

function makeRoleTexture(type, side) {
  const key = `albedo:${type}:${side}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const seed = roleSeed(type, side);
  const roleIndex = TYPES.indexOf(type) + 1;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const n = seededNoise(x, y, seed);
      const vein = Math.max(0, 1 - Math.abs(Math.sin(x * (0.08 + roleIndex * 0.012) + y * 0.075 + n * 3.1)) * 6.3);
      const facet = Math.max(0, 1 - Math.abs(Math.sin((x + y) * 0.11 + roleIndex)) * 4.5);
      if (side === "white") {
        const base = 222 + Math.round(n * 20);
        data[i] = Math.min(255, base + Math.round(vein * 12) + Math.round(facet * 4));
        data[i + 1] = Math.min(255, base + Math.round(vein * 8));
        data[i + 2] = Math.min(255, base - 7 + Math.round(vein * 15));
      } else {
        const base = 14 + Math.round(n * 18);
        data[i] = base + Math.round(vein * 7);
        data[i + 1] = base + Math.round(vein * 13) + Math.round(facet * 3);
        data[i + 2] = base + Math.round(vein * 18) + Math.round(facet * 5);
      }
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 2.4);
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
      const n = seededNoise(x, y, side === "white" ? 331 : 557);
      const v = side === "white" ? 74 + Math.round(n * 46) : 48 + Math.round(n * 48);
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
  const body = new THREE.MeshPhysicalMaterial({
    color: white ? 0xf1eee7 : 0x11151a,
    map: makeRoleTexture(type, side),
    roughnessMap: makeRoughnessTexture(side),
    roughness: white ? 0.30 : 0.23,
    metalness: white ? 0.08 : 0.26,
    clearcoat: white ? 0.68 : 0.80,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.15,
  });
  const trim = new THREE.MeshPhysicalMaterial({
    color: white ? 0xc7a45a : 0x18b8b0,
    metalness: 0.76,
    roughness: 0.18,
    clearcoat: 0.78,
    clearcoatRoughness: 0.12,
    emissive: white ? 0x33240f : 0x073f3b,
    emissiveIntensity: white ? 0.07 : 0.18,
  });
  const inset = new THREE.MeshPhysicalMaterial({
    color: white ? 0x2d5270 : 0x07151c,
    metalness: 0.42,
    roughness: 0.22,
    clearcoat: 0.66,
  });
  const eye = new THREE.MeshPhysicalMaterial({
    color: white ? 0x17394f : 0xd4a45b,
    metalness: 0.5,
    roughness: 0.14,
    clearcoat: 0.9,
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

function ring(group, material, radius, y, tube = 0.014, role = "ring") {
  const item = mesh(new THREE.TorusGeometry(radius, tube, 16, 72), material, y, role);
  item.rotation.x = Math.PI / 2;
  group.add(item);
}

function loft(sections, radial = 48, cap = true) {
  const positions = [];
  const indices = [];
  const uvs = [];
  for (let s = 0; s < sections.length; s += 1) {
    const section = sections[s];
    for (let i = 0; i < radial; i += 1) {
      const a = (i / radial) * Math.PI * 2 + (section.twist ?? 0);
      const shaping = section.shape ? section.shape(a) : 1;
      positions.push(
        (section.x ?? 0) + Math.cos(a) * section.rx * shaping,
        section.y + (section.yWave ?? 0) * Math.sin(a * 2),
        (section.z ?? 0) + Math.sin(a) * section.rz * shaping,
      );
      uvs.push(i / radial, s / Math.max(1, sections.length - 1));
    }
  }
  for (let s = 0; s < sections.length - 1; s += 1) {
    for (let i = 0; i < radial; i += 1) {
      const n = (i + 1) % radial;
      const a = s * radial + i;
      const b = s * radial + n;
      const c = (s + 1) * radial + n;
      const d = (s + 1) * radial + i;
      indices.push(a, b, d, b, c, d);
    }
  }
  if (cap) {
    const capSection = (sectionIndex, reverse) => {
      const section = sections[sectionIndex];
      const center = positions.length / 3;
      positions.push(section.x ?? 0, section.y, section.z ?? 0);
      uvs.push(0.5, sectionIndex === 0 ? 0 : 1);
      const start = sectionIndex * radial;
      for (let i = 0; i < radial; i += 1) {
        const n = (i + 1) % radial;
        if (reverse) indices.push(center, start + n, start + i);
        else indices.push(center, start + i, start + n);
      }
    };
    capSection(0, true);
    capSection(sections.length - 1, false);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function extrudedShape(points, depth, bevel = 0.018, bevelSegments = 4) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 18,
  });
}

function addBase(group, m, scale = 1) {
  group.add(lathe([
    [0.00,0.00],[0.26*scale,0.00],[0.36*scale,0.008],[0.45*scale,0.026],[0.50*scale,0.055],
    [0.52*scale,0.082],[0.515*scale,0.108],[0.49*scale,0.136],[0.45*scale,0.168],[0.405*scale,0.205],
    [0.375*scale,0.245],[0.355*scale,0.282],[0.345*scale,0.305],
  ], m.body, 0, "base"));
  ring(group, m.trim, 0.472 * scale, 0.102, 0.013, "base-trim");
  ring(group, m.body, 0.362 * scale, 0.277, 0.010, "base-lip");
}

function addCollar(group, m, radius, y) {
  ring(group, m.trim, radius, y, 0.012, "collar-trim");
  group.add(mesh(new THREE.CylinderGeometry(radius * 0.98, radius * 0.90, 0.055, 72, 2), m.body, y + 0.008, "collar"));
}

function addGem(group, m, x, y, z, scale = 1, role = "gem") {
  const gem = mesh(new THREE.OctahedronGeometry(0.044 * scale, 1), m.trim, y, role);
  gem.position.set(x, y, z);
  gem.scale.set(0.78, 1.28, 0.78);
  group.add(gem);
}

function fit(group, type) {
  const envelope = pieceCellEnvelope(type);
  group.position.set(0, 0, 0);
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error(`Invalid ${type} bounds`);
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

function createPawn(m) {
  const g = new THREE.Group();
  addBase(g, m, 0.78);
  g.add(lathe([
    [0.245,0.00],[0.228,0.045],[0.205,0.105],[0.181,0.185],[0.162,0.285],
    [0.151,0.395],[0.154,0.505],[0.168,0.595],[0.192,0.665],[0.214,0.715],
  ], m.body, 0.29, "pawn-stem"));
  addCollar(g, m, 0.19, 0.985);
  const head = mesh(new THREE.SphereGeometry(0.196, 64, 40), m.body, 1.19, "pawn-head");
  g.add(head);
  addGem(g, m, 0, 1.372, 0, 0.58, "pawn-gem");
  return g;
}

function createRook(m) {
  const g = new THREE.Group();
  addBase(g, m, 0.84);
  g.add(lathe([
    [0.275,0.00],[0.258,0.055],[0.235,0.135],[0.214,0.245],[0.198,0.375],
    [0.194,0.515],[0.202,0.645],[0.224,0.755],[0.258,0.835],[0.292,0.885],
  ], m.body, 0.29, "rook-tower"));
  addCollar(g, m, 0.278, 1.09);
  g.add(mesh(new THREE.CylinderGeometry(0.322, 0.292, 0.17, 72, 3), m.body, 1.23, "rook-crown"));
  g.add(mesh(new THREE.CylinderGeometry(0.226, 0.226, 0.085, 64, 2), m.inset, 1.31, "rook-recess"));
  const battlement = new THREE.BoxGeometry(0.132, 0.19, 0.132, 3, 4, 3);
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    const b = mesh(battlement, m.body, 1.43, "rook-battlement");
    b.position.set(Math.cos(a) * 0.266, 1.43, Math.sin(a) * 0.266);
    b.rotation.y = -a + Math.PI / 4;
    g.add(b);
  }
  for (let i = 0; i < 4; i += 1) {
    const a = i * Math.PI / 2;
    addGem(g, m, Math.cos(a) * 0.274, 1.255, Math.sin(a) * 0.274, 0.52, "rook-gem");
  }
  return g;
}

function createKnight(m) {
  const g = new THREE.Group();
  addBase(g, m, 0.85);
  g.add(lathe([
    [0.275,0.00],[0.255,0.055],[0.232,0.135],[0.214,0.245],[0.208,0.365],
    [0.218,0.465],[0.248,0.535],[0.282,0.575],
  ], m.body, 0.29, "knight-pedestal"));
  addCollar(g, m, 0.228, 0.84);

  const horseSections = [
    {x:-0.15,y:0.88,rx:0.205,rz:0.182},{x:-0.19,y:0.99,rx:0.215,rz:0.185},
    {x:-0.205,y:1.11,rx:0.207,rz:0.18},{x:-0.197,y:1.23,rx:0.195,rz:0.171},
    {x:-0.172,y:1.35,rx:0.183,rz:0.163},{x:-0.132,y:1.46,rx:0.172,rz:0.155},
    {x:-0.075,y:1.555,rx:0.166,rz:0.149},{x:-0.005,y:1.625,rx:0.166,rz:0.146},
    {x:0.075,y:1.67,rx:0.172,rz:0.146},{x:0.16,y:1.675,rx:0.181,rz:0.147},
    {x:0.245,y:1.65,rx:0.184,rz:0.145},{x:0.325,y:1.605,rx:0.177,rz:0.139},
    {x:0.40,y:1.545,rx:0.162,rz:0.13},{x:0.465,y:1.48,rx:0.145,rz:0.118},
    {x:0.525,y:1.425,rx:0.126,rz:0.107},{x:0.58,y:1.39,rx:0.104,rz:0.096},
    {x:0.625,y:1.372,rx:0.076,rz:0.082},{x:0.652,y:1.37,rx:0.046,rz:0.06},
  ];
  g.add(mesh(loft(horseSections, 64), m.body, 0, "knight-sculpt"));

  const jaw = loft([
    {x:0.285,y:1.55,rx:0.12,rz:0.112},{x:0.37,y:1.495,rx:0.125,rz:0.108},
    {x:0.46,y:1.435,rx:0.112,rz:0.10},{x:0.54,y:1.39,rx:0.09,rz:0.086},
    {x:0.61,y:1.37,rx:0.052,rz:0.064},
  ], 48);
  g.add(mesh(jaw, m.body, 0, "knight-jaw"));

  const cheekGeo = new THREE.SphereGeometry(0.108, 40, 28);
  for (const side of [-1, 1]) {
    const cheek = mesh(cheekGeo, m.body, 1.61, "knight-cheek");
    cheek.scale.set(1.18, 0.76, 0.43);
    cheek.position.set(0.19, 1.61, side * 0.112);
    g.add(cheek);
    const eye = mesh(new THREE.SphereGeometry(0.021, 18, 12), m.eye, 1.655, "knight-eye");
    eye.position.set(0.292, 1.655, side * 0.148);
    g.add(eye);
  }

  const nostril = mesh(new THREE.SphereGeometry(0.019, 16, 10), m.inset, 1.405, "knight-nostril");
  nostril.position.set(0.61, 1.405, 0.063);
  nostril.scale.set(1, 0.65, 0.45);
  g.add(nostril);

  for (const side of [-1, 1]) {
    const ear = loft([
      {x:0.025,y:1.745,z:side*0.085,rx:0.052,rz:0.035},
      {x:0.005,y:1.835,z:side*0.088,rx:0.038,rz:0.028},
      {x:-0.018,y:1.925,z:side*0.09,rx:0.018,rz:0.016},
      {x:-0.032,y:1.968,z:side*0.09,rx:0.005,rz:0.005},
    ], 28);
    g.add(mesh(ear, m.body, 0, "knight-ear"));
  }

  const manePoints = [
    [-0.238,0.98],[-0.252,1.09],[-0.246,1.21],[-0.226,1.33],[-0.195,1.445],
    [-0.158,1.55],[-0.118,1.64],[-0.08,1.72],[-0.045,1.785],[-0.018,1.835],
    [0.006,1.865],[0.025,1.878],[0.038,1.855],[0.02,1.80],[-0.01,1.73],[-0.05,1.645],
    [-0.095,1.55],[-0.14,1.445],[-0.18,1.33],[-0.212,1.21],[-0.226,1.09],[-0.216,0.99],
  ];
  const mane = extrudedShape(manePoints, 0.075, 0.012, 3);
  const maneMesh = mesh(mane, m.trim, 0, "knight-mane");
  maneMesh.position.z = -0.0375;
  g.add(maneMesh);

  const brow = mesh(new THREE.SphereGeometry(0.075, 30, 18), m.body, 1.655, "knight-brow");
  brow.scale.set(1.35, 0.42, 1.02);
  brow.position.set(0.265, 1.655, 0);
  g.add(brow);
  return g;
}

function createBishop(m) {
  const g = new THREE.Group();
  addBase(g, m, 0.83);
  g.add(lathe([
    [0.27,0.00],[0.248,0.055],[0.22,0.14],[0.191,0.255],[0.165,0.39],
    [0.149,0.53],[0.145,0.66],[0.155,0.77],[0.18,0.86],[0.211,0.92],
  ], m.body, 0.29, "bishop-stem"));
  addCollar(g, m, 0.205, 1.12);

  const left = [
    {x:-0.058,y:1.24,rx:0.112,rz:0.122},{x:-0.083,y:1.35,rx:0.13,rz:0.141},
    {x:-0.095,y:1.47,rx:0.132,rz:0.143},{x:-0.088,y:1.59,rx:0.118,rz:0.13},
    {x:-0.071,y:1.70,rx:0.098,rz:0.108},{x:-0.05,y:1.79,rx:0.072,rz:0.082},
    {x:-0.03,y:1.86,rx:0.046,rz:0.054},{x:-0.016,y:1.915,rx:0.022,rz:0.027},
  ];
  const right = left.map((s) => ({ ...s, x: -s.x }));
  const l = mesh(loft(left, 56), m.body, 0, "bishop-mitre-left");
  const r = mesh(loft(right, 56), m.body, 0, "bishop-mitre-right");
  l.rotation.z = -0.065;
  r.rotation.z = 0.065;
  g.add(l, r);

  const slitShape = [
    [-0.045,0.00],[0.028,0.00],[0.205,0.35],[0.13,0.35],
  ];
  const slit = mesh(extrudedShape(slitShape, 0.11, 0.008, 2), m.inset, 1.49, "bishop-slit");
  slit.position.z = -0.055;
  slit.rotation.z = 0.14;
  g.add(slit);
  addGem(g, m, 0, 1.82, 0.115, 0.62, "bishop-gem");
  return g;
}

function createQueen(m) {
  const g = new THREE.Group();
  addBase(g, m, 0.88);
  g.add(lathe([
    [0.28,0.00],[0.258,0.055],[0.23,0.14],[0.20,0.26],[0.171,0.405],
    [0.151,0.565],[0.148,0.72],[0.16,0.84],[0.19,0.93],[0.228,1.005],
  ], m.body, 0.29, "queen-stem"));
  addCollar(g, m, 0.232, 1.30);
  g.add(mesh(new THREE.CylinderGeometry(0.242, 0.26, 0.105, 72, 2), m.body, 1.39, "queen-crown-ring"));
  const petalShape = [[-0.055,0],[0.055,0],[0.043,0.08],[0.02,0.18],[0,0.285],[-0.02,0.18],[-0.043,0.08]];
  const petalGeo = extrudedShape(petalShape, 0.055, 0.009, 3);
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    const p = mesh(petalGeo, m.body, 1.43, "queen-crown-point");
    p.position.set(Math.cos(a) * 0.205, 1.43, Math.sin(a) * 0.205);
    p.rotation.y = -a + Math.PI / 2;
    p.position.z -= 0.0275 * Math.cos(a);
    g.add(p);
    addGem(g, m, Math.cos(a) * 0.205, 1.705, Math.sin(a) * 0.205, 0.55, "queen-gem");
  }
  addGem(g, m, 0, 1.58, 0, 0.82, "queen-center-gem");
  return g;
}

function createKing(m) {
  const g = new THREE.Group();
  addBase(g, m, 0.90);
  g.add(lathe([
    [0.285,0.00],[0.264,0.055],[0.236,0.14],[0.204,0.27],[0.174,0.42],
    [0.153,0.59],[0.15,0.745],[0.165,0.86],[0.198,0.95],[0.242,1.03],
  ], m.body, 0.29, "king-stem"));
  addCollar(g, m, 0.247, 1.35);
  g.add(mesh(new THREE.CylinderGeometry(0.218, 0.249, 0.16, 72, 3), m.body, 1.48, "king-crown"));
  g.add(mesh(new THREE.SphereGeometry(0.095, 40, 26), m.trim, 1.64, "king-orb"));
  const crossShape = [[-0.035,0], [0.035,0], [0.035,0.12], [0.13,0.12], [0.13,0.19], [0.035,0.19], [0.035,0.33], [-0.035,0.33], [-0.035,0.19], [-0.13,0.19], [-0.13,0.12], [-0.035,0.12]];
  const cross = mesh(extrudedShape(crossShape, 0.07, 0.012, 3), m.body, 1.73, "king-cross");
  cross.position.z = -0.035;
  g.add(cross);
  addGem(g, m, 0, 1.895, 0.04, 0.55, "king-gem");
  return g;
}

const BUILDERS = { pawn: createPawn, rook: createRook, knight: createKnight, bishop: createBishop, queen: createQueen, king: createKing };

export function countObjectTriangles(object) {
  let triangles = 0;
  object?.traverse?.((child) => {
    if (!child.isMesh) return;
    const geometry = child.geometry;
    triangles += geometry?.index?.count
      ? Math.floor(geometry.index.count / 3)
      : Math.floor((geometry?.attributes?.position?.count ?? 0) / 3);
  });
  return triangles;
}

export function countUniquePieceResources(object) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  let meshes = 0;
  object?.traverse?.((child) => {
    if (!child.isMesh) return;
    meshes += 1;
    if (child.geometry) geometries.add(child.geometry.uuid);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (!material) continue;
      materials.add(material.uuid);
      if (material.map) textures.add(material.map.uuid);
      if (material.roughnessMap) textures.add(material.roughnessMap.uuid);
    }
  });
  return { meshes, uniqueGeometries: geometries.size, uniqueMaterials: materials.size, uniqueTextures: textures.size };
}

export class OpenSourceStauntonV12PieceSet {
  constructor() {
    this.templates = new Map();
    this.stats = new Map();
  }

  key(type, side) { return `${type}:${side}`; }

  create(type, side) {
    const safeType = TYPES.includes(type) ? type : "pawn";
    const safeSide = side === "black" ? "black" : "white";
    const key = this.key(safeType, safeSide);
    if (!this.templates.has(key)) {
      const m = materialsFor(safeType, safeSide);
      const raw = BUILDERS[safeType](m);
      const fitted = fit(raw, safeType);
      fitted.userData.forgeVisualSource = SOURCE_ID;
      fitted.userData.openSourceStauntonRevision = REVISION;
      fitted.userData.referenceAssetsPolicy = "reference-only-not-runtime";
      fitted.userData.freeForPublicRenderer = true;
      fitted.userData.roleTextureKey = `albedo:${safeType}:${safeSide}`;
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
      type,
      side,
      revision: REVISION,
      style: "Open-source sculpted Staunton v12",
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

  inspectAll(side = "white") {
    return TYPES.map((type) => this.inspect(type, side));
  }
}

export class OpenSourceStauntonPieceSet extends OpenSourceStauntonV12PieceSet {}
export const OPEN_SOURCE_STAUNTON_REVISION = REVISION;
export const OPEN_SOURCE_STAUNTON_SOURCE_ID = SOURCE_ID;
export const OPEN_SOURCE_STAUNTON_TYPES = TYPES;
export function getRoleTexture(type, side) { return makeRoleTexture(type, side); }
