import * as THREE from "three";
import { CELL_RENDER_SIZE, LEVEL_SPACING } from "./coordinates.js";

const LATHE_SEGMENTS = 56;
const TORUS_RADIAL = 12;
const TORUS_TUBULAR = 48;
const PREMIUM_REVISION = "2026-08-31-premium-v5-reference-optimized";

const SAFE_FIT = Object.freeze({
  pawn: Object.freeze({ maxHeight: LEVEL_SPACING * 0.44, maxFootprint: CELL_RENDER_SIZE * 0.48 }),
  rook: Object.freeze({ maxHeight: LEVEL_SPACING * 0.54, maxFootprint: CELL_RENDER_SIZE * 0.51 }),
  knight: Object.freeze({ maxHeight: LEVEL_SPACING * 0.57, maxFootprint: CELL_RENDER_SIZE * 0.52 }),
  bishop: Object.freeze({ maxHeight: LEVEL_SPACING * 0.57, maxFootprint: CELL_RENDER_SIZE * 0.50 }),
  queen: Object.freeze({ maxHeight: LEVEL_SPACING * 0.59, maxFootprint: CELL_RENDER_SIZE * 0.52 }),
  king: Object.freeze({ maxHeight: LEVEL_SPACING * 0.60, maxFootprint: CELL_RENDER_SIZE * 0.52 }),
});

const materialCache = new Map();

function createMosaicTexture(base, accentA, accentB) {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const colors = [new THREE.Color(base), new THREE.Color(accentA), new THREE.Color(accentB)];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const shardX = Math.floor(x / 6);
      const shardY = Math.floor(y / 6);
      const hash = (shardX * 31 + shardY * 17 + x * 7 + y * 13) % 29;
      const color = colors[hash < 18 ? 0 : hash < 24 ? 1 : 2];
      const diagonal = ((x + y + hash) % 11) / 10;
      const shimmer = 0.74 + diagonal * 0.26;
      data[index] = Math.round(color.r * 255 * shimmer);
      data[index + 1] = Math.round(color.g * 255 * shimmer);
      data[index + 2] = Math.round(color.b * 255 * shimmer);
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 6);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function makePhysical(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    map: options.map ?? null,
    metalness: options.metalness ?? 0.45,
    roughness: options.roughness ?? 0.14,
    clearcoat: options.clearcoat ?? 1,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.08,
    reflectivity: options.reflectivity ?? 1,
    iridescence: options.iridescence ?? 0.4,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: options.iridescenceThicknessRange ?? [160, 650],
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    flatShading: options.flatShading ?? false,
  });
}

function createMaterialSet(color) {
  if (materialCache.has(color)) return materialCache.get(color);
  const isWhite = color === "white";
  const mosaic = isWhite
    ? createMosaicTexture(0xe8edf1, 0x8dd8ff, 0xc68cff)
    : createMosaicTexture(0x0b1419, 0x067a64, 0x433168);
  const set = isWhite ? {
    primary: makePhysical(0xf3f0e9, { map: mosaic, metalness: 0.24, roughness: 0.11, iridescence: 0.32 }),
    secondary: makePhysical(0xd8e0e8, { metalness: 0.58, roughness: 0.11, iridescence: 0.30, flatShading: true }),
    accent: makePhysical(0xd3a84b, { metalness: 0.9, roughness: 0.08, emissive: 0x3b2805, emissiveIntensity: 0.2, flatShading: true }),
    jewel: makePhysical(0x48cfff, { metalness: 0.36, roughness: 0.035, iridescence: 0.92, emissive: 0x087fa5, emissiveIntensity: 0.78, flatShading: true }),
    dark: makePhysical(0x182330, { metalness: 0.72, roughness: 0.13 }),
    glow: makePhysical(0x61efff, { metalness: 0.34, roughness: 0.05, emissive: 0x00b8d8, emissiveIntensity: 1.25 }),
    contour: new THREE.MeshBasicMaterial({ color: 0x101820, side: THREE.BackSide, transparent: true, opacity: 0.42, depthWrite: false }),
    outline: 0x101820,
    edge: 0x7fefff,
  } : {
    primary: makePhysical(0x0b1118, { map: mosaic, metalness: 0.84, roughness: 0.08, iridescence: 0.58 }),
    secondary: makePhysical(0x26363b, { metalness: 0.9, roughness: 0.1, iridescence: 0.5, flatShading: true }),
    accent: makePhysical(0xb66834, { metalness: 0.92, roughness: 0.08, emissive: 0x3a1205, emissiveIntensity: 0.28, flatShading: true }),
    jewel: makePhysical(0x28efb0, { metalness: 0.42, roughness: 0.03, iridescence: 0.96, emissive: 0x008967, emissiveIntensity: 0.9, flatShading: true }),
    dark: makePhysical(0x020508, { metalness: 0.72, roughness: 0.13 }),
    glow: makePhysical(0x38ffc2, { metalness: 0.38, roughness: 0.04, emissive: 0x00c58d, emissiveIntensity: 1.4 }),
    contour: new THREE.MeshBasicMaterial({ color: 0xc8fff0, side: THREE.BackSide, transparent: true, opacity: 0.42, depthWrite: false }),
    outline: 0xc8fff0,
    edge: 0x49ffd0,
  };
  materialCache.set(color, set);
  return set;
}

