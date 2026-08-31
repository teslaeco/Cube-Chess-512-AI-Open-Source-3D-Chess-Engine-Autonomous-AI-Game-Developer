import * as THREE from "three";
import { CELL_RENDER_SIZE, LEVEL_SPACING } from "./coordinates.js";

const LATHE_SEGMENTS = 96;
const TORUS_RADIAL = 16;
const TORUS_TUBULAR = 72;
const OPEN_SOURCE_REVISION = "2026-08-31-opensource-staunton-v7-sculpted";
const SOURCE_ID = "open-source-staunton-v7-sculpted";

// Conservative 8-level envelope. Nothing is allowed to approach another level or adjacent cell.
const SAFE_FIT = Object.freeze({
  pawn: Object.freeze({ maxHeight: LEVEL_SPACING * 0.27, maxFootprint: CELL_RENDER_SIZE * 0.34 }),
  rook: Object.freeze({ maxHeight: LEVEL_SPACING * 0.30, maxFootprint: CELL_RENDER_SIZE * 0.37 }),
  knight: Object.freeze({ maxHeight: LEVEL_SPACING * 0.34, maxFootprint: CELL_RENDER_SIZE * 0.38 }),
  bishop: Object.freeze({ maxHeight: LEVEL_SPACING * 0.38, maxFootprint: CELL_RENDER_SIZE * 0.37 }),
  queen: Object.freeze({ maxHeight: LEVEL_SPACING * 0.44, maxFootprint: CELL_RENDER_SIZE * 0.39 }),
  king: Object.freeze({ maxHeight: LEVEL_SPACING * 0.49, maxFootprint: CELL_RENDER_SIZE * 0.40 }),
});

const materialCache = new Map();
const edgeMaterialCache = new Map();

function material(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: options.metalness ?? 0.16,
    roughness: options.roughness ?? 0.34,
    clearcoat: options.clearcoat ?? 0.62,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.24,
    reflectivity: options.reflectivity ?? 0.58,
  });
}

function materialsFor(color) {
  if (materialCache.has(color)) return materialCache.get(color);
  const white = color === "white";
  const set = white ? {
    body: material(0xf2eee5, { metalness: 0.05, roughness: 0.36, clearcoat: 0.50 }),
    trim: material(0xc9ad6b, { metalness: 0.48, roughness: 0.27 }),
    inset: material(0x56616c, { metalness: 0.20, roughness: 0.46 }),
    eye: material(0x1d3344, { metalness: 0.18, roughness: 0.30 }),
    edge: 0x566675,
  } : {
    body: material(0x11151a, { metalness: 0.22, roughness: 0.31, clearcoat: 0.58 }),
    trim: material(0x99633b, { metalness: 0.40, roughness: 0.29 }),
    inset: material(0x030405, { metalness: 0.10, roughness: 0.50 }),
    eye: material(0xc29158, { metalness: 0.30, roughness: 0.27 }),
    edge: 0x9ca7b0,
  };
  materialCache.set(color, set);
  return set;
}

function mark(item, role) {
  item.castShadow = true;
  item.receiveShadow = true;
  item.userData.forgePremiumRole = role;
  item.userData.openSourceStauntonRole = role;
  return item;
}

function mesh(geometry, mat, y = 0, role = "surface") {
  const out = mark(new THREE.Mesh(geometry, mat), role);
  out.position.y = y;
  return out;
}

function lathe(profile, mat, y = 0, role = "surface") {
  return mesh(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), LATHE_SEGMENTS), mat, y, role);
}

function addRing(group, mat, radius, y, tube = 0.015, role = "ring") {
  const ring = mesh(new THREE.TorusGeometry(radius, tube, TORUS_RADIAL, TORUS_TUBULAR), mat, y, role);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
}

