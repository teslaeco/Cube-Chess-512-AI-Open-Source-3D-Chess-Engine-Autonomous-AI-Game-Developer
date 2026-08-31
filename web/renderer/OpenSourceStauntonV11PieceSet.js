import * as THREE from "three";
import { pieceCellEnvelope } from "./pieceScaleProfile.js";

const REVISION = "2026-09-01-open-source-staunton-v11-art-directed";
const SOURCE_ID = "open-source-staunton-v11-art-directed";
const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];
const LATHE_SEGMENTS = 96;
const textureCache = new Map();
const materialCache = new Map();

function seededNoise(x, y, seed) {
  let n = (x * 374761393 + y * 668265263 + seed * 69069) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function makeSurfaceTexture(side) {
  const key = `surface:${side}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const n = seededNoise(x, y, side === "white" ? 11 : 29);
      const vein = Math.max(0, 1 - Math.abs(Math.sin((x * 0.16) + (y * 0.09) + n * 2.8)) * 5.5);
      if (side === "white") {
        const base = 226 + Math.round(n * 18);
        data[i] = Math.min(255, base + Math.round(vein * 8));
        data[i + 1] = Math.min(255, base + Math.round(vein * 4));
        data[i + 2] = Math.min(255, base - 5 + Math.round(vein * 12));
      } else {
        const base = 18 + Math.round(n * 18);
        data[i] = base + Math.round(vein * 8);
        data[i + 1] = base + Math.round(vein * 15);
        data[i + 2] = base + Math.round(vein * 20);
      }
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 2.2);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

function makeRoughnessTexture(side) {
  const key = `rough:${side}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const n = seededNoise(x, y, side === "white" ? 101 : 211);
      const v = side === "white" ? 70 + Math.round(n * 55) : 50 + Math.round(n * 50);
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 2.2);
  textureCache.set(key, texture);
  return texture;
}

function materialsFor(side) {
  if (materialCache.has(side)) return materialCache.get(side);
  const white = side === "white";
  const body = new THREE.MeshPhysicalMaterial({
    color: white ? 0xf1eee7 : 0x11151a,
    map: makeSurfaceTexture(side),
    roughnessMap: makeRoughnessTexture(side),
    roughness: white ? 0.31 : 0.24,
    metalness: white ? 0.06 : 0.22,
    clearcoat: white ? 0.62 : 0.76,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.05,
  });
  const trim = new THREE.MeshPhysicalMaterial({
    color: white ? 0xcaa85f : 0x19b8b0,
    metalness: 0.72,
    roughness: 0.2,
    clearcoat: 0.72,
    clearcoatRoughness: 0.14,
    emissive: white ? 0x2f2412 : 0x063d3a,
    emissiveIntensity: white ? 0.08 : 0.18,
  });
  const inset = new THREE.MeshPhysicalMaterial({
    color: white ? 0x254863 : 0x09161d,
    metalness: 0.35,
    roughness: 0.24,
    clearcoat: 0.6,
  });
  const eye = new THREE.MeshPhysicalMaterial({
    color: white ? 0x15354a : 0xd3a55a,
    metalness: 0.45,
    roughness: 0.16,
    clearcoat: 0.85,
  });
  const set = { body, trim, inset, eye };
  materialCache.set(side, set);
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
  return mesh(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), LATHE_SEGMENTS), material, y, role);
}

function ring(group, material, radius, y, tube = 0.015, role = "ring") {
  const r = mesh(new THREE.TorusGeometry(radius, tube, 16, 72), material, y, role);
  r.rotation.x = Math.PI / 2;
  group.add(r);
}

function loft(sections, radial = 48) {
  const positions = [];
  const indices = [];
  const uvs = [];
  for (let s = 0; s < sections.length; s += 1) {
    const section = sections[s];
    for (let i = 0; i < radial; i += 1) {
      const a = (i / radial) * Math.PI * 2 + (section.twist ?? 0);
      const shape = section.shape ? section.shape(a) : 1;
      positions.push(
        (section.x ?? 0) + Math.cos(a) * section.rx * shape,
        section.y,
        (section.z ?? 0) + Math.sin(a) * section.rz * shape,
      );
      uvs.push(i / radial, s / Math.max(1, sections.length - 1));
    }
  }
  for (let s = 0; s < sections.length - 1; s += 1) {
    for (let i = 0; i < radial; i += 1) {
      const n = (i + 1) % radial;
      const a = s * radial + i, b = s * radial + n, c = (s + 1) * radial + n, d = (s + 1) * radial + i;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function extrudedShape(points, depth, bevel = 0.018, curveSegments = 14) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments,
  });
}

