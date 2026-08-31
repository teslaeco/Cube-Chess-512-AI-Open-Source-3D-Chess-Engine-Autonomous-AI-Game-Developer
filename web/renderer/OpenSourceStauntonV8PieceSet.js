import * as THREE from "three";
import { CELL_RENDER_SIZE, LEVEL_SPACING } from "./coordinates.js";

// Public/open-source renderer. This is the normal game view for every player.
// No paid/premium visual tier is required. Geometry is procedural and browser-native.
const REVISION = "2026-08-31-opensource-staunton-v8-sculpted-all";
const SOURCE_ID = "open-source-staunton-v8-sculpted-all";
const LATHE_SEGMENTS = 72;

// Very conservative envelope for an 8-level 8x8x8 board. The king uses only 38% of
// vertical level spacing, leaving >=62% clear air before the level above.
const SAFE_FIT = Object.freeze({
  pawn: Object.freeze({ maxHeight: LEVEL_SPACING * 0.22, maxFootprint: CELL_RENDER_SIZE * 0.28 }),
  rook: Object.freeze({ maxHeight: LEVEL_SPACING * 0.24, maxFootprint: CELL_RENDER_SIZE * 0.30 }),
  knight: Object.freeze({ maxHeight: LEVEL_SPACING * 0.27, maxFootprint: CELL_RENDER_SIZE * 0.31 }),
  bishop: Object.freeze({ maxHeight: LEVEL_SPACING * 0.30, maxFootprint: CELL_RENDER_SIZE * 0.30 }),
  queen: Object.freeze({ maxHeight: LEVEL_SPACING * 0.34, maxFootprint: CELL_RENDER_SIZE * 0.32 }),
  king: Object.freeze({ maxHeight: LEVEL_SPACING * 0.38, maxFootprint: CELL_RENDER_SIZE * 0.33 }),
});

const materialCache = new Map();
const edgeCache = new Map();

function physical(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: options.metalness ?? 0.12,
    roughness: options.roughness ?? 0.32,
    clearcoat: options.clearcoat ?? 0.56,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.22,
    reflectivity: options.reflectivity ?? 0.55,
  });
}

function materialsFor(color) {
  if (materialCache.has(color)) return materialCache.get(color);
  const white = color === "white";
  const set = white ? {
    body: physical(0xf0ece4, { metalness: 0.04, roughness: 0.35, clearcoat: 0.48 }),
    trim: physical(0xc9ad72, { metalness: 0.44, roughness: 0.26 }),
    inset: physical(0x606b76, { metalness: 0.18, roughness: 0.42 }),
    eye: physical(0x19384e, { metalness: 0.16, roughness: 0.28 }),
    edge: 0x566675,
  } : {
    body: physical(0x12161b, { metalness: 0.20, roughness: 0.29, clearcoat: 0.60 }),
    trim: physical(0x9a643c, { metalness: 0.38, roughness: 0.28 }),
    inset: physical(0x050607, { metalness: 0.10, roughness: 0.48 }),
    eye: physical(0xc79b63, { metalness: 0.28, roughness: 0.25 }),
    edge: 0x9ca7b0,
  };
  materialCache.set(color, set);
  return set;
}

function mark(item, role) {
  item.castShadow = true;
  item.receiveShadow = true;
  item.userData.openSourceStauntonRole = role;
  item.userData.forgePremiumRole = role; // compatibility marker for existing WebMCP QA only
  return item;
}
function mesh(geometry, material, y = 0, role = "surface") {
  const out = mark(new THREE.Mesh(geometry, material), role);
  out.position.y = y;
  return out;
}
function lathe(profile, material, y = 0, role = "surface") {
  return mesh(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), LATHE_SEGMENTS), material, y, role);
}
function ring(group, material, radius, y, tube = 0.014, role = "ring") {
  const out = mesh(new THREE.TorusGeometry(radius, tube, 12, 56), material, y, role);
  out.rotation.x = Math.PI / 2;
  group.add(out);
}

