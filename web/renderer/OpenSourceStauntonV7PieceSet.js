import * as THREE from "three";
import { CELL_RENDER_SIZE, LEVEL_SPACING } from "./coordinates.js";

// Open-source Staunton v7.1: modeled as efficient ring/quad cages and triangulated only for WebGL runtime.
const LATHE_SEGMENTS = 64;
const TORUS_RADIAL = 10;
const TORUS_TUBULAR = 48;
const OPEN_SOURCE_REVISION = "2026-08-31-opensource-staunton-v7.1-quad-cage";
const SOURCE_ID = "open-source-staunton-v7.1-quad-cage";

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
    body: material(0xf2eee5, { metalness: 0.05, roughness: 0.34, clearcoat: 0.52 }),
    trim: material(0xc9ad6b, { metalness: 0.48, roughness: 0.27 }),
    inset: material(0x56616c, { metalness: 0.20, roughness: 0.46 }),
    eye: material(0x1d3344, { metalness: 0.18, roughness: 0.30 }),
    edge: 0x566675,
  } : {
    body: material(0x11151a, { metalness: 0.22, roughness: 0.29, clearcoat: 0.60 }),
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

// Build an indexed loft from elliptical rings. Authoring topology is a quad cage;
// each quad becomes two triangles only at BufferGeometry runtime, which is what WebGL requires.
function loftGeometry(sections, radialSegments = 28, capStart = true, capEnd = true) {
  const positions = [];
  const indices = [];
  for (let s = 0; s < sections.length; s += 1) {
    const section = sections[s];
    const twist = section.twist ?? 0;
    for (let i = 0; i < radialSegments; i += 1) {
      const a = (i / radialSegments) * Math.PI * 2 + twist;
      const wobble = section.shape ? section.shape(a) : 1;
      positions.push(
        (section.x ?? 0) + Math.cos(a) * section.rx * wobble,
        section.y,
        (section.z ?? 0) + Math.sin(a) * section.rz * wobble,
      );
    }
  }
  for (let s = 0; s < sections.length - 1; s += 1) {
    const a0 = s * radialSegments;
    const b0 = (s + 1) * radialSegments;
    for (let i = 0; i < radialSegments; i += 1) {
      const n = (i + 1) % radialSegments;
      const a = a0 + i, b = a0 + n, c = b0 + n, d = b0 + i;
      indices.push(a, b, d, b, c, d);
    }
  }
  const addCap = (sectionIndex, reverse) => {
    const section = sections[sectionIndex];
    const centerIndex = positions.length / 3;
    positions.push(section.x ?? 0, section.y, section.z ?? 0);
    const start = sectionIndex * radialSegments;
    for (let i = 0; i < radialSegments; i += 1) {
      const n = (i + 1) % radialSegments;
      if (reverse) indices.push(centerIndex, start + n, start + i);
      else indices.push(centerIndex, start + i, start + n);
    }
  };
  if (capStart) addCap(0, true);
  if (capEnd) addCap(sections.length - 1, false);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
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
  addRing(group, m.trim, radius, y, 0.014, "collar");
  group.add(mesh(new THREE.CylinderGeometry(radius*0.98, radius*0.92, 0.055, 40, 1), m.body, y + 0.01, "collar-body"));
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
    edgeMaterial = new THREE.LineBasicMaterial({ color: m.edge, transparent: true, opacity: 0.28, depthWrite: false });
    edgeMaterialCache.set(key, edgeMaterial);
  }
  const important = new Set(["head","battlement","bishop-mitre","bishop-notch","knight-head","knight-muzzle","ear","mane-fin","crown","cross"]);
  const targets = [];
  group.traverse((child)=>{ if (child.isMesh && important.has(child.userData?.openSourceStauntonRole)) targets.push(child); });
  for (const child of targets) {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(child.geometry, 38), edgeMaterial);
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
  const head=mesh(new THREE.SphereGeometry(0.22,40,24),m.body,1.22,"head"); head.scale.y=1.03; g.add(head);
  return g;
}

function createRook(m) {
  const g = new THREE.Group(); addBase(g,m,0.93);
  g.add(lathe([[0.29,0],[0.27,0.06],[0.245,0.14],[0.22,0.27],[0.205,0.45],[0.205,0.63],[0.225,0.75],[0.255,0.83],[0.30,0.89]],m.body,0.29,"tower"));
  addCollar(g,m,0.29,1.10);
  g.add(mesh(new THREE.CylinderGeometry(0.34,0.315,0.20,48,2),m.body,1.25,"crown"));
  g.add(mesh(new THREE.CylinderGeometry(0.235,0.235,0.11,48,1),m.inset,1.34,"recess"));
  const geo=new THREE.BoxGeometry(0.145,0.23,0.145,2,3,2);
  for(let i=0;i<8;i+=1){const a=(i/8)*Math.PI*2;const b=mesh(geo,m.body,1.47,"battlement");b.position.set(Math.cos(a)*0.278,1.47,Math.sin(a)*0.278);b.rotation.y=-a+Math.PI/4;g.add(b);} 
  return g;
}