function addBase(group, m, scale = 1) {
  group.add(lathe([
    [0.00,0.00],[0.30*scale,0.00],[0.40*scale,0.012],[0.48*scale,0.035],[0.515*scale,0.072],
    [0.52*scale,0.102],[0.50*scale,0.132],[0.46*scale,0.166],[0.41*scale,0.205],[0.375*scale,0.245],[0.35*scale,0.29],
  ], m.body, 0, "base"));
  ring(group, m.trim, 0.47 * scale, 0.10, 0.014, "base-trim");
  ring(group, m.body, 0.36 * scale, 0.275, 0.011, "base-lip");
}

function addCollar(group, m, radius, y) {
  ring(group, m.trim, radius, y, 0.013, "collar-trim");
  group.add(mesh(new THREE.CylinderGeometry(radius * 0.98, radius * 0.91, 0.06, 72, 2), m.body, y + 0.008, "collar"));
}

function fit(group, type) {
  const envelope = pieceCellEnvelope(type);
  group.position.set(0,0,0);
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  if (![size.x,size.y,size.z].every((v)=>Number.isFinite(v)&&v>0)) throw new Error(`Invalid ${type} bounds`);
  const scale = Math.min(envelope.maxHeight / size.y, envelope.maxFootprint / size.x, envelope.maxFootprint / size.z);
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

function addGem(group, m, x, y, z, scale = 1, role = "gem") {
  const gem = mesh(new THREE.OctahedronGeometry(0.045 * scale, 1), m.trim, y, role);
  gem.position.set(x, y, z);
  gem.scale.set(0.8, 1.35, 0.8);
  group.add(gem);
}

function createPawn(m) {
  const g = new THREE.Group(); addBase(g,m,0.78);
  g.add(lathe([[0.25,0],[0.225,0.05],[0.195,0.14],[0.166,0.28],[0.148,0.43],[0.153,0.56],[0.18,0.66],[0.215,0.73]],m.body,0.29,"pawn-stem"));
  addCollar(g,m,0.19,0.98);
  const head = mesh(new THREE.IcosahedronGeometry(0.195,3),m.body,1.19,"pawn-head");
  g.add(head); addGem(g,m,0,1.37,0,0.72,"pawn-gem"); return g;
}

function createRook(m) {
  const g = new THREE.Group(); addBase(g,m,0.84);
  g.add(lathe([[0.27,0],[0.245,0.06],[0.218,0.17],[0.196,0.33],[0.19,0.51],[0.20,0.67],[0.235,0.79],[0.285,0.88]],m.body,0.29,"rook-tower"));
  addCollar(g,m,0.275,1.08);
  g.add(mesh(new THREE.CylinderGeometry(0.32,0.285,0.18,72,3),m.body,1.23,"rook-crown"));
  g.add(mesh(new THREE.CylinderGeometry(0.225,0.225,0.08,64,2),m.inset,1.31,"rook-recess"));
  const battlement = new THREE.BoxGeometry(0.13,0.19,0.13,3,4,3);
  for (let i=0;i<8;i+=1) {
    const a=i*Math.PI/4; const b=mesh(battlement,m.body,1.43,"rook-battlement");
    b.position.set(Math.cos(a)*0.265,1.43,Math.sin(a)*0.265); b.rotation.y=-a+Math.PI/4; g.add(b);
  }
  for(let i=0;i<4;i+=1){const a=i*Math.PI/2;addGem(g,m,Math.cos(a)*0.275,1.26,Math.sin(a)*0.275,0.62,"rook-gem");}
  return g;
}

function createBishop(m) {
  const g = new THREE.Group(); addBase(g,m,0.83);
  g.add(lathe([[0.27,0],[0.245,0.06],[0.212,0.17],[0.18,0.32],[0.153,0.49],[0.145,0.65],[0.158,0.76],[0.19,0.86],[0.215,0.92]],m.body,0.29,"bishop-stem"));
  addCollar(g,m,0.205,1.12);
  const left = loft([
    {x:-0.06,y:1.24,rx:0.11,rz:0.12},{x:-0.085,y:1.35,rx:0.13,rz:0.14},{x:-0.095,y:1.47,rx:0.13,rz:0.14},
    {x:-0.085,y:1.59,rx:0.115,rz:0.125},{x:-0.062,y:1.70,rx:0.088,rz:0.10},{x:-0.038,y:1.79,rx:0.055,rz:0.065},{x:-0.018,y:1.86,rx:0.022,rz:0.028}
  ],56);
  const right = left.clone();
  const l = mesh(left,m.body,0,"bishop-mitre-left");
  const rSections=[
    {x:0.06,y:1.24,rx:0.11,rz:0.12},{x:0.085,y:1.35,rx:0.13,rz:0.14},{x:0.095,y:1.47,rx:0.13,rz:0.14},
    {x:0.085,y:1.59,rx:0.115,rz:0.125},{x:0.062,y:1.70,rx:0.088,rz:0.10},{x:0.038,y:1.79,rx:0.055,rz:0.065},{x:0.018,y:1.86,rx:0.022,rz:0.028}
  ];
  const r=mesh(loft(rSections,56),m.body,0,"bishop-mitre-right");
  l.rotation.z=-0.11; r.rotation.z=0.11; g.add(l,r);
  const slit=mesh(extrudedShape([[-0.025,-0.17],[0.025,-0.17],[0.18,0.17],[0.13,0.19]],0.12,0.008,8),m.inset,1.57,"bishop-slit");
  slit.position.z=-0.06; g.add(slit); addGem(g,m,0,1.48,0.135,0.9,"bishop-gem"); return g;
}

function createKnight(m) {
  const g = new THREE.Group(); addBase(g,m,0.86);
  g.add(lathe([[0.27,0],[0.245,0.06],[0.215,0.17],[0.195,0.31],[0.205,0.46],[0.245,0.56]],m.body,0.29,"knight-pedestal"));
  addCollar(g,m,0.225,0.82);
  const body = loft([
    {x:-0.14,y:0.88,rx:0.21,rz:0.19},{x:-0.18,y:1.00,rx:0.22,rz:0.19},{x:-0.20,y:1.13,rx:0.21,rz:0.18},
    {x:-0.18,y:1.27,rx:0.195,rz:0.17},{x:-0.13,y:1.40,rx:0.175,rz:0.155},{x:-0.06,y:1.50,rx:0.165,rz:0.145},
    {x:0.03,y:1.58,rx:0.17,rz:0.145},{x:0.13,y:1.62,rx:0.185,rz:0.15},{x:0.24,y:1.60,rx:0.18,rz:0.145},
    {x:0.35,y:1.54,rx:0.165,rz:0.135},{x:0.45,y:1.46,rx:0.145,rz:0.12},{x:0.54,y:1.39,rx:0.115,rz:0.105},
    {x:0.61,y:1.36,rx:0.075,rz:0.08}
  ],64);
  g.add(mesh(body,m.body,0,"knight-body"));
  const jaw=mesh(loft([{x:0.24,y:1.48,rx:0.12,rz:0.11},{x:0.37,y:1.43,rx:0.12,rz:0.105},{x:0.50,y:1.37,rx:0.095,rz:0.09},{x:0.59,y:1.35,rx:0.045,rz:0.06}],44),m.body,0,"knight-jaw"); g.add(jaw);
  for(const side of [-1,1]){
    const ear=mesh(loft([{x:0.02,y:1.67,z:side*0.085,rx:0.052,rz:0.034},{x:0.00,y:1.79,z:side*0.09,rx:0.032,rz:0.022},{x:-0.02,y:1.89,z:side*0.09,rx:0.008,rz:0.008}],24),m.body,0,"knight-ear");g.add(ear);
    const eye=mesh(new THREE.SphereGeometry(0.022,18,12),m.eye,1.59,"knight-eye"); eye.position.set(0.27,1.59,side*0.148); g.add(eye);
  }
  const nostril=mesh(new THREE.SphereGeometry(0.018,14,10),m.inset,1.385,"knight-nostril"); nostril.position.set(0.56,1.385,0.078); g.add(nostril);
  const manePoints=[[-0.235,0.98],[-0.25,1.10],[-0.245,1.23],[-0.22,1.36],[-0.18,1.49],[-0.13,1.61],[-0.07,1.71],[-0.02,1.78],[0.015,1.70],[ -0.03,1.61],[-0.08,1.51],[-0.12,1.40],[-0.15,1.28],[-0.17,1.16],[-0.17,1.04]];
  const mane=mesh(extrudedShape(manePoints,0.085,0.012,18),m.trim,0,"knight-mane"); mane.position.z=-0.0425; g.add(mane);
  addGem(g,m,0.08,1.48,0.145,0.58,"knight-gem");
  return g;
}

function createQueen(m) {
  const g=new THREE.Group(); addBase(g,m,0.88);
  g.add(lathe([[0.28,0],[0.255,0.06],[0.225,0.17],[0.192,0.34],[0.164,0.53],[0.15,0.70],[0.165,0.82],[0.20,0.92],[0.235,0.99]],m.body,0.29,"queen-stem"));
  addCollar(g,m,0.235,1.28);
  g.add(mesh(new THREE.CylinderGeometry(0.235,0.255,0.10,72,2),m.body,1.38,"queen-crown-base"));
  const petal=extrudedShape([[-0.055,0],[0.055,0],[0.04,0.14],[0,0.27],[-0.04,0.14]],0.06,0.01,12);
  for(let i=0;i<8;i+=1){const a=i*Math.PI/4;const p=mesh(petal,m.body,1.43,"queen-crown");p.position.set(Math.cos(a)*0.205,1.43,Math.sin(a)*0.205);p.rotation.y=-a-Math.PI/2;p.position.z-=0.03;g.add(p);addGem(g,m,Math.cos(a)*0.205,1.70,Math.sin(a)*0.205,0.65,"queen-gem");}
  addGem(g,m,0,1.56,0,1.05,"queen-center-gem"); return g;
}

function createKing(m) {
  const g=new THREE.Group(); addBase(g,m,0.90);
  g.add(lathe([[0.285,0],[0.26,0.06],[0.23,0.17],[0.198,0.35],[0.168,0.55],[0.152,0.73],[0.17,0.84],[0.205,0.94],[0.245,1.02]],m.body,0.29,"king-stem"));
  addCollar(g,m,0.247,1.35);
  g.add(mesh(new THREE.CylinderGeometry(0.215,0.248,0.17,72,3),m.body,1.48,"king-crown"));
  addGem(g,m,0,1.66,0,0.9,"king-orb");
  const vertical=mesh(new THREE.BoxGeometry(0.075,0.36,0.075,3,10,3),m.body,1.91,"king-cross");
  const horizontal=mesh(new THREE.BoxGeometry(0.30,0.075,0.075,10,3,3),m.body,1.93,"king-cross"); g.add(vertical,horizontal);
  addGem(g,m,0,1.93,0.05,0.55,"king-cross-gem"); return g;
}

const BUILDERS={pawn:createPawn,rook:createRook,knight:createKnight,bishop:createBishop,queen:createQueen,king:createKing};

export function countObjectTriangles(object,{includeDecorative=false}={}){let n=0;object?.traverse?.((c)=>{if(!c.isMesh)return;if(!includeDecorative&&c.userData?.decorative)return;const geom=c.geometry;n+=geom?.index?.count?Math.floor(geom.index.count/3):Math.floor((geom?.attributes?.position?.count??0)/3);});return n;}

export class OpenSourceStauntonV11PieceSet {
  constructor(){this.templates=new Map();this.stats=new Map();}
  key(type,color){return `${type}:${color}`;}
  build(type,color){const builder=BUILDERS[type]??BUILDERS.pawn;const g=builder(materialsFor(color));fit(g,type);g.name=`${color}-${type}-${SOURCE_ID}`;g.userData={forgeVisualSource:SOURCE_ID,openSourceStauntonRevision:REVISION,openSourceStauntonType:type,openSourceStauntonColor:color,referenceAssetsPolicy:"reference-only-not-runtime"};g.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(g);const size=box.getSize(new THREE.Vector3());const e=pieceCellEnvelope(type);const triangles=countObjectTriangles(g);this.stats.set(this.key(type,color),{type,color,revision:REVISION,style:"Art-directed textured open-source Staunton v11",runtimePrimarySource:SOURCE_ID,referenceAssetsPolicy:"reference-only-not-runtime",triangles,bounds:{x:size.x,y:size.y,z:size.z},finite:[size.x,size.y,size.z].every((v)=>Number.isFinite(v)&&v>0),fitsLevel:size.y<=e.maxHeight+1e-6,fitsCell:size.x<=e.maxFootprint+1e-6&&size.z<=e.maxFootprint+1e-6,freeForPublicRenderer:true});return g;}
  getTemplate(type,color){const k=this.key(type,color);if(!this.templates.has(k))this.templates.set(k,this.build(type,color));return this.templates.get(k);}
  create(type,color){const source=this.getTemplate(type,color);const clone=source.clone(true);clone.userData={...source.userData};return clone;}
  inspect(type,color="white"){this.getTemplate(type,color);return this.stats.get(this.key(type,color));}
  inspectAll(){return TYPES.map((type)=>this.inspect(type,"white"));}
}

export const OPEN_SOURCE_STAUNTON_V11_REVISION=REVISION;
export const OPEN_SOURCE_STAUNTON_V11_SOURCE=SOURCE_ID;
