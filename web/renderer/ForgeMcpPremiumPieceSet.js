import * as THREE from "three";
import { CELL_RENDER_SIZE, LEVEL_SPACING } from "./coordinates.js";

const LATHE_SEGMENTS = 128;
const TORUS_RADIAL = 24;
const TORUS_TUBULAR = 96;
const PREMIUM_REVISION = "2026-08-31-premium-v4-highpoly-cellfit";

const SAFE_FIT = Object.freeze({
  pawn: Object.freeze({ maxHeight: LEVEL_SPACING * 0.50, maxFootprint: CELL_RENDER_SIZE * 0.54 }),
  rook: Object.freeze({ maxHeight: LEVEL_SPACING * 0.62, maxFootprint: CELL_RENDER_SIZE * 0.58 }),
  knight: Object.freeze({ maxHeight: LEVEL_SPACING * 0.64, maxFootprint: CELL_RENDER_SIZE * 0.58 }),
  bishop: Object.freeze({ maxHeight: LEVEL_SPACING * 0.65, maxFootprint: CELL_RENDER_SIZE * 0.56 }),
  queen: Object.freeze({ maxHeight: LEVEL_SPACING * 0.67, maxFootprint: CELL_RENDER_SIZE * 0.58 }),
  king: Object.freeze({ maxHeight: LEVEL_SPACING * 0.68, maxFootprint: CELL_RENDER_SIZE * 0.58 }),
});

function createMosaicTexture(base, accentA, accentB) {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const colors = [new THREE.Color(base), new THREE.Color(accentA), new THREE.Color(accentB)];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const shardX = Math.floor(x / 8);
      const shardY = Math.floor(y / 8);
      const hash = (shardX * 31 + shardY * 17 + x * 7 + y * 13) % 29;
      const color = colors[hash < 18 ? 0 : hash < 24 ? 1 : 2];
      const diagonal = ((x + y + hash) % 11) / 10;
      const shimmer = 0.72 + diagonal * 0.28;
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
  texture.repeat.set(4.5, 7.0);
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
    roughness: options.roughness ?? 0.15,
    clearcoat: options.clearcoat ?? 1,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.08,
    reflectivity: options.reflectivity ?? 1,
    iridescence: options.iridescence ?? 0.42,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: options.iridescenceThicknessRange ?? [160, 650],
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });
}

function createMaterialSet(color) {
  if (color === "white") {
    const mosaic = createMosaicTexture(0xe8edf1, 0x8dd8ff, 0xc68cff);
    return {
      primary: makePhysical(0xf3f0e9, { map: mosaic, metalness: 0.22, roughness: 0.11, iridescence: 0.32 }),
      secondary: makePhysical(0xd9e0e8, { metalness: 0.54, roughness: 0.12, iridescence: 0.28 }),
      accent: makePhysical(0xd3a84b, { metalness: 0.9, roughness: 0.08, emissive: 0x3b2805, emissiveIntensity: 0.2 }),
      jewel: makePhysical(0x48cfff, { metalness: 0.38, roughness: 0.04, iridescence: 0.88, emissive: 0x087fa5, emissiveIntensity: 0.7 }),
      dark: makePhysical(0x1b2430, { metalness: 0.72, roughness: 0.13 }),
      glow: makePhysical(0x61efff, { metalness: 0.35, roughness: 0.05, emissive: 0x00b8d8, emissiveIntensity: 1.2 }),
      outline: 0x101820,
      edge: 0x7fefff,
    };
  }
  const mosaic = createMosaicTexture(0x0b1419, 0x067a64, 0x433168);
  return {
    primary: makePhysical(0x0b1118, { map: mosaic, metalness: 0.84, roughness: 0.08, iridescence: 0.58 }),
    secondary: makePhysical(0x26363b, { metalness: 0.9, roughness: 0.1, iridescence: 0.48 }),
    accent: makePhysical(0xb66834, { metalness: 0.92, roughness: 0.08, emissive: 0x3a1205, emissiveIntensity: 0.25 }),
    jewel: makePhysical(0x28efb0, { metalness: 0.42, roughness: 0.035, iridescence: 0.95, emissive: 0x008967, emissiveIntensity: 0.85 }),
    dark: makePhysical(0x020508, { metalness: 0.72, roughness: 0.13 }),
    glow: makePhysical(0x38ffc2, { metalness: 0.38, roughness: 0.04, emissive: 0x00c58d, emissiveIntensity: 1.35 }),
    outline: 0xc8fff0,
    edge: 0x49ffd0,
  };
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
  return mesh(
    new THREE.LatheGeometry(profile.map(([radius, height]) => new THREE.Vector2(radius, height)), LATHE_SEGMENTS),
    material,
    y,
    role,
  );
}