function addBase(group, m, scale = 1) {
  group.add(lathe([
    [0.00,0.00],[0.30*scale,0.00],[0.40*scale,0.018],[0.47*scale,0.045],[0.50*scale,0.075],
    [0.49*scale,0.105],[0.46*scale,0.132],[0.42*scale,0.158],[0.395*scale,0.19],[0.38*scale,0.23],
    [0.365*scale,0.265],[0.35*scale,0.29],
  ], m.body, 0, "base"));
  addRing(group, m.trim, 0.455*scale, 0.102, 0.015, "base-trim");
  addRing(group, m.body, 0.37*scale, 0.272, 0.010, "base-lip");
}

function addCollar(group, m, radius, y) {
  addRing(group, m.trim, radius, y, 0.015, "collar");
  group.add(mesh(new THREE.CylinderGeometry(radius*0.98, radius*0.92, 0.055, 64, 2), m.body, y + 0.01, "collar-body"));
}

function fitInsideCell(group, type) {
  const envelope = SAFE_FIT[type] ?? SAFE_FIT.pawn;
  group.position.set(0,0,0);
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(group);
  let size = box.getSize(new THREE.Vector3());
  if (![size.x,size.y,size.z].every((v)=>Number.isFinite(v) && v>0)) throw new Error(`Invalid ${type} geometry bounds`);
  const s = Math.min(envelope.maxHeight/size.y, envelope.maxFootprint/size.x, envelope.maxFootprint/size.z);
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

function addEdges(group, m) {
  const key = String(m.edge);
  let edgeMaterial = edgeMaterialCache.get(key);
  if (!edgeMaterial) {
    edgeMaterial = new THREE.LineBasicMaterial({ color: m.edge, transparent: true, opacity: 0.30, depthWrite: false });
    edgeMaterialCache.set(key, edgeMaterial);
  }
  const important = new Set(["head","battlement","bishop-mitre","bishop-notch","knight-head","knight-muzzle","ear","mane-fin","crown","cross"]);
  const targets = [];
  group.traverse((child)=>{ if (child.isMesh && important.has(child.userData?.openSourceStauntonRole)) targets.push(child); });
  for (const child of targets) {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(child.geometry, 34), edgeMaterial);
    edges.position.copy(child.position);
    edges.rotation.copy(child.rotation);
    edges.scale.copy(child.scale).multiplyScalar(1.0015);
    edges.userData.decorative = true;
    child.parent.add(edges);
  }
}

function createPawn(m) {
  const g = new THREE.Group(); addBase(g,m,0.86);
  g.add(lathe([[0.285,0],[0.26,0.05],[0.22,0.13],[0.19,0.26],[0.165,0.42],[0.16,0.55],[0.18,0.64],[0.22,0.71],[0.235,0.76]],m.body,0.29,"stem"));
  addCollar(g,m,0.215,1.00);
  const head=mesh(new THREE.SphereGeometry(0.22,64,40),m.body,1.22,"head"); head.scale.y=1.03; g.add(head);
  return g;
}

function createRook(m) {
  const g = new THREE.Group(); addBase(g,m,0.93);
  g.add(lathe([[0.29,0],[0.27,0.06],[0.245,0.14],[0.22,0.27],[0.205,0.45],[0.205,0.63],[0.225,0.75],[0.255,0.83],[0.30,0.89]],m.body,0.29,"tower"));
  addCollar(g,m,0.29,1.10);
  g.add(mesh(new THREE.CylinderGeometry(0.34,0.315,0.20,64,3),m.body,1.25,"crown"));
  g.add(mesh(new THREE.CylinderGeometry(0.235,0.235,0.11,64,2),m.inset,1.34,"recess"));
  const geo=new THREE.BoxGeometry(0.145,0.23,0.145,3,4,3);
  for(let i=0;i<8;i+=1){const a=(i/8)*Math.PI*2;const b=mesh(geo,m.body,1.47,"battlement");b.position.set(Math.cos(a)*0.278,1.47,Math.sin(a)*0.278);b.rotation.y=-a+Math.PI/4;g.add(b);} 
  return g;
}