function createBishop(m){
  const g=new THREE.Group(); addBase(g,m,0.89);
  g.add(lathe([[0.285,0],[0.26,0.055],[0.225,0.13],[0.19,0.25],[0.158,0.42],[0.145,0.58],[0.16,0.69],[0.195,0.79],[0.23,0.85],[0.205,0.91]],m.body,0.29,"stem"));
  addCollar(g,m,0.215,1.12);

  // Two smooth, efficient mitre shells shaped from quad-cage rings rather than dense bevel extrusion.
  const leftSections = [
    {x:-0.055,y:1.30,z:0,rx:0.16,rz:0.13},{x:-0.075,y:1.39,z:0,rx:0.17,rz:0.14},
    {x:-0.075,y:1.49,z:0,rx:0.16,rz:0.13},{x:-0.065,y:1.59,z:0,rx:0.135,rz:0.115},
    {x:-0.045,y:1.69,z:0,rx:0.10,rz:0.085},{x:-0.020,y:1.78,z:0,rx:0.060,rz:0.055},
    {x:0.000,y:1.84,z:0,rx:0.020,rz:0.020},
  ];
  const rightSections = leftSections.map((s)=>({...s,x:-s.x,twist:0.015}));
  g.add(mesh(loftGeometry(leftSections,28),m.body,0,"bishop-mitre"));
  g.add(mesh(loftGeometry(rightSections,28),m.body,0,"bishop-mitre"));
  const notch=mesh(new THREE.BoxGeometry(0.032,0.44,0.23,1,8,1),m.inset,1.57,"bishop-notch"); notch.rotation.z=0.61; g.add(notch);
  const tip=mesh(new THREE.SphereGeometry(0.052,24,14),m.trim,1.83,"head"); tip.scale.y=1.18; g.add(tip);
  return g;
}

function createQueen(m){
  const g=new THREE.Group(); addBase(g,m,0.94);
  g.add(lathe([[0.30,0],[0.275,0.055],[0.24,0.14],[0.20,0.29],[0.165,0.50],[0.15,0.68],[0.17,0.80],[0.21,0.90],[0.255,0.97],[0.235,1.02]],m.body,0.29,"stem"));
  addCollar(g,m,0.25,1.30);
  g.add(mesh(new THREE.CylinderGeometry(0.25,0.27,0.11,48,1),m.body,1.39,"crown"));
  const pointGeo=new THREE.ConeGeometry(0.050,0.26,16,2); const orbGeo=new THREE.SphereGeometry(0.038,16,10);
  for(let i=0;i<10;i+=1){const a=(i/10)*Math.PI*2;const p=mesh(pointGeo,m.body,1.58,"crown");p.position.set(Math.cos(a)*0.22,1.58,Math.sin(a)*0.22);p.rotation.z=-Math.cos(a)*0.10;p.rotation.x=Math.sin(a)*0.10;g.add(p);const o=mesh(orbGeo,m.trim,1.72,"crown-orb");o.position.set(Math.cos(a)*0.22,1.72,Math.sin(a)*0.22);g.add(o);} 
  return g;
}

function createKing(m){
  const g=new THREE.Group(); addBase(g,m,0.96);
  g.add(lathe([[0.305,0],[0.28,0.055],[0.245,0.14],[0.205,0.30],[0.168,0.53],[0.155,0.72],[0.18,0.84],[0.22,0.93],[0.27,1.00],[0.25,1.07]],m.body,0.29,"stem"));
  addCollar(g,m,0.265,1.36);
  g.add(mesh(new THREE.CylinderGeometry(0.225,0.265,0.18,48,2),m.body,1.49,"crown"));
  g.add(mesh(new THREE.SphereGeometry(0.11,28,18),m.trim,1.67,"head"));
  g.add(mesh(new THREE.BoxGeometry(0.070,0.40,0.070,2,6,2),m.body,1.96,"cross"));
  g.add(mesh(new THREE.BoxGeometry(0.33,0.070,0.070,6,2,2),m.body,1.99,"cross"));
  return g;
}