function fitPremiumInsideCell(group, type) {
  const envelope = SAFE_FIT[type] ?? SAFE_FIT.pawn;
  group.position.set(0, 0, 0);
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error(`Invalid premium ${type} bounds`);
  }
  const scale = Math.min(
    envelope.maxHeight / size.y,
    envelope.maxFootprint / size.x,
    envelope.maxFootprint / size.z,
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

function addContours(group, materials) {
  const sourceMeshes = [];
  group.traverse((child) => {
    if (child.isMesh && !child.userData.decorative) sourceMeshes.push(child);
  });
  for (const child of sourceMeshes) {
    const shell = new THREE.Mesh(child.geometry, new THREE.MeshBasicMaterial({
      color: materials.outline,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }));
    shell.position.copy(child.position);
    shell.rotation.copy(child.rotation);
    shell.scale.copy(child.scale).multiplyScalar(1.012);
    shell.renderOrder = 30;
    shell.userData.decorative = true;
    child.parent.add(shell);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(child.geometry, 22),
      new THREE.LineBasicMaterial({ color: materials.edge, transparent: true, opacity: 0.56, depthWrite: false }),
    );
    edges.position.copy(child.position);
    edges.rotation.copy(child.rotation);
    edges.scale.copy(child.scale).multiplyScalar(1.003);
    edges.renderOrder = 31;
    edges.userData.decorative = true;
    child.parent.add(edges);
  }
}

function addPremiumBase(group, materials, footprint = 1) {
  group.add(lathe([
    [0.00,0.00],[0.30*footprint,0.00],[0.42*footprint,0.018],[0.49*footprint,0.045],
    [0.53*footprint,0.075],[0.52*footprint,0.11],[0.49*footprint,0.145],[0.45*footprint,0.175],
    [0.41*footprint,0.205],[0.39*footprint,0.245],[0.37*footprint,0.29],[0.35*footprint,0.33],
  ], materials.primary));
  const lowerGlow = mesh(new THREE.TorusGeometry(0.49*footprint,0.026,TORUS_RADIAL,TORUS_TUBULAR),materials.glow,0.075,"glow-ring");
  lowerGlow.rotation.x=Math.PI/2;
  group.add(lowerGlow);
  const upperGlow = mesh(new THREE.TorusGeometry(0.405*footprint,0.023,TORUS_RADIAL,TORUS_TUBULAR),materials.accent,0.225,"accent-ring");
  upperGlow.rotation.x=Math.PI/2;
  group.add(upperGlow);
}

function addFacetBand(group, material, radius, y, height = 0.07, segments = 20) {
  const band = mesh(new THREE.CylinderGeometry(radius,radius*1.015,height,segments,3),material,y,"facet-band");
  band.rotation.y=Math.PI/segments;
  group.add(band);
}

function addJewelStuds(group, materials, radius, y, count = 10, size = 0.034) {
  for (let i=0;i<count;i+=1) {
    const angle=(i/count)*Math.PI*2;
    const jewel=mesh(new THREE.OctahedronGeometry(size,3),materials.jewel,y,"jewel");
    jewel.position.set(Math.cos(angle)*radius,y,Math.sin(angle)*radius);
    jewel.rotation.y=angle;
    group.add(jewel);
  }
}

function addBodyPanels(group, materials, radius, y, count=8, height=0.32) {
  for (let i=0;i<count;i+=1) {
    const angle=(i/count)*Math.PI*2;
    const panel=mesh(new THREE.BoxGeometry(0.16,height,0.025,4,10,2),i%2?materials.secondary:materials.jewel,y,"body-panel");
    panel.position.set(Math.cos(angle)*radius,y,Math.sin(angle)*radius);
    panel.rotation.y=-angle+Math.PI/2;
    group.add(panel);
  }
}