function bishopMitreShape(side=1){
  const s=new THREE.Shape();
  s.moveTo(0,-0.34);
  s.bezierCurveTo(0.10*side,-0.28,0.17*side,-0.14,0.18*side,0.02);
  s.bezierCurveTo(0.19*side,0.20,0.12*side,0.34,0.03*side,0.43);
  s.bezierCurveTo(-0.02*side,0.34,-0.055*side,0.22,-0.06*side,0.09);
  s.bezierCurveTo(-0.07*side,-0.10,-0.055*side,-0.25,0,-0.34);
  return s;
}

function createBishop(m){
  const g=new THREE.Group(); addBase(g,m,0.89);
  g.add(lathe([[0.285,0],[0.26,0.055],[0.225,0.13],[0.19,0.25],[0.158,0.42],[0.145,0.58],[0.16,0.69],[0.195,0.79],[0.23,0.85],[0.205,0.91]],m.body,0.29,"stem"));
  addCollar(g,m,0.215,1.12);
  const opts={depth:0.20,bevelEnabled:true,bevelSegments:12,steps:2,bevelSize:0.024,bevelThickness:0.024,curveSegments:48};
  const left=mesh(new THREE.ExtrudeGeometry(bishopMitreShape(-1),opts),m.body,1.48,"bishop-mitre");
  const right=mesh(new THREE.ExtrudeGeometry(bishopMitreShape(1),opts),m.body,1.48,"bishop-mitre");
  left.position.z=-0.10; right.position.z=-0.10; left.rotation.z=-0.05; right.rotation.z=0.05; g.add(left,right);
  const groove=mesh(new THREE.BoxGeometry(0.028,0.46,0.24,2,16,2),m.inset,1.55,"bishop-notch"); groove.rotation.z=0.61; g.add(groove);
  const tip=mesh(new THREE.SphereGeometry(0.075,36,24),m.trim,1.83,"head"); tip.scale.y=1.18; g.add(tip);
  return g;
}

function createQueen(m){
  const g=new THREE.Group(); addBase(g,m,0.94);
  g.add(lathe([[0.30,0],[0.275,0.055],[0.24,0.14],[0.20,0.29],[0.165,0.50],[0.15,0.68],[0.17,0.80],[0.21,0.90],[0.255,0.97],[0.235,1.02]],m.body,0.29,"stem"));
  addCollar(g,m,0.25,1.30);
  g.add(mesh(new THREE.CylinderGeometry(0.25,0.27,0.11,64,2),m.body,1.39,"crown"));
  const pointGeo=new THREE.ConeGeometry(0.050,0.26,24,3); const orbGeo=new THREE.SphereGeometry(0.038,24,16);
  for(let i=0;i<10;i+=1){const a=(i/10)*Math.PI*2;const p=mesh(pointGeo,m.body,1.58,"crown");p.position.set(Math.cos(a)*0.22,1.58,Math.sin(a)*0.22);p.rotation.z=-Math.cos(a)*0.10;p.rotation.x=Math.sin(a)*0.10;g.add(p);const o=mesh(orbGeo,m.trim,1.72,"crown-orb");o.position.set(Math.cos(a)*0.22,1.72,Math.sin(a)*0.22);g.add(o);} 
  return g;
}

function createKing(m){
  const g=new THREE.Group(); addBase(g,m,0.96);
  g.add(lathe([[0.305,0],[0.28,0.055],[0.245,0.14],[0.205,0.30],[0.168,0.53],[0.155,0.72],[0.18,0.84],[0.22,0.93],[0.27,1.00],[0.25,1.07]],m.body,0.29,"stem"));
  addCollar(g,m,0.265,1.36);
  g.add(mesh(new THREE.CylinderGeometry(0.225,0.265,0.18,64,3),m.body,1.49,"crown"));
  g.add(mesh(new THREE.SphereGeometry(0.11,40,28),m.trim,1.67,"head"));
  g.add(mesh(new THREE.BoxGeometry(0.070,0.40,0.070,3,10,3),m.body,1.96,"cross"));
  g.add(mesh(new THREE.BoxGeometry(0.33,0.070,0.070,10,3,3),m.body,1.99,"cross"));
  return g;
}