function markRenderable(item, role = "surface") {
  item.castShadow = true;
  item.receiveShadow = true;
  item.userData.forgePremiumRole = role;
  return item;
}

function mesh(geometry, material, y = 0, role = "surface") {
  const item = markRenderable(new THREE.Mesh(geometry, material), role);
  item.position.y = y;
  return item;
}

function lathe(profile, material, y = 0, role = "surface") {
  return mesh(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), LATHE_SEGMENTS), material, y, role);
}

function fitPremiumInsideCell(group, type) {
  const envelope = SAFE_FIT[type] ?? SAFE_FIT.pawn;
  group.position.set(0, 0, 0);
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) throw new Error(`Invalid premium ${type} bounds`);
  group.scale.setScalar(Math.min(envelope.maxHeight / size.y, envelope.maxFootprint / size.x, envelope.maxFootprint / size.z));
  group.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.position.y -= bounds.min.y;
  group.updateMatrixWorld(true);
  return group;
}

function addContours(group, materials) {
  const sourceMeshes = [];
  group.traverse((child) => { if (child.isMesh && !child.userData.decorative) sourceMeshes.push(child); });
  for (const child of sourceMeshes) {
    if (!["jewel", "eye", "glow-ring", "accent-ring", "crystal-fin"].includes(child.userData?.forgePremiumRole)) continue;
    const shell = new THREE.Mesh(child.geometry, materials.contour);
    shell.position.copy(child.position); shell.rotation.copy(child.rotation); shell.scale.copy(child.scale).multiplyScalar(1.018);
    shell.renderOrder = 30; shell.userData.decorative = true; child.parent.add(shell);
  }
}

function addPremiumBase(group, materials, footprint = 1) {
  group.add(lathe([
    [0,0],[0.30*footprint,0],[0.43*footprint,0.025],[0.51*footprint,0.065],[0.50*footprint,0.11],
    [0.45*footprint,0.16],[0.40*footprint,0.21],[0.36*footprint,0.28],[0.34*footprint,0.33],
  ], materials.primary));
  const lowerGlow = mesh(new THREE.TorusGeometry(0.47*footprint,0.025,TORUS_RADIAL,TORUS_TUBULAR),materials.glow,0.08,"glow-ring"); lowerGlow.rotation.x=Math.PI/2; group.add(lowerGlow);
  const upperRing = mesh(new THREE.TorusGeometry(0.39*footprint,0.022,TORUS_RADIAL,TORUS_TUBULAR),materials.accent,0.22,"accent-ring"); upperRing.rotation.x=Math.PI/2; group.add(upperRing);
}

function addFacetBand(group, material, radius, y, height = 0.07, segments = 16) {
  const band = mesh(new THREE.CylinderGeometry(radius,radius*1.015,height,segments,1),material,y,"facet-band"); band.rotation.y=Math.PI/segments; group.add(band);
}

function addJewelStuds(group, materials, radius, y, count = 8, size = 0.034) {
  const geometry = new THREE.OctahedronGeometry(size,1);
  for (let i=0;i<count;i+=1) {
    const angle=(i/count)*Math.PI*2;
    const jewel=mesh(geometry,materials.jewel,y,"jewel");
    jewel.position.set(Math.cos(angle)*radius,y,Math.sin(angle)*radius); jewel.rotation.y=angle; group.add(jewel);
  }
}