function createPawn(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,0.9);
  group.add(lathe([[0.29,0],[0.28,0.05],[0.245,0.12],[0.205,0.23],[0.175,0.39],[0.168,0.50],[0.19,0.60],[0.235,0.67],[0.25,0.72],[0.205,0.77]],materials.primary,0.28));
  addFacetBand(group,materials.secondary,0.235,0.96,0.07,20);
  const neck=mesh(new THREE.TorusGeometry(0.195,0.026,20,88),materials.glow,1.015,"glow-ring"); neck.rotation.x=Math.PI/2; group.add(neck);
  const head=mesh(new THREE.SphereGeometry(0.225,64,48),materials.primary,1.24,"head"); group.add(head);
  const cap=mesh(new THREE.OctahedronGeometry(0.07,3),materials.jewel,1.49,"jewel"); cap.rotation.y=Math.PI/4; group.add(cap);
  addJewelStuds(group,materials,0.18,1.08,8,0.024);
  return group;
}

function createRook(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,0.95);
  group.add(lathe([[0.30,0],[0.285,0.07],[0.245,0.16],[0.215,0.34],[0.205,0.58],[0.22,0.72],[0.265,0.81],[0.31,0.87]],materials.primary,0.29));
  addBodyPanels(group,materials,0.213,0.76,8,0.34);
  addFacetBand(group,materials.secondary,0.295,1.08,0.08,24);
  const crownRing=mesh(new THREE.TorusGeometry(0.325,0.032,20,96),materials.glow,1.15,"glow-ring"); crownRing.rotation.x=Math.PI/2; group.add(crownRing);
  const crown=mesh(new THREE.CylinderGeometry(0.35,0.33,0.18,40,4),materials.primary,1.25,"crown"); group.add(crown);
  const recess=mesh(new THREE.CylinderGeometry(0.245,0.245,0.12,40,3),materials.dark,1.34,"recess"); group.add(recess);
  for(let i=0;i<8;i+=1){
    const angle=i*Math.PI/4;
    const block=mesh(new THREE.BoxGeometry(0.155,0.25,0.155,5,5,5),materials.primary,1.45,"battlement");
    block.position.set(Math.cos(angle)*0.283,1.45,Math.sin(angle)*0.283);
    block.rotation.y=-angle+Math.PI/4;
    group.add(block);
  }
  addJewelStuds(group,materials,0.285,1.27,8,0.03);
  return group;
}

function createBishop(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,0.91);
  group.add(lathe([[0.29,0],[0.27,0.07],[0.225,0.16],[0.185,0.33],[0.15,0.54],[0.145,0.65],[0.17,0.74],[0.23,0.82],[0.26,0.87],[0.21,0.92]],materials.primary,0.29));
  addBodyPanels(group,materials,0.155,0.72,6,0.28);
  addFacetBand(group,materials.secondary,0.225,1.14,0.07,20);
  const mitre=mesh(new THREE.IcosahedronGeometry(0.30,4),materials.primary,1.43,"mitre");
  mitre.scale.set(0.76,1.42,0.76); mitre.rotation.y=Math.PI/4; group.add(mitre);
  const cut=mesh(new THREE.BoxGeometry(0.06,0.72,0.50,4,12,8),materials.dark,1.47,"bishop-cut"); cut.rotation.z=0.62; cut.rotation.y=0.2; group.add(cut);
  const glowCut=mesh(new THREE.BoxGeometry(0.018,0.62,0.515,2,10,6),materials.glow,1.47,"glow-cut"); glowCut.rotation.copy(cut.rotation); glowCut.position.x=0.033; group.add(glowCut);
  const gem=mesh(new THREE.OctahedronGeometry(0.075,3),materials.jewel,1.79,"jewel"); gem.rotation.y=Math.PI/4; group.add(gem);
  return group;
}