function createKnight(m){
  const g=new THREE.Group(); addBase(g,m,0.92);
  g.add(lathe([[0.29,0],[0.265,0.055],[0.23,0.14],[0.205,0.27],[0.205,0.40],[0.23,0.50],[0.27,0.56]],m.body,0.29,"pedestal"));
  addCollar(g,m,0.245,0.84);

  // Sculpted S-neck: three overlapping smooth volumes plus a curved tube spine.
  const neckCurve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.12,0.90,0),new THREE.Vector3(-0.18,1.08,0),new THREE.Vector3(-0.15,1.28,0),
    new THREE.Vector3(-0.04,1.45,0),new THREE.Vector3(0.09,1.56,0),new THREE.Vector3(0.17,1.62,0),
  ]);
  const neck=mesh(new THREE.TubeGeometry(neckCurve,72,0.15,20,false),m.body,0,"knight-body"); g.add(neck);
  const chest=mesh(new THREE.SphereGeometry(0.26,56,36),m.body,1.04,"knight-body"); chest.scale.set(0.86,1.18,0.78); chest.position.x=-0.10; g.add(chest);
  const shoulder=mesh(new THREE.SphereGeometry(0.22,52,34),m.body,1.27,"knight-body"); shoulder.scale.set(0.82,1.15,0.78); shoulder.position.x=-0.12; g.add(shoulder);

  // Volumetric horse head and jaw.
  const skull=mesh(new THREE.SphereGeometry(0.215,64,40),m.body,1.61,"knight-head"); skull.scale.set(1.16,0.88,0.86); skull.position.x=0.15; skull.rotation.z=-0.10; g.add(skull);
  const brow=mesh(new THREE.SphereGeometry(0.17,52,34),m.body,1.70,"knight-head"); brow.scale.set(1.05,0.72,0.80); brow.position.x=0.22; g.add(brow);
  const muzzle=mesh(new THREE.SphereGeometry(0.16,56,36),m.body,1.52,"knight-muzzle"); muzzle.scale.set(1.75,0.63,0.72); muzzle.position.x=0.39; muzzle.rotation.z=-0.08; g.add(muzzle);
  const nose=mesh(new THREE.SphereGeometry(0.11,44,28),m.body,1.49,"knight-muzzle"); nose.scale.set(1.25,0.65,0.82); nose.position.x=0.57; g.add(nose);
  const jaw=mesh(new THREE.SphereGeometry(0.13,48,30),m.body,1.43,"jaw"); jaw.scale.set(1.45,0.56,0.74); jaw.position.x=0.39; g.add(jaw);

  for(const side of [-1,1]){
    const earShape=new THREE.ConeGeometry(0.062,0.26,24,4);
    const ear=mesh(earShape,m.body,1.88,"ear"); ear.position.set(0.07,1.88,side*0.115); ear.rotation.z=-0.16; ear.rotation.x=side*0.10; g.add(ear);
    const eye=mesh(new THREE.SphereGeometry(0.028,24,16),m.eye,1.68,"eye"); eye.position.set(0.30,1.68,side*0.17); g.add(eye);
  }

  // Multi-faceted mane: dense overlapping fins give visible geometric complexity without huge textures.
  const maneGeo=new THREE.ConeGeometry(0.055,0.20,20,3);
  for(let i=0;i<11;i+=1){
    const t=i/10; const p=neckCurve.getPoint(t*0.78);
    const fin=mesh(maneGeo,m.trim,p.y+0.02,"mane-fin");
    fin.position.set(p.x-0.17,p.y+0.02,0); fin.rotation.z=-Math.PI/2-0.10+t*0.20; fin.scale.set(1,0.75+0.35*(1-t),1); g.add(fin);
  }
  return g;
}

const BUILDERS={pawn:createPawn,rook:createRook,knight:createKnight,bishop:createBishop,queen:createQueen,king:createKing};