function addCrystalFins(group, materials, radius, y, count, height, role="crystal-fin") {
  const geometry = new THREE.ConeGeometry(0.055, height, 6, 1);
  for (let i=0;i<count;i+=1) {
    const angle=(i/count)*Math.PI*2;
    const fin=mesh(geometry,i%2?materials.jewel:materials.secondary,y,role);
    fin.position.set(Math.cos(angle)*radius,y,Math.sin(angle)*radius);
    fin.rotation.z=-Math.cos(angle)*0.16;
    fin.rotation.x=Math.sin(angle)*0.16;
    fin.rotation.y=-angle;
    group.add(fin);
  }
}

function createPawn(materials) {
  const group=new THREE.Group(); addPremiumBase(group,materials,0.87);
  group.add(lathe([[0.28,0],[0.27,0.05],[0.23,0.14],[0.19,0.31],[0.17,0.49],[0.20,0.61],[0.24,0.69],[0.20,0.75]],materials.primary,0.28));
  addFacetBand(group,materials.secondary,0.225,0.95,0.065,14);
  const head=mesh(new THREE.IcosahedronGeometry(0.22,2),materials.primary,1.22,"head"); head.scale.y=1.04; group.add(head);
  group.add(mesh(new THREE.OctahedronGeometry(0.065,1),materials.jewel,1.46,"jewel"));
  return group;
}

function createRook(materials) {
  const group=new THREE.Group(); addPremiumBase(group,materials,0.93);
  group.add(lathe([[0.29,0],[0.275,0.08],[0.235,0.18],[0.205,0.42],[0.205,0.67],[0.25,0.80],[0.30,0.87]],materials.primary,0.29));
  addFacetBand(group,materials.secondary,0.29,1.07,0.075,16);
  const crown=mesh(new THREE.CylinderGeometry(0.34,0.32,0.18,20,1),materials.primary,1.24,"crown"); group.add(crown);
  const recess=mesh(new THREE.CylinderGeometry(0.235,0.235,0.10,20,1),materials.dark,1.33,"recess"); group.add(recess);
  const blockGeometry=new THREE.BoxGeometry(0.15,0.23,0.15);
  for(let i=0;i<8;i+=1){const a=i*Math.PI/4;const block=mesh(blockGeometry,materials.primary,1.43,"battlement");block.position.set(Math.cos(a)*0.278,1.43,Math.sin(a)*0.278);block.rotation.y=-a+Math.PI/4;group.add(block);}
  addJewelStuds(group,materials,0.27,1.27,8,0.028); return group;
}

function createBishop(materials) {
  const group=new THREE.Group(); addPremiumBase(group,materials,0.89);
  group.add(lathe([[0.28,0],[0.26,0.07],[0.215,0.17],[0.175,0.36],[0.145,0.58],[0.17,0.74],[0.225,0.84],[0.20,0.91]],materials.primary,0.29));
  addFacetBand(group,materials.secondary,0.22,1.13,0.065,14);
  const mitre=mesh(new THREE.OctahedronGeometry(0.31,2),materials.primary,1.44,"mitre"); mitre.scale.set(0.72,1.50,0.72); mitre.rotation.y=Math.PI/4; group.add(mitre);
  const cut=mesh(new THREE.BoxGeometry(0.055,0.66,0.45),materials.dark,1.47,"bishop-cut"); cut.rotation.z=0.62; cut.rotation.y=0.18; group.add(cut);
  const glowCut=mesh(new THREE.BoxGeometry(0.016,0.59,0.46),materials.glow,1.47,"glow-cut"); glowCut.rotation.copy(cut.rotation); glowCut.position.x=0.03; group.add(glowCut);
  addCrystalFins(group,materials,0.22,1.42,8,0.30);
  group.add(mesh(new THREE.OctahedronGeometry(0.075,1),materials.jewel,1.80,"jewel")); return group;
}