function createQueen(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,0.94);
  group.add(lathe([[0.30,0],[0.28,0.07],[0.235,0.16],[0.19,0.36],[0.15,0.62],[0.145,0.72],[0.17,0.82],[0.235,0.90],[0.285,0.96],[0.25,1.02]],materials.primary,0.29));
  addBodyPanels(group,materials,0.16,0.78,8,0.34);
  const collar=mesh(new THREE.TorusGeometry(0.265,0.04,20,96),materials.secondary,1.27,"collar"); collar.rotation.x=Math.PI/2; group.add(collar);
  const crownRing=mesh(new THREE.TorusGeometry(0.25,0.044,20,96),materials.glow,1.43,"glow-ring"); crownRing.rotation.x=Math.PI/2; group.add(crownRing);
  for(let i=0;i<10;i+=1){
    const angle=i*Math.PI/5;
    const point=mesh(new THREE.ConeGeometry(0.058,0.36,32,5),i%2?materials.primary:materials.secondary,1.63,"crown-point");
    point.position.set(Math.cos(angle)*0.235,1.63,Math.sin(angle)*0.235);
    point.rotation.z=-Math.cos(angle)*0.1;
    point.rotation.x=Math.sin(angle)*0.1;
    group.add(point);
    const jewel=mesh(new THREE.OctahedronGeometry(0.047,3),materials.jewel,1.84,"jewel"); jewel.position.set(Math.cos(angle)*0.235,1.84,Math.sin(angle)*0.235); group.add(jewel);
  }
  group.add(mesh(new THREE.IcosahedronGeometry(0.105,4),materials.jewel,1.67,"orb"));
  return group;
}

function createKing(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,0.96);
  group.add(lathe([[0.31,0],[0.29,0.07],[0.245,0.17],[0.195,0.38],[0.16,0.66],[0.155,0.76],[0.185,0.86],[0.25,0.94],[0.30,1.00],[0.265,1.06]],materials.primary,0.29));
  addBodyPanels(group,materials,0.17,0.82,8,0.36);
  const shoulder=mesh(new THREE.TorusGeometry(0.28,0.045,20,96),materials.glow,1.33,"glow-ring"); shoulder.rotation.x=Math.PI/2; group.add(shoulder);
  const crown=mesh(new THREE.CylinderGeometry(0.225,0.28,0.23,32,5),materials.primary,1.48,"crown"); group.add(crown);
  addJewelStuds(group,materials,0.22,1.53,8,0.03);
  group.add(mesh(new THREE.IcosahedronGeometry(0.12,4),materials.jewel,1.68,"orb"));
  const vertical=mesh(new THREE.BoxGeometry(0.085,0.50,0.085,4,14,4),materials.primary,1.98,"cross");
  const horizontal=mesh(new THREE.BoxGeometry(0.40,0.085,0.085,14,4,4),materials.primary,2.02,"cross");
  vertical.rotation.y=Math.PI/4; horizontal.rotation.y=Math.PI/4; group.add(vertical,horizontal);
  const crossGlow=mesh(new THREE.BoxGeometry(0.035,0.42,0.10,2,10,3),materials.glow,1.98,"cross-glow"); crossGlow.rotation.y=Math.PI/4; group.add(crossGlow);
  return group;
}