export function countObjectTriangles(object,{includeDecorative=false}={}){
  let triangles=0; object?.traverse?.((child)=>{if(!child.isMesh)return;if(!includeDecorative&&child.userData?.decorative)return;const geometry=child.geometry;if(geometry?.index?.count)triangles+=Math.floor(geometry.index.count/3);else triangles+=Math.floor((geometry?.attributes?.position?.count??0)/3);}); return triangles;
}

export function countUniquePieceResources(object){
  const geometries=new Set();const materials=new Set();let meshes=0;object?.traverse?.((child)=>{if(!child.isMesh)return;meshes+=1;if(child.geometry)geometries.add(child.geometry.uuid);const list=Array.isArray(child.material)?child.material:[child.material];for(const mat of list)if(mat)materials.add(mat.uuid);});return{meshes,uniqueGeometries:geometries.size,uniqueMaterials:materials.size};
}

function cloneTemplate(template){const clone=template.clone(true);clone.traverse((child)=>{if(child.userData)child.userData={...child.userData};});return clone;}

export class OpenSourceStauntonPieceSet{
  constructor(){this.templates=new Map();this.stats=new Map();}
  templateKey(type,color){return `${type}:${color}`;}
  buildTemplate(type,color){
    const builder=BUILDERS[type]??BUILDERS.pawn;const m=materialsFor(color);const group=builder(m);group.name=`${color}-${type}-open-source-staunton-v7-template`;fitInsideCell(group,type);addEdges(group,m);fitInsideCell(group,type);group.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(group);const size=box.getSize(new THREE.Vector3());const triangles=countObjectTriangles(group);const envelope=SAFE_FIT[type]??SAFE_FIT.pawn;const resources=countUniquePieceResources(group);
    group.userData.forgeVisualSource=SOURCE_ID;group.userData.forgePremiumRevision=OPEN_SOURCE_REVISION;group.userData.openSourceStauntonRevision=OPEN_SOURCE_REVISION;group.userData.openSourceStauntonType=type;group.userData.openSourceStauntonColor=color;group.userData.openSourceStauntonTriangles=triangles;
    this.stats.set(this.templateKey(type,color),{type,color,triangles,bounds:{x:size.x,y:size.y,z:size.z},resources,finite:[size.x,size.y,size.z].every((v)=>Number.isFinite(v)&&v>0),fitsLevel:size.y<=envelope.maxHeight+1e-6,fitsCell:size.x<=envelope.maxFootprint+1e-6&&size.z<=envelope.maxFootprint+1e-6,maxHeight:envelope.maxHeight,maxFootprint:envelope.maxFootprint,levelSpacing:LEVEL_SPACING,cellRenderSize:CELL_RENDER_SIZE,style:"Staunton-inspired open-source sculpted 3D",revision:OPEN_SOURCE_REVISION});return group;
  }
  getTemplate(type,color){const key=this.templateKey(type,color);if(!this.templates.has(key))this.templates.set(key,this.buildTemplate(type,color));return this.templates.get(key);}
  create(type,color){const template=this.getTemplate(type,color);const result=cloneTemplate(template);result.name=`${color}-${type}-open-source-staunton-v7`;result.userData={...template.userData};return result;}
  inspect(type,color="white"){this.getTemplate(type,color);return this.stats.get(this.templateKey(type,color));}
  inspectAll(){return Object.keys(BUILDERS).map((type)=>this.inspect(type,"white"));}
}

export class ForgeMcpPremiumPieceSet extends OpenSourceStauntonPieceSet {}
export const OPEN_SOURCE_STAUNTON_REVISION=OPEN_SOURCE_REVISION;
export const OPEN_SOURCE_STAUNTON_SAFE_FIT=SAFE_FIT;
export const FORGEMCP_PREMIUM_REVISION=OPEN_SOURCE_REVISION;
export const FORGEMCP_PREMIUM_SAFE_FIT=SAFE_FIT;