function createKnight(m){
  const g=new THREE.Group(); addBase(g,m,0.92);
  g.add(lathe([[0.29,0],[0.265,0.055],[0.23,0.14],[0.205,0.27],[0.205,0.40],[0.23,0.50],[0.27,0.56]],m.body,0.29,"pedestal"));
  addCollar(g,m,0.245,0.84);

  // One coherent quad-cage neck instead of overlapping spheres. Ring offsets sculpt an S-curve.
  const neckSections=[
    {x:-0.12,y:0.88,z:0,rx:0.205,rz:0.17},{x:-0.16,y:0.98,z:0,rx:0.205,rz:0.17},
    {x:-0.18,y:1.08,z:0,rx:0.195,rz:0.165},{x:-0.17,y:1.19,z:0,rx:0.185,rz:0.16},
    {x:-0.14,y:1.30,z:0,rx:0.175,rz:0.155},{x:-0.09,y:1.40,z:0,rx:0.17,rz:0.15},
    {x:-0.02,y:1.49,z:0,rx:0.165,rz:0.145},{x:0.06,y:1.56,z:0,rx:0.16,rz:0.14},
    {x:0.13,y:1.61,z:0,rx:0.155,rz:0.135},
  ];
  g.add(mesh(loftGeometry(neckSections,32),m.body,0,"knight-body"));

  // Skull/cheek/brow are sculpted as a single efficient loft with changing ellipse proportions.
  const headSections=[
    {x:0.07,y:1.52,z:0,rx:0.16,rz:0.15},{x:0.11,y:1.58,z:0,rx:0.205,rz:0.18},
    {x:0.16,y:1.64,z:0,rx:0.215,rz:0.185},{x:0.21,y:1.69,z:0,rx:0.205,rz:0.175},
    {x:0.26,y:1.71,z:0,rx:0.18,rz:0.16},{x:0.30,y:1.68,z:0,rx:0.145,rz:0.14},
  ];
  g.add(mesh(loftGeometry(headSections,32),m.body,0,"knight-head"));

  // Muzzle transitions from cheek to nostril using a tapered quad cage.
  const muzzleSections=[
    {x:0.26,y:1.60,z:0,rx:0.145,rz:0.135},{x:0.35,y:1.58,z:0,rx:0.135,rz:0.125},
    {x:0.44,y:1.55,z:0,rx:0.12,rz:0.115},{x:0.52,y:1.52,z:0,rx:0.105,rz:0.105},
    {x:0.58,y:1.50,z:0,rx:0.080,rz:0.09},
  ];
  g.add(mesh(loftGeometry(muzzleSections,28),m.body,0,"knight-muzzle"));

  const jawSections=[
    {x:0.22,y:1.50,z:0,rx:0.14,rz:0.12},{x:0.32,y:1.46,z:0,rx:0.135,rz:0.115},
    {x:0.42,y:1.44,z:0,rx:0.115,rz:0.105},{x:0.50,y:1.45,z:0,rx:0.075,rz:0.085},
  ];
  g.add(mesh(loftGeometry(jawSections,24),m.body,0,"jaw"));

  for(const side of [-1,1]){
    const ear=mesh(new THREE.ConeGeometry(0.058,0.25,16,2),m.body,1.88,"ear"); ear.position.set(0.07,1.88,side*0.115); ear.rotation.z=-0.16; ear.rotation.x=side*0.10; g.add(ear);
    const eye=mesh(new THREE.SphereGeometry(0.028,16,10),m.eye,1.68,"eye"); eye.position.set(0.30,1.68,side*0.17); g.add(eye);
  }

  const maneGeo=new THREE.ConeGeometry(0.052,0.20,14,2);
  const manePath=[[-0.25,1.09],[-0.25,1.17],[-0.24,1.25],[-0.22,1.33],[-0.19,1.41],[-0.15,1.48],[-0.10,1.54],[-0.04,1.59],[0.02,1.63],[0.08,1.66],[0.13,1.68]];
  for(let i=0;i<manePath.length;i+=1){const [x,y]=manePath[i];const fin=mesh(maneGeo,m.trim,y,"mane-fin");fin.position.set(x,y,0);fin.rotation.z=-Math.PI/2-0.18+i*0.026;fin.scale.set(1,1.1-i*0.025,1);g.add(fin);} 
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
    this.stats.set(this.templateKey(type,color),{type,color,triangles,bounds:{x:size.x,y:size.y,z:size.z},resources,finite:[size.x,size.y,size.z].every((v)=>Number.isFinite(v)&&v>0),fitsLevel:size.y<=envelope.maxHeight+1e-6,fitsCell:size.x<=envelope.maxFootprint+1e-6&&size.z<=envelope.maxFootprint+1e-6,maxHeight:envelope.maxHeight,maxFootprint:envelope.maxFootprint,levelSpacing:LEVEL_SPACING,cellRenderSize:CELL_RENDER_SIZE,style:"Staunton-inspired open-source quad-cage sculpted 3D",revision:OPEN_SOURCE_REVISION});return group;
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
