import * as THREE from "three";
import { CELL_RENDER_SIZE, LEVEL_SPACING } from "./coordinates.js";
import { pieceCellEnvelope, PIECE_CELL_ENVELOPE } from "./pieceScaleProfile.js";

// Normal, free, open-source renderer for every player.
// Uploaded source models are reference-only; runtime pieces are generated here.
const REVISION = "2026-09-01-open-source-staunton-v10-sculpted";
const SOURCE_ID = "open-source-reference-guided-generated-v10";
const LATHE_SEGMENTS = 96;
const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];

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
    body: physical(0xf2eee6, { metalness: 0.04, roughness: 0.34, clearcoat: 0.52 }),
    trim: physical(0xc8ad72, { metalness: 0.42, roughness: 0.25 }),
    inset: physical(0x596572, { metalness: 0.16, roughness: 0.43 }),
    eye: physical(0x18364b, { metalness: 0.12, roughness: 0.27 }),
    edge: 0x71808c,
  } : {
    body: physical(0x12161b, { metalness: 0.18, roughness: 0.28, clearcoat: 0.62 }),
    trim: physical(0x9c653b, { metalness: 0.38, roughness: 0.27 }),
    inset: physical(0x050607, { metalness: 0.08, roughness: 0.48 }),
    eye: physical(0xc9a06b, { metalness: 0.24, roughness: 0.24 }),
    edge: 0x9ba6af,
  };
  materialCache.set(color, set);
  return set;
}

function mark(item, role) {
  item.castShadow = true;
  item.receiveShadow = true;
  item.userData.openSourceStauntonRole = role;
  item.userData.forgePremiumRole = role; // compatibility marker for existing WebMCP only
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
  const out = mesh(new THREE.TorusGeometry(radius, tube, 16, 72), material, y, role);
  out.rotation.x = Math.PI / 2;
  group.add(out);
}