function createQueen(materials) {
  const group=new THREE.Group(); addPremiumBase(group,materials,0.92);
  group.add(lathe([[0.29,0],[0.27,0.07],[0.225,0.17],[0.18,0.39],[0.145,0.66],[0.17,0.82],[0.23,0.91],[0.26,1.0]],materials.primary,0.29));
  const ring=mesh(new THREE.TorusGeometry(0.25,0.04,TORUS_RADIAL,TORUS_TUBULAR),materials.glow,1.40,"glow-ring"); ring.rotation.x=Math.PI/2; group.add(ring);
  addCrystalFins(group,materials,0.235,1.61,10,0.38,"crown-point");
  group.add(mesh(new THREE.IcosahedronGeometry(0.10,2),materials.jewel,1.68,"orb")); return group;
}

function createKing(materials) {
  const group=new THREE.Group(); addPremiumBase(group,materials,0.94);
  group.add(lathe([[0.30,0],[0.28,0.07],[0.235,0.17],[0.185,0.40],[0.15,0.68],[0.18,0.84],[0.24,0.94],[0.27,1.03]],materials.primary,0.29));
  const shoulder=mesh(new THREE.TorusGeometry(0.27,0.04,TORUS_RADIAL,TORUS_TUBULAR),materials.glow,1.33,"glow-ring"); shoulder.rotation.x=Math.PI/2; group.add(shoulder);
  const crown=mesh(new THREE.CylinderGeometry(0.215,0.27,0.21,18,1),materials.secondary,1.48,"crown"); group.add(crown);
  addCrystalFins(group,materials,0.205,1.55,8,0.24);
  group.add(mesh(new THREE.IcosahedronGeometry(0.105,2),materials.jewel,1.69,"orb"));
  const vertical=mesh(new THREE.BoxGeometry(0.075,0.46,0.075),materials.primary,1.96,"cross");
  const horizontal=mesh(new THREE.BoxGeometry(0.36,0.075,0.075),materials.primary,2.00,"cross"); vertical.rotation.y=Math.PI/4; horizontal.rotation.y=Math.PI/4; group.add(vertical,horizontal); return group;
}

function createKnight(materials) {
  const group=new THREE.Group(); addPremiumBase(group,materials,0.92);
  group.add(lathe([[0.29,0],[0.27,0.07],[0.23,0.17],[0.20,0.32],[0.21,0.44],[0.27,0.54]],materials.primary,0.29,"pedestal"));
  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,0.76,0),new THREE.Vector3(-0.08,0.92,0),new THREE.Vector3(-0.15,1.08,0.02),
    new THREE.Vector3(-0.16,1.25,0.04),new THREE.Vector3(-0.10,1.40,0.06),new THREE.Vector3(0.03,1.52,0.08),
  ]);
  const neck=mesh(new THREE.TubeGeometry(curve,48,0.19,14,false),materials.primary,0,"neck"); neck.scale.z=0.84; group.add(neck);
  const chest=mesh(new THREE.IcosahedronGeometry(0.29,2),materials.secondary,0.83,"chest"); chest.scale.set(0.82,1.03,0.72); chest.position.x=-0.03; group.add(chest);
  const head=mesh(new THREE.IcosahedronGeometry(0.265,2),materials.primary,1.59,"head"); head.scale.set(1.18,0.84,0.82); head.position.x=0.14; head.rotation.z=-0.18; group.add(head);
  const muzzle=mesh(new THREE.CapsuleGeometry(0.115,0.27,8,16),materials.secondary,1.51,"muzzle"); muzzle.rotation.z=Math.PI/2-0.14; muzzle.position.x=0.38; muzzle.scale.z=0.74; group.add(muzzle);
  for(const side of [-1,1]){
    const cheek=mesh(new THREE.OctahedronGeometry(0.14,2),materials.jewel,1.60,"cheek"); cheek.position.set(0.07,1.60,side*0.17); cheek.scale.set(1.1,0.92,0.34); group.add(cheek);
    const eye=mesh(new THREE.SphereGeometry(0.032,12,8),materials.dark,1.69,"eye"); eye.position.set(0.27,1.69,side*0.18); group.add(eye);
    const ear=mesh(new THREE.ConeGeometry(0.065,0.29,10,1),materials.primary,1.89,"ear"); ear.position.set(-0.02,1.89,side*0.11); ear.rotation.z=-0.13; ear.rotation.x=side*0.08; group.add(ear);
  }
  const maneGeometry=new THREE.ConeGeometry(0.05,0.22,8,1);
  for(let i=0;i<8;i+=1){const mane=mesh(maneGeometry,i%2?materials.glow:materials.accent,1.16+i*0.085,"mane");mane.position.x=-0.19+i*0.012;mane.rotation.z=-Math.PI/2-0.12;group.add(mane);}
  addCrystalFins(group,materials,0.20,0.93,6,0.22,"armor-crystal"); return group;
}