function createKnight(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,0.95);
  group.add(lathe([[0.30,0],[0.28,0.07],[0.235,0.16],[0.205,0.31],[0.21,0.43],[0.27,0.52],[0.30,0.56]],materials.primary,0.29,"pedestal"));
  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,0.77,0),new THREE.Vector3(-0.08,0.92,0.0),new THREE.Vector3(-0.15,1.08,0.02),
    new THREE.Vector3(-0.17,1.25,0.04),new THREE.Vector3(-0.11,1.41,0.06),new THREE.Vector3(0.02,1.54,0.08),
  ]);
  const neck=mesh(new THREE.TubeGeometry(curve,96,0.20,28,false),materials.primary,0,"neck"); neck.scale.z=0.86; group.add(neck);
  const chest=mesh(new THREE.IcosahedronGeometry(0.30,4),materials.secondary,0.83,"chest"); chest.scale.set(0.82,1.03,0.72); chest.position.x=-0.03; group.add(chest);
  const head=mesh(new THREE.IcosahedronGeometry(0.27,4),materials.primary,1.60,"head"); head.scale.set(1.18,0.84,0.82); head.position.x=0.14; head.rotation.z=-0.18; group.add(head);
  const muzzle=mesh(new THREE.CapsuleGeometry(0.12,0.28,16,32),materials.secondary,1.52,"muzzle"); muzzle.rotation.z=Math.PI/2-0.14; muzzle.position.x=0.38; muzzle.scale.z=0.74; group.add(muzzle);
  for(const side of [-1,1]){
    const cheek=mesh(new THREE.OctahedronGeometry(0.145,4),materials.jewel,1.61,"cheek"); cheek.position.set(0.07,1.61,side*0.17); cheek.scale.set(1.1,0.92,0.34); group.add(cheek);
    const eye=mesh(new THREE.SphereGeometry(0.032,32,20),materials.dark,1.70,"eye"); eye.position.set(0.27,1.70,side*0.18); group.add(eye);
    const ear=mesh(new THREE.ConeGeometry(0.068,0.30,28,4),materials.primary,1.91,"ear"); ear.position.set(-0.02,1.91,side*0.11); ear.rotation.z=-0.13; ear.rotation.x=side*0.08; group.add(ear);
  }
  for(let i=0;i<9;i+=1){
    const mane=mesh(new THREE.ConeGeometry(0.052,0.22,24,4),i%2?materials.glow:materials.accent,1.16+i*0.085,"mane");
    mane.position.x=-0.19+i*0.012; mane.rotation.z=-Math.PI/2-0.12; group.add(mane);
  }
  addJewelStuds(group,materials,0.22,0.91,7,0.027);
  return group;
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

function cloneTemplate(template){
  const clone=template.clone(true);
  clone.traverse((child)=>{
    if(child.geometry) child.geometry=child.geometry.clone();
    if(Array.isArray(child.material)) child.material=child.material.map((item)=>item.clone());
    else if(child.material) child.material=child.material.clone();
  });
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
    fitPremiumInsideCell(group,type);
    addContours(group,materials);
    fitPremiumInsideCell(group,type);
    group.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(group);
    const size=bounds.getSize(new THREE.Vector3());
    const triangles=countObjectTriangles(group);
    const envelope=SAFE_FIT[type]??SAFE_FIT.pawn;
    group.userData.forgeVisualSource="forgemcp-premium-highpoly";
    group.userData.forgePremiumRevision=PREMIUM_REVISION;
    group.userData.forgePremiumType=type;
    group.userData.forgePremiumColor=color;
    group.userData.forgePremiumTriangles=triangles;
    group.userData.forgePremiumSafeFit={...envelope};
    this.stats.set(this.templateKey(type,color),{
      type,color,triangles,bounds:{x:size.x,y:size.y,z:size.z},
      maxHeight:envelope.maxHeight,maxFootprint:envelope.maxFootprint,
      levelSpacing:LEVEL_SPACING,cellRenderSize:CELL_RENDER_SIZE,
      finite:[size.x,size.y,size.z].every((value)=>Number.isFinite(value)&&value>0),
      fitsLevel:size.y<=envelope.maxHeight+1e-6,
      fitsCell:size.x<=envelope.maxFootprint+1e-6&&size.z<=envelope.maxFootprint+1e-6,
      revision:PREMIUM_REVISION,
    });
    return group;
  }
  getTemplate(type,color){
    const key=this.templateKey(type,color);
    if(!this.templates.has(key)) this.templates.set(key,this.buildTemplate(type,color));
    return this.templates.get(key);
  }
  create(type,color){
    const template=this.getTemplate(type,color);
    const result=cloneTemplate(template);
    result.name=`${color}-${type}-forgemcp-premium`;
    result.userData={...template.userData};
    return result;
  }
  inspect(type,color="white"){
    this.getTemplate(type,color);
    return this.stats.get(this.templateKey(type,color));
  }
  inspectAll(){return Object.keys(BUILDERS).map((type)=>this.inspect(type,"white"));}
}

export const FORGEMCP_PREMIUM_REVISION=PREMIUM_REVISION;
export const FORGEMCP_PREMIUM_SAFE_FIT=SAFE_FIT;