// Indexed loft authored as rings/quads and triangulated only at runtime for WebGL.
// This gives smooth sculpted surfaces without wasting triangles on overlapping spheres.
function loftGeometry(sections, radialSegments = 34, capStart = true, capEnd = true) {
  const positions = [];
  const indices = [];
  for (const s of sections) {
    for (let i = 0; i < radialSegments; i += 1) {
      const a = (i / radialSegments) * Math.PI * 2 + (s.twist ?? 0);
      const shape = s.shape ? s.shape(a) : 1;
      positions.push((s.x ?? 0) + Math.cos(a) * s.rx * shape, s.y, (s.z ?? 0) + Math.sin(a) * s.rz * shape);
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
  const cap = (sectionIndex, reverse) => {
    const s = sections[sectionIndex];
    const center = positions.length / 3;
    positions.push(s.x ?? 0, s.y, s.z ?? 0);
    const start = sectionIndex * radialSegments;
    for (let i = 0; i < radialSegments; i += 1) {
      const n = (i + 1) % radialSegments;
      indices.push(center, reverse ? start + n : start + i, reverse ? start + i : start + n);
    }
  };
  if (capStart) cap(0, true);
  if (capEnd) cap(sections.length - 1, false);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addBase(group, m, scale = 1) {
  group.add(lathe([
    [0,0],[0.28*scale,0],[0.38*scale,0.012],[0.46*scale,0.036],[0.50*scale,0.065],
    [0.505*scale,0.090],[0.49*scale,0.116],[0.455*scale,0.142],[0.415*scale,0.173],
    [0.388*scale,0.205],[0.37*scale,0.242],[0.355*scale,0.278],[0.34*scale,0.302],
  ], m.body, 0, "base"));
  ring(group, m.trim, 0.455*scale, 0.105, 0.013, "base-trim");
  ring(group, m.body, 0.365*scale, 0.275, 0.010, "base-lip");
}
function addCollar(group, m, radius, y) {
  ring(group, m.trim, radius, y, 0.013, "collar");
  group.add(mesh(new THREE.CylinderGeometry(radius*0.98, radius*0.91, 0.052, 48, 1), m.body, y + 0.008, "collar-body"));
}

function fit(group, type) {
  const e = SAFE_FIT[type];
  group.position.set(0,0,0); group.scale.setScalar(1); group.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  if (![size.x,size.y,size.z].every((v)=>Number.isFinite(v)&&v>0)) throw new Error(`Invalid ${type} bounds`);
  const s = Math.min(e.maxHeight/size.y, e.maxFootprint/size.x, e.maxFootprint/size.z);
  group.scale.setScalar(s); group.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.x -= center.x; group.position.z -= center.z; group.position.y -= box.min.y;
  group.updateMatrixWorld(true);
  return group;
}

function addEdges(group, m) {
  const key = String(m.edge);
  let mat = edgeCache.get(key);
  if (!mat) { mat = new THREE.LineBasicMaterial({ color:m.edge, transparent:true, opacity:0.24, depthWrite:false }); edgeCache.set(key, mat); }
  const roles = new Set(["head","battlement","bishop-mitre","bishop-notch","knight-head","knight-muzzle","ear","mane","crown","cross"]);
  const targets=[]; group.traverse((c)=>{ if(c.isMesh && roles.has(c.userData?.openSourceStauntonRole)) targets.push(c); });
  for (const c of targets) {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(c.geometry, 42), mat);
    e.position.copy(c.position); e.rotation.copy(c.rotation); e.scale.copy(c.scale).multiplyScalar(1.001);
    e.userData.decorative = true; c.parent.add(e);
  }
}

function createPawn(m) {
  const g=new THREE.Group(); addBase(g,m,0.82);
  g.add(lathe([[0.27,0],[0.245,0.05],[0.215,0.12],[0.185,0.24],[0.163,0.38],[0.155,0.50],[0.17,0.60],[0.205,0.68],[0.225,0.735]],m.body,0.30,"stem"));
  addCollar(g,m,0.205,0.99);
  g.add(mesh(new THREE.SphereGeometry(0.205,48,28),m.body,1.205,"head"));
  return g;
}

function createRook(m) {
  const g=new THREE.Group(); addBase(g,m,0.88);
  g.add(lathe([[0.28,0],[0.255,0.05],[0.225,0.13],[0.205,0.25],[0.192,0.42],[0.19,0.59],[0.205,0.70],[0.235,0.79],[0.285,0.86]],m.body,0.30,"tower"));
  addCollar(g,m,0.275,1.08);
  g.add(mesh(new THREE.CylinderGeometry(0.32,0.29,0.19,56,2),m.body,1.23,"crown"));
  g.add(mesh(new THREE.CylinderGeometry(0.225,0.225,0.09,48,1),m.inset,1.31,"recess"));
  const battlementGeo=new THREE.BoxGeometry(0.13,0.20,0.13,2,3,2);
  for(let i=0;i<8;i+=1){const a=i*Math.PI/4;const b=mesh(battlementGeo,m.body,1.43,"battlement");b.position.set(Math.cos(a)*0.266,1.43,Math.sin(a)*0.266);b.rotation.y=-a+Math.PI/4;g.add(b);} 
  return g;
}

function createBishop(m) {
  const g=new THREE.Group(); addBase(g,m,0.86);
  g.add(lathe([[0.275,0],[0.25,0.05],[0.218,0.13],[0.185,0.25],[0.157,0.40],[0.145,0.55],[0.155,0.66],[0.185,0.76],[0.22,0.84],[0.20,0.90]],m.body,0.30,"stem"));
  addCollar(g,m,0.205,1.10);
  const left=[
    {x:-0.02,y:1.25,rx:0.13,rz:0.115},{x:-0.05,y:1.34,rx:0.155,rz:0.13},{x:-0.06,y:1.44,rx:0.16,rz:0.135},
    {x:-0.055,y:1.54,rx:0.145,rz:0.125},{x:-0.045,y:1.64,rx:0.115,rz:0.10},{x:-0.03,y:1.73,rx:0.08,rz:0.072},{x:-0.015,y:1.80,rx:0.045,rz:0.042},{x:0,y:1.84,rx:0.015,rz:0.015}
  ];
  const right=left.map((s)=>({...s,x:-s.x,twist:0.01}));
  g.add(mesh(loftGeometry(left,34),m.body,0,"bishop-mitre"));
  g.add(mesh(loftGeometry(right,34),m.body,0,"bishop-mitre"));
  const notch=mesh(new THREE.BoxGeometry(0.027,0.43,0.21,1,7,1),m.inset,1.58,"bishop-notch"); notch.rotation.z=0.61; g.add(notch);
  return g;
}

function createQueen(m) {
  const g=new THREE.Group(); addBase(g,m,0.90);
  g.add(lathe([[0.285,0],[0.26,0.05],[0.23,0.13],[0.195,0.27],[0.165,0.46],[0.148,0.64],[0.16,0.76],[0.195,0.87],[0.235,0.95],[0.22,1.00]],m.body,0.30,"stem"));
  addCollar(g,m,0.235,1.28);
  g.add(mesh(new THREE.CylinderGeometry(0.235,0.255,0.10,56,1),m.body,1.37,"crown"));
  const petal=loftGeometry([{y:1.41,rx:0.055,rz:0.040},{y:1.52,rx:0.046,rz:0.034},{y:1.62,rx:0.025,rz:0.020},{y:1.68,rx:0.010,rz:0.010}],18);
  const orb=new THREE.SphereGeometry(0.034,16,10);
  for(let i=0;i<10;i+=1){const a=i*Math.PI/5;const p=mesh(petal,m.body,0,"crown");p.position.set(Math.cos(a)*0.215,0,Math.sin(a)*0.215);p.rotation.y=-a;g.add(p);const o=mesh(orb,m.trim,1.69,"crown-orb");o.position.set(Math.cos(a)*0.215,1.69,Math.sin(a)*0.215);g.add(o);} 
  return g;
}

function createKing(m) {
  const g=new THREE.Group(); addBase(g,m,0.92);
  g.add(lathe([[0.29,0],[0.265,0.05],[0.235,0.13],[0.20,0.28],[0.168,0.48],[0.15,0.67],[0.165,0.79],[0.20,0.89],[0.245,0.98],[0.23,1.04]],m.body,0.30,"stem"));
  addCollar(g,m,0.25,1.34);
  g.add(mesh(new THREE.CylinderGeometry(0.215,0.25,0.17,56,2),m.body,1.47,"crown"));
  g.add(mesh(new THREE.SphereGeometry(0.10,32,20),m.trim,1.64,"head"));
  g.add(mesh(new THREE.BoxGeometry(0.064,0.36,0.064,2,8,2),m.body,1.90,"cross"));
  g.add(mesh(new THREE.BoxGeometry(0.30,0.064,0.064,8,2,2),m.body,1.92,"cross"));
  return g;
}

function createKnight(m) {
  const g=new THREE.Group(); addBase(g,m,0.88);
  g.add(lathe([[0.275,0],[0.25,0.05],[0.22,0.13],[0.195,0.25],[0.195,0.39],[0.215,0.49],[0.255,0.55]],m.body,0.30,"pedestal"));
  addCollar(g,m,0.225,0.82);

  const neckSections=[
    {x:-0.11,y:0.86,rx:0.19,rz:0.17},{x:-0.16,y:0.98,rx:0.20,rz:0.17},{x:-0.18,y:1.10,rx:0.19,rz:0.165},
    {x:-0.17,y:1.22,rx:0.175,rz:0.155},{x:-0.13,y:1.34,rx:0.16,rz:0.145},{x:-0.07,y:1.44,rx:0.15,rz:0.135},
    {x:0.00,y:1.52,rx:0.145,rz:0.13},{x:0.08,y:1.57,rx:0.14,rz:0.125}
  ];
  g.add(mesh(loftGeometry(neckSections,36),m.body,0,"knight-body"));

  const headSections=[
    {x:0.07,y:1.52,rx:0.16,rz:0.14},{x:0.15,y:1.58,rx:0.18,rz:0.145},{x:0.23,y:1.60,rx:0.175,rz:0.14},
    {x:0.31,y:1.57,rx:0.16,rz:0.13},{x:0.39,y:1.52,rx:0.145,rz:0.12},{x:0.47,y:1.48,rx:0.125,rz:0.105},
    {x:0.54,y:1.46,rx:0.095,rz:0.09},{x:0.59,y:1.45,rx:0.06,rz:0.065}
  ];
  g.add(mesh(loftGeometry(headSections,36),m.body,0,"knight-head"));

  g.add(mesh(loftGeometry([
    {x:0.13,y:1.48,rx:0.14,rz:0.13},{x:0.24,y:1.44,rx:0.15,rz:0.125},{x:0.36,y:1.42,rx:0.13,rz:0.11},
    {x:0.47,y:1.42,rx:0.10,rz:0.09},{x:0.55,y:1.43,rx:0.055,rz:0.06}
  ],32),m.body,0,"knight-muzzle"));

  for(const side of [-1,1]){
    const ear=mesh(new THREE.ConeGeometry(0.052,0.22,20,3),m.body,1.78,"ear"); ear.position.set(0.08,1.78,side*0.10); ear.rotation.z=-0.17; ear.rotation.x=side*0.08; g.add(ear);
    const eye=mesh(new THREE.SphereGeometry(0.025,16,10),m.eye,1.59,"eye"); eye.position.set(0.28,1.59,side*0.145); g.add(eye);
  }
  const maneGeo=new THREE.ConeGeometry(0.045,0.16,14,2);
  for(let i=0;i<12;i+=1){const t=i/11;const y=0.96+t*0.62;const x=-0.18+t*0.23;const fin=mesh(maneGeo,m.trim,y,"mane");fin.position.set(x-0.16,y,0);fin.rotation.z=-Math.PI/2+0.12*t;g.add(fin);} 
  return g;
}

const BUILDERS={pawn:createPawn,rook:createRook,knight:createKnight,bishop:createBishop,queen:createQueen,king:createKing};

export function countObjectTriangles(object,{includeDecorative=false}={}){let n=0;object?.traverse?.((c)=>{if(!c.isMesh)return;if(!includeDecorative&&c.userData?.decorative)return;const g=c.geometry;n+=g?.index?.count?Math.floor(g.index.count/3):Math.floor((g?.attributes?.position?.count??0)/3);});return n;}
export function countUniquePieceResources(object){const geometries=new Set(),materials=new Set();let meshes=0;object?.traverse?.((c)=>{if(!c.isMesh)return;meshes+=1;if(c.geometry)geometries.add(c.geometry.uuid);for(const m of Array.isArray(c.material)?c.material:[c.material])if(m)materials.add(m.uuid);});return{meshes,uniqueGeometries:geometries.size,uniqueMaterials:materials.size};}
function cloneTemplate(t){const c=t.clone(true);c.traverse((x)=>{if(x.userData)x.userData={...x.userData};});return c;}

export class OpenSourceStauntonV8PieceSet {
  constructor(){this.templates=new Map();this.stats=new Map();}
  key(type,color){return `${type}:${color}`;}
  buildTemplate(type,color){const builder=BUILDERS[type]??BUILDERS.pawn;const g=builder(materialsFor(color));g.name=`${color}-${type}-${SOURCE_ID}-template`;fit(g,type);addEdges(g,materialsFor(color));fit(g,type);g.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(g),size=box.getSize(new THREE.Vector3()),triangles=countObjectTriangles(g),e=SAFE_FIT[type],resources=countUniquePieceResources(g);g.userData.forgeVisualSource=SOURCE_ID;g.userData.openSourceStauntonRevision=REVISION;g.userData.openSourceStauntonType=type;g.userData.openSourceStauntonColor=color;g.userData.openSourceStauntonTriangles=triangles;this.stats.set(this.key(type,color),{type,color,triangles,bounds:{x:size.x,y:size.y,z:size.z},resources,finite:[size.x,size.y,size.z].every((v)=>Number.isFinite(v)&&v>0),fitsLevel:size.y<=e.maxHeight+1e-6,fitsCell:size.x<=e.maxFootprint+1e-6&&size.z<=e.maxFootprint+1e-6,maxHeight:e.maxHeight,maxFootprint:e.maxFootprint,levelSpacing:LEVEL_SPACING,cellRenderSize:CELL_RENDER_SIZE,style:"Open-source sculpted Staunton v8",revision:REVISION});return g;}
  getTemplate(type,color){const k=this.key(type,color);if(!this.templates.has(k))this.templates.set(k,this.buildTemplate(type,color));return this.templates.get(k);}
  create(type,color){const t=this.getTemplate(type,color),r=cloneTemplate(t);r.name=`${color}-${type}-${SOURCE_ID}`;r.userData={...t.userData};return r;}
  inspect(type,color="white"){this.getTemplate(type,color);return this.stats.get(this.key(type,color));}
  inspectAll(){return Object.keys(BUILDERS).map((type)=>this.inspect(type,"white"));}
}

export class OpenSourceStauntonPieceSet extends OpenSourceStauntonV8PieceSet {}
export class ForgeMcpPremiumPieceSet extends OpenSourceStauntonV8PieceSet {} // internal compatibility only; public game is open-source
export const OPEN_SOURCE_STAUNTON_REVISION=REVISION;
export const OPEN_SOURCE_STAUNTON_SAFE_FIT=SAFE_FIT;
export const FORGEMCP_PREMIUM_REVISION=REVISION;
export const FORGEMCP_PREMIUM_SAFE_FIT=SAFE_FIT;