const BUILDERS={pawn:createPawn,rook:createRook,knight:createKnight,bishop:createBishop,queen:createQueen,king:createKing};

export function countObjectTriangles(object,{includeDecorative=false}={}){
  let triangles=0;
  object?.traverse?.((child)=>{
    if(!child.isMesh) return;
    if(!includeDecorative&&child.userData?.decorative) return;
    const geometry=child.geometry;
    if(geometry?.index?.count) triangles+=Math.floor(geometry.index.count/3);
    else triangles+=Math.floor((geometry?.attributes?.position?.count??0)/3);
  });
  return triangles;
}

export function countUniquePieceResources(object){
  const geometries=new Set(); const materials=new Set(); let meshes=0;
  object?.traverse?.((child)=>{if(!child.isMesh)return;meshes+=1;if(child.geometry)geometries.add(child.geometry.uuid);const list=Array.isArray(child.material)?child.material:[child.material];for(const material of list){if(material)materials.add(material.uuid);}});
  return {meshes,uniqueGeometries:geometries.size,uniqueMaterials:materials.size};
}

function cloneTemplate(template){
  const clone=template.clone(true);
  clone.traverse((child)=>{if(child.userData) child.userData={...child.userData};});
  return clone;
}

export class ForgeMcpPremiumPieceSet {
  constructor(){this.templates=new Map();this.stats=new Map();}
  templateKey(type,color){return `${type}:${color}`;}
  buildTemplate(type,color){
    const builder=BUILDERS[type]??BUILDERS.pawn;
    const materials=createMaterialSet(color);
    const group=builder(materials);
    group.name=`${color}-${type}-forgemcp-premium-template`;
    fitPremiumInsideCell(group,type); addContours(group,materials); fitPremiumInsideCell(group,type); group.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(group); const size=bounds.getSize(new THREE.Vector3()); const triangles=countObjectTriangles(group); const envelope=SAFE_FIT[type]??SAFE_FIT.pawn; const resources=countUniquePieceResources(group);
    group.userData.forgeVisualSource="forgemcp-premium-reference-optimized";
    group.userData.forgePremiumRevision=PREMIUM_REVISION;
    group.userData.forgePremiumType=type; group.userData.forgePremiumColor=color; group.userData.forgePremiumTriangles=triangles; group.userData.forgePremiumSafeFit={...envelope}; group.userData.forgePremiumSharedResources=true;
    this.stats.set(this.templateKey(type,color),{
      type,color,triangles,bounds:{x:size.x,y:size.y,z:size.z},resources,
      maxHeight:envelope.maxHeight,maxFootprint:envelope.maxFootprint,levelSpacing:LEVEL_SPACING,cellRenderSize:CELL_RENDER_SIZE,
      finite:[size.x,size.y,size.z].every((value)=>Number.isFinite(value)&&value>0),fitsLevel:size.y<=envelope.maxHeight+1e-6,fitsCell:size.x<=envelope.maxFootprint+1e-6&&size.z<=envelope.maxFootprint+1e-6,
      sharedGeometryAndMaterials:true,referenceInspired:true,revision:PREMIUM_REVISION,
    });
    return group;
  }
  getTemplate(type,color){const key=this.templateKey(type,color);if(!this.templates.has(key))this.templates.set(key,this.buildTemplate(type,color));return this.templates.get(key);}
  create(type,color){const template=this.getTemplate(type,color);const result=cloneTemplate(template);result.name=`${color}-${type}-forgemcp-premium`;result.userData={...template.userData};return result;}
  inspect(type,color="white"){this.getTemplate(type,color);return this.stats.get(this.templateKey(type,color));}
  inspectAll(){return Object.keys(BUILDERS).map((type)=>this.inspect(type,"white"));}
}

export const FORGEMCP_PREMIUM_REVISION=PREMIUM_REVISION;
export const FORGEMCP_PREMIUM_SAFE_FIT=SAFE_FIT;