// Ring/quad cage loft. Authored as quads conceptually, triangulated only for WebGL.
function loftGeometry(sections, radialSegments = 48, capStart = true, capEnd = true) {
  const positions = [];
  const indices = [];
  for (const s of sections) {
    for (let i = 0; i < radialSegments; i += 1) {
      const a = (i / radialSegments) * Math.PI * 2 + (s.twist ?? 0);
      const shape = s.shape ? s.shape(a) : 1;
      const vertical = s.verticalShape ? s.verticalShape(a) : 1;
      positions.push(
        (s.x ?? 0) + Math.cos(a) * s.rx * shape,
        s.y + (s.yWave ?? 0) * Math.sin(a) * vertical,
        (s.z ?? 0) + Math.sin(a) * s.rz * shape,
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

// One continuous solid crest: no cone pencils, no disconnected spikes.
function crestGeometry(points, halfWidth = 0.035) {
  const positions = [];
  const indices = [];
  for (const p of points) {
    positions.push(p.x, p.y, -halfWidth, p.x, p.y, halfWidth);
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  // close bottom and top edge with a second lower contour for actual thickness/silhouette
  const lowerOffset = positions.length / 3;
  for (const p of points) {
    const drop = p.drop ?? 0.075;
    positions.push(p.x + 0.018, p.y - drop, -halfWidth * 0.92, p.x + 0.018, p.y - drop, halfWidth * 0.92);
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    const t0 = i * 2, t1 = t0 + 1, t2 = t0 + 2, t3 = t0 + 3;
    const l0 = lowerOffset + i * 2, l1 = l0 + 1, l2 = l0 + 2, l3 = l0 + 3;
    indices.push(t0, l0, t2, t2, l0, l2); // left flank
    indices.push(t1, t3, l1, t3, l3, l1); // right flank
    indices.push(l0, l1, l2, l1, l3, l2); // underside
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addBase(group, m, scale = 1) {
  group.add(lathe([
    [0,0],[0.28*scale,0],[0.38*scale,0.010],[0.46*scale,0.030],[0.50*scale,0.055],
    [0.515*scale,0.083],[0.505*scale,0.112],[0.478*scale,0.143],[0.438*scale,0.174],
    [0.402*scale,0.208],[0.378*scale,0.244],[0.360*scale,0.278],[0.345*scale,0.305],
  ], m.body, 0, "base"));
  ring(group, m.trim, 0.458*scale, 0.106, 0.012, "base-trim");
  ring(group, m.body, 0.367*scale, 0.276, 0.010, "base-lip");
}
function addCollar(group, m, radius, y) {
  ring(group, m.trim, radius, y, 0.012, "collar");
  group.add(mesh(new THREE.CylinderGeometry(radius*0.98, radius*0.91, 0.052, 64, 2), m.body, y + 0.008, "collar-body"));
}
function addFacetBand(group, m, radius, y, height, sides = 12, role = "facet-band") {
  const geo = new THREE.CylinderGeometry(radius * 0.92, radius, height, sides, 2, false);
  const band = mesh(geo, m.body, y, role);
  band.rotation.y = Math.PI / sides;
  group.add(band);
}

function fit(group, type) {
  const e = pieceCellEnvelope(type);
  group.position.set(0, 0, 0);
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  if (![size.x,size.y,size.z].every((v)=>Number.isFinite(v)&&v>0)) throw new Error(`Invalid ${type} bounds`);
  const s = Math.min(e.maxHeight/size.y, e.maxFootprint/size.x, e.maxFootprint/size.z);
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
  let mat = edgeCache.get(key);
  if (!mat) {
    mat = new THREE.LineBasicMaterial({ color: m.edge, transparent: true, opacity: 0.18, depthWrite: false });
    edgeCache.set(key, mat);
  }
  const roles = new Set(["head","battlement","bishop-mitre-left","bishop-mitre-right","knight-sculpt","knight-ear","mane-ridge","queen-crown","cross"]);
  const targets = [];
  group.traverse((c)=>{ if(c.isMesh && roles.has(c.userData?.openSourceStauntonRole)) targets.push(c); });
  for (const c of targets) {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(c.geometry, 48), mat);
    e.position.copy(c.position); e.rotation.copy(c.rotation); e.scale.copy(c.scale).multiplyScalar(1.001);
    e.userData.decorative = true;
    c.parent.add(e);
  }
}

function createPawn(m) {
  const g = new THREE.Group();
  addBase(g,m,0.80);
  g.add(lathe([[0.26,0],[0.24,0.05],[0.212,0.12],[0.182,0.24],[0.158,0.39],[0.151,0.51],[0.166,0.61],[0.198,0.69],[0.216,0.74]],m.body,0.30,"pawn-stem"));
  addFacetBand(g,m,0.20,0.93,0.075,16,"pawn-facet");
  addCollar(g,m,0.198,1.00);
  g.add(mesh(new THREE.SphereGeometry(0.198,64,40),m.body,1.205,"head"));
  return g;
}

function createRook(m) {
  const g = new THREE.Group();
  addBase(g,m,0.85);
  g.add(lathe([[0.275,0],[0.252,0.06],[0.222,0.15],[0.200,0.28],[0.188,0.45],[0.190,0.61],[0.208,0.72],[0.238,0.81],[0.285,0.88]],m.body,0.30,"rook-tower"));
  addFacetBand(g,m,0.245,0.96,0.09,16,"rook-buttress");
  addCollar(g,m,0.273,1.09);
  g.add(mesh(new THREE.CylinderGeometry(0.315,0.285,0.18,72,3),m.body,1.23,"rook-crown"));
  g.add(mesh(new THREE.CylinderGeometry(0.222,0.222,0.075,64,2),m.inset,1.31,"rook-recess"));
  const battlementGeo = new THREE.BoxGeometry(0.125,0.20,0.125,3,4,3);
  for(let i=0;i<8;i+=1){
    const a=i*Math.PI/4;
    const b=mesh(battlementGeo,m.body,1.43,"battlement");
    b.position.set(Math.cos(a)*0.262,1.43,Math.sin(a)*0.262);
    b.rotation.y=-a+Math.PI/4;
    g.add(b);
  }
  return g;
}

function createBishop(m) {
  const g = new THREE.Group();
  addBase(g,m,0.84);
  g.add(lathe([[0.27,0],[0.248,0.05],[0.216,0.14],[0.181,0.28],[0.154,0.43],[0.143,0.58],[0.154,0.69],[0.184,0.79],[0.215,0.87],[0.196,0.93]],m.body,0.30,"bishop-stem"));
  addFacetBand(g,m,0.205,1.01,0.08,14,"bishop-rib");
  addCollar(g,m,0.202,1.11);

  // Two real smooth lobes define the diagonal Staunton slit as empty space between them.
  const left = [
    {x:-0.055,y:1.25,rx:0.110,rz:0.120},{x:-0.078,y:1.34,rx:0.128,rz:0.135},{x:-0.090,y:1.44,rx:0.132,rz:0.140},
    {x:-0.086,y:1.54,rx:0.122,rz:0.132},{x:-0.074,y:1.64,rx:0.102,rz:0.112},{x:-0.055,y:1.73,rx:0.076,rz:0.085},
    {x:-0.033,y:1.80,rx:0.047,rz:0.055},{x:-0.017,y:1.85,rx:0.022,rz:0.028}
  ];
  const right = [
    {x:0.055,y:1.25,rx:0.110,rz:0.120},{x:0.078,y:1.34,rx:0.128,rz:0.135},{x:0.090,y:1.44,rx:0.132,rz:0.140},
    {x:0.086,y:1.54,rx:0.122,rz:0.132},{x:0.074,y:1.64,rx:0.102,rz:0.112},{x:0.055,y:1.73,rx:0.076,rz:0.085},
    {x:0.033,y:1.80,rx:0.047,rz:0.055},{x:0.017,y:1.85,rx:0.022,rz:0.028}
  ];
  const l = mesh(loftGeometry(left,56),m.body,0,"bishop-mitre-left");
  const r = mesh(loftGeometry(right,56),m.body,0,"bishop-mitre-right");
  l.rotation.z = -0.08; r.rotation.z = 0.08;
  g.add(l,r);
  // Recess sits behind the physical gap, making the cut readable without faking the outer silhouette.
  const recess = mesh(new THREE.BoxGeometry(0.018,0.34,0.19,1,8,2),m.inset,1.57,"bishop-notch-recess");
  recess.rotation.z=0.62;
  g.add(recess);
  return g;
}

function createQueen(m) {
  const g = new THREE.Group();
  addBase(g,m,0.88);
  g.add(lathe([[0.28,0],[0.258,0.05],[0.228,0.14],[0.192,0.29],[0.163,0.48],[0.147,0.66],[0.158,0.78],[0.192,0.89],[0.232,0.97],[0.217,1.02]],m.body,0.30,"queen-stem"));
  addFacetBand(g,m,0.225,1.17,0.09,16,"queen-crown-facet");
  addCollar(g,m,0.232,1.29);
  g.add(mesh(new THREE.CylinderGeometry(0.232,0.252,0.10,72,2),m.body,1.38,"queen-crown"));
  const petal=loftGeometry([{y:0,rx:0.055,rz:0.042},{y:0.105,rx:0.046,rz:0.035},{y:0.205,rx:0.025,rz:0.021},{y:0.265,rx:0.010,rz:0.010}],24);
  const orb=new THREE.SphereGeometry(0.033,20,14);
  for(let i=0;i<10;i+=1){
    const a=i*Math.PI/5;
    const p=mesh(petal,m.body,1.42,"queen-crown");
    p.position.set(Math.cos(a)*0.212,1.42,Math.sin(a)*0.212); p.rotation.y=-a; g.add(p);
    const o=mesh(orb,m.trim,1.69,"queen-crown-orb"); o.position.set(Math.cos(a)*0.212,1.69,Math.sin(a)*0.212); g.add(o);
  }
  return g;
}

function createKing(m) {
  const g = new THREE.Group();
  addBase(g,m,0.90);
  g.add(lathe([[0.285,0],[0.263,0.05],[0.232,0.14],[0.198,0.30],[0.166,0.50],[0.149,0.69],[0.164,0.81],[0.198,0.91],[0.242,1.00],[0.228,1.06]],m.body,0.30,"king-stem"));
  addFacetBand(g,m,0.238,1.20,0.10,16,"king-cross-facet");
  addCollar(g,m,0.247,1.35);
  g.add(mesh(new THREE.CylinderGeometry(0.212,0.247,0.17,72,3),m.body,1.48,"king-crown"));
  g.add(mesh(new THREE.SphereGeometry(0.095,40,26),m.trim,1.64,"head"));
  g.add(mesh(new THREE.BoxGeometry(0.060,0.34,0.060,3,10,3),m.body,1.88,"cross"));
  g.add(mesh(new THREE.BoxGeometry(0.285,0.060,0.060,10,3,3),m.body,1.90,"cross"));
  return g;
}

function createKnight(m) {
  const g = new THREE.Group();
  addBase(g,m,0.86);
  g.add(lathe([[0.272,0],[0.248,0.05],[0.218,0.14],[0.192,0.27],[0.192,0.40],[0.211,0.50],[0.248,0.56]],m.body,0.30,"knight-pedestal"));
  addCollar(g,m,0.222,0.82);

  // Single sculpted horse mass from chest through S-neck, poll, face and nose.
  const horse = [
    {x:-0.13,y:0.88,rx:0.205,rz:0.185},{x:-0.17,y:0.99,rx:0.215,rz:0.185},{x:-0.19,y:1.11,rx:0.205,rz:0.178},
    {x:-0.18,y:1.23,rx:0.190,rz:0.168},{x:-0.15,y:1.34,rx:0.175,rz:0.158},{x:-0.10,y:1.43,rx:0.165,rz:0.150},
    {x:-0.035,y:1.51,rx:0.160,rz:0.145},{x:0.045,y:1.57,rx:0.166,rz:0.146},{x:0.135,y:1.60,rx:0.180,rz:0.148},
    {x:0.225,y:1.59,rx:0.181,rz:0.145},{x:0.315,y:1.55,rx:0.168,rz:0.137},{x:0.395,y:1.49,rx:0.151,rz:0.126},
    {x:0.465,y:1.42,rx:0.132,rz:0.113},{x:0.525,y:1.36,rx:0.112,rz:0.102},{x:0.575,y:1.32,rx:0.086,rz:0.090},
    {x:0.610,y:1.30,rx:0.052,rz:0.066}
  ];
  g.add(mesh(loftGeometry(horse,64),m.body,0,"knight-sculpt"));

  // Lower jaw is a soft secondary volume, tucked under the muzzle.
  const jaw = loftGeometry([
    {x:0.28,y:1.48,rx:0.115,rz:0.112},{x:0.37,y:1.43,rx:0.120,rz:0.106},{x:0.46,y:1.37,rx:0.108,rz:0.098},
    {x:0.535,y:1.32,rx:0.088,rz:0.084},{x:0.588,y:1.30,rx:0.047,rz:0.060}
  ],48);
  g.add(mesh(jaw,m.body,0,"knight-jaw"));

  // Cheek/brow masses refine the horse anatomy rather than appearing as separate balls.
  for(const side of [-1,1]){
    const cheek=mesh(new THREE.SphereGeometry(0.108,36,24),m.body,1.54,"knight-cheek");
    cheek.scale.set(1.15,0.78,0.42); cheek.position.set(0.18,1.54,side*0.112); g.add(cheek);
    const eye=mesh(new THREE.SphereGeometry(0.022,18,12),m.eye,1.59,"eye"); eye.position.set(0.285,1.59,side*0.148); g.add(eye);
  }

  // Two tapered ears grown from the poll.
  for(const side of [-1,1]){
    const earSections=[
      {x:0.00,y:1.66,z:side*0.085,rx:0.054,rz:0.036},{x:-0.01,y:1.76,z:side*0.088,rx:0.040,rz:0.029},
      {x:-0.025,y:1.86,z:side*0.090,rx:0.020,rz:0.017},{x:-0.035,y:1.91,z:side*0.090,rx:0.006,rz:0.006}
    ];
    g.add(mesh(loftGeometry(earSections,28),m.body,0,"knight-ear"));
  }

  // Continuous backward crest following the rear curvature of the S-neck.
  const crest = crestGeometry([
    {x:-0.205,y:0.99,drop:0.070},{x:-0.220,y:1.10,drop:0.082},{x:-0.212,y:1.22,drop:0.090},
    {x:-0.185,y:1.34,drop:0.096},{x:-0.145,y:1.45,drop:0.098},{x:-0.095,y:1.55,drop:0.094},
    {x:-0.045,y:1.64,drop:0.085},{x:-0.015,y:1.72,drop:0.070}
  ],0.041);
  g.add(mesh(crest,m.trim,0,"mane-ridge"));
  return g;
}

const BUILDERS={pawn:createPawn,rook:createRook,knight:createKnight,bishop:createBishop,queen:createQueen,king:createKing};

export function countObjectTriangles(object,{includeDecorative=false}={}){
  let n=0; object?.traverse?.((c)=>{if(!c.isMesh)return;if(!includeDecorative&&c.userData?.decorative)return;const geom=c.geometry;n+=geom?.index?.count?Math.floor(geom.index.count/3):Math.floor((geom?.attributes?.position?.count??0)/3);}); return n;
}
export function countUniquePieceResources(object){
  const geometries=new Set(),materials=new Set();let meshes=0;object?.traverse?.((c)=>{if(!c.isMesh)return;meshes+=1;if(c.geometry)geometries.add(c.geometry.uuid);for(const mat of Array.isArray(c.material)?c.material:[c.material])if(mat)materials.add(mat.uuid);});return{meshes,uniqueGeometries:geometries.size,uniqueMaterials:materials.size};
}
function cloneTemplate(t){const c=t.clone(true);c.traverse((x)=>{if(x.userData)x.userData={...x.userData};});return c;}

export class OpenSourceStauntonV8PieceSet {
  constructor(){this.templates=new Map();this.stats=new Map();}
  key(type,color){return `${type}:${color}`;}
  buildTemplate(type,color){
    const builder=BUILDERS[type]??BUILDERS.pawn;
    const g=builder(materialsFor(color));
    g.name=`${color}-${type}-${SOURCE_ID}-template`;
    fit(g,type); addEdges(g,materialsFor(color)); fit(g,type);
    g.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(g),size=box.getSize(new THREE.Vector3()),triangles=countObjectTriangles(g),e=pieceCellEnvelope(type),resources=countUniquePieceResources(g);
    g.userData.forgeVisualSource=SOURCE_ID;
    g.userData.openSourceStauntonRevision=REVISION;
    g.userData.openSourceStauntonType=type;
    g.userData.openSourceStauntonColor=color;
    g.userData.referenceAssetsPolicy="reference-only-not-runtime";
    g.userData.openSourceStauntonTriangles=triangles;
    this.stats.set(this.key(type,color),{
      type,color,triangles,bounds:{x:size.x,y:size.y,z:size.z},resources,
      finite:[size.x,size.y,size.z].every((v)=>Number.isFinite(v)&&v>0),
      fitsLevel:size.y<=e.maxHeight+1e-6,
      fitsCell:size.x<=e.maxFootprint+1e-6&&size.z<=e.maxFootprint+1e-6,
      maxHeight:e.maxHeight,maxFootprint:e.maxFootprint,levelSpacing:LEVEL_SPACING,cellRenderSize:CELL_RENDER_SIZE,
      style:"Open-source sculpted Staunton v10",revision:REVISION,runtimePrimarySource:SOURCE_ID,referenceAssetsPolicy:"reference-only-not-runtime",freeForPublicRenderer:true,
    });
    return g;
  }
  getTemplate(type,color){const k=this.key(type,color);if(!this.templates.has(k))this.templates.set(k,this.buildTemplate(type,color));return this.templates.get(k);}
  create(type,color){const t=this.getTemplate(type,color),r=cloneTemplate(t);r.name=`${color}-${type}-${SOURCE_ID}`;r.userData={...t.userData};return r;}
  inspect(type,color="white"){this.getTemplate(type,color);return this.stats.get(this.key(type,color));}
  inspectAll(){return TYPES.map((type)=>this.inspect(type,"white"));}
}

export class OpenSourceStauntonPieceSet extends OpenSourceStauntonV8PieceSet {}
export class ForgeMcpPremiumPieceSet extends OpenSourceStauntonV8PieceSet {} // compatibility only; no paid tier
export const OPEN_SOURCE_STAUNTON_REVISION=REVISION;
export const OPEN_SOURCE_STAUNTON_SAFE_FIT=PIECE_CELL_ENVELOPE;
export const FORGEMCP_PREMIUM_REVISION=REVISION;
export const FORGEMCP_PREMIUM_SAFE_FIT=PIECE_CELL_ENVELOPE;
