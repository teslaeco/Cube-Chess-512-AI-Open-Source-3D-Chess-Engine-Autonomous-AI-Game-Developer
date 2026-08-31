import * as THREE from "three";
import { fitPieceInsideCell } from "./PieceGeometryFactory.js";

const LATHE_SEGMENTS = 96;
const TORUS_RADIAL = 16;
const TORUS_TUBULAR = 64;
const PREMIUM_REVISION = "2026-08-31-premium-v3-jewel-outline";

function createMosaicTexture(base, accentA, accentB) {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  const colors = [new THREE.Color(base), new THREE.Color(accentA), new THREE.Color(accentB)];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const cell = (Math.floor(x / 4) + Math.floor(y / 4) * 3 + ((x * 7 + y * 11) % 5)) % 11;
      const color = colors[cell < 7 ? 0 : cell < 9 ? 1 : 2];
      const shimmer = 0.82 + (((x * 13 + y * 17) % 19) / 18) * 0.18;
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
  texture.repeat.set(3.5, 5.5);
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
    metalness: options.metalness ?? 0.34,
    roughness: options.roughness ?? 0.17,
    clearcoat: options.clearcoat ?? 0.9,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.1,
    reflectivity: options.reflectivity ?? 0.9,
    iridescence: options.iridescence ?? 0.24,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: options.iridescenceThicknessRange ?? [180, 520],
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });
}

function createMaterialSet(color) {
  if (color === "white") {
    const mosaic = createMosaicTexture(0xe9eef2, 0x6edcf5, 0xb77cff);
    return {
      primary: makePhysical(0xf4f1e8, { map: mosaic, metalness: 0.24, roughness: 0.12, clearcoat: 1, iridescence: 0.38 }),
      secondary: makePhysical(0xd9e1e7, { metalness: 0.58, roughness: 0.15, iridescence: 0.3 }),
      accent: makePhysical(0xd8ad49, { metalness: 0.86, roughness: 0.1, clearcoat: 1, emissive: 0x5b4212, emissiveIntensity: 0.18 }),
      jewel: makePhysical(0x5ce3ff, { metalness: 0.42, roughness: 0.06, clearcoat: 1, iridescence: 0.8, emissive: 0x0a8fa8, emissiveIntensity: 0.52 }),
      dark: makePhysical(0x202834, { metalness: 0.72, roughness: 0.14 }),
      glow: makePhysical(0x5deaff, { metalness: 0.4, roughness: 0.08, emissive: 0x00b7d4, emissiveIntensity: 0.9 }),
      outline: 0x15202c,
      edge: 0x65eaff,
    };
  }
  const mosaic = createMosaicTexture(0x14231f, 0x087f63, 0x492b70);
  return {
    primary: makePhysical(0x101820, { map: mosaic, metalness: 0.78, roughness: 0.1, clearcoat: 1, iridescence: 0.5 }),
    secondary: makePhysical(0x273a3b, { metalness: 0.86, roughness: 0.12, iridescence: 0.42 }),
    accent: makePhysical(0xb96735, { metalness: 0.9, roughness: 0.1, clearcoat: 1, emissive: 0x3a1306, emissiveIntensity: 0.28 }),
    jewel: makePhysical(0x39f0b1, { metalness: 0.48, roughness: 0.05, clearcoat: 1, iridescence: 0.88, emissive: 0x009b72, emissiveIntensity: 0.64 }),
    dark: makePhysical(0x05080c, { metalness: 0.68, roughness: 0.16 }),
    glow: makePhysical(0x40ffc2, { metalness: 0.42, roughness: 0.07, emissive: 0x00c48d, emissiveIntensity: 1.0 }),
    outline: 0xc9fff0,
    edge: 0x54ffd0,
  };
}

function markMesh(item, role = "surface") {
  item.castShadow = true;
  item.receiveShadow = true;
  item.userData.forgePremiumRole = role;
  return item;
}

function mesh(geometry, material, y = 0, role = "surface") {
  const item = markMesh(new THREE.Mesh(geometry, material), role);
  item.position.y = y;
  return item;
}

function lathe(profile, material, y = 0, role = "surface") {
  return mesh(new THREE.LatheGeometry(profile.map(([radius, height]) => new THREE.Vector2(radius, height)), LATHE_SEGMENTS), material, y, role);
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
      opacity: 0.42,
      depthWrite: false,
    }));
    shell.position.copy(child.position);
    shell.rotation.copy(child.rotation);
    shell.scale.copy(child.scale).multiplyScalar(1.018);
    shell.renderOrder = 30;
    shell.userData.decorative = true;
    child.parent.add(shell);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(child.geometry, 28),
      new THREE.LineBasicMaterial({ color: materials.edge, transparent: true, opacity: 0.44, depthWrite: false }),
    );
    edges.position.copy(child.position);
    edges.rotation.copy(child.rotation);
    edges.scale.copy(child.scale).multiplyScalar(1.004);
    edges.renderOrder = 31;
    edges.userData.decorative = true;
    child.parent.add(edges);
  }
}

function addPremiumBase(group, materials, footprint = 1) {
  group.add(lathe([
    [0.0,0.0],[0.34*footprint,0.0],[0.47*footprint,0.035],[0.52*footprint,0.075],
    [0.515*footprint,0.11],[0.48*footprint,0.155],[0.43*footprint,0.195],[0.38*footprint,0.245],[0.35*footprint,0.315],
  ], materials.primary));
  group.add(lathe([[0.33*footprint,0],[0.39*footprint,0.022],[0.385*footprint,0.055]], materials.accent, 0.135, "accent"));
  const ring = mesh(new THREE.TorusGeometry(0.415*footprint,0.032,TORUS_RADIAL,TORUS_TUBULAR), materials.glow, 0.214, "glow-ring");
  ring.rotation.x = Math.PI/2;
  group.add(ring);
}

function addFacetBand(group, material, radius, y, height = 0.07, segments = 16) {
  const band = mesh(new THREE.CylinderGeometry(radius,radius*1.015,height,segments,2), material, y, "facet-band");
  band.rotation.y = Math.PI/segments;
  group.add(band);
}

function addJewelStuds(group, materials, radius, y, count = 8, size = 0.035) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const jewel = mesh(new THREE.OctahedronGeometry(size, 2), materials.jewel, y, "jewel");
    jewel.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    group.add(jewel);
  }
}

function createPawn(materials) {
  const group = new THREE.Group();
  addPremiumBase(group, materials, 0.94);
  group.add(lathe([[0.31,0],[0.295,0.05],[0.25,0.12],[0.205,0.25],[0.168,0.44],[0.17,0.56],[0.225,0.65],[0.255,0.70],[0.21,0.76]], materials.primary, 0.27));
  addFacetBand(group,materials.secondary,0.247,0.98,0.08,16);
  const neckRing = mesh(new THREE.TorusGeometry(0.207,0.03,14,56),materials.glow,1.035,"glow-ring");
  neckRing.rotation.x=Math.PI/2;
  group.add(neckRing);
  const head=mesh(new THREE.IcosahedronGeometry(0.238,3),materials.primary,1.28,"head");
  head.scale.y=1.04;
  group.add(head);
  group.add(mesh(new THREE.IcosahedronGeometry(0.073,2),materials.jewel,1.52,"jewel"));
  return group;
}

function createRook(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,1.0);
  group.add(lathe([[0.31,0],[0.295,0.08],[0.255,0.18],[0.228,0.42],[0.222,0.67],[0.27,0.79],[0.325,0.86]],materials.primary,0.28));
  addFacetBand(group,materials.secondary,0.30,0.86,0.09,16);
  const ring=mesh(new THREE.TorusGeometry(0.33,0.04,14,56),materials.glow,1.12,"glow-ring");
  ring.rotation.x=Math.PI/2;
  group.add(ring);
  const crown=mesh(new THREE.CylinderGeometry(0.37,0.35,0.19,24,3),materials.primary,1.22,"crown");
  crown.rotation.y=Math.PI/24;
  group.add(crown);
  const recess=mesh(new THREE.CylinderGeometry(0.255,0.255,0.12,24,2),materials.dark,1.32,"recess");
  group.add(recess);
  for(let index=0;index<8;index+=1){
    const angle=index*Math.PI/4;
    const block=mesh(new THREE.BoxGeometry(0.17,0.25,0.17,3,3,3),materials.primary,1.43,"battlement");
    block.position.set(Math.cos(angle)*0.292,1.43,Math.sin(angle)*0.292);
    block.rotation.y=-angle+Math.PI/4;
    group.add(block);
  }
  addJewelStuds(group,materials,0.292,1.31,8,0.032);
  return group;
}

function createBishop(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,0.95);
  group.add(lathe([[0.30,0],[0.275,0.07],[0.225,0.16],[0.182,0.34],[0.146,0.58],[0.173,0.73],[0.238,0.81],[0.275,0.87],[0.218,0.93]],materials.primary,0.28));
  addFacetBand(group,materials.secondary,0.238,1.15,0.075,16);
  const mitre=mesh(new THREE.IcosahedronGeometry(0.315,3),materials.primary,1.46,"mitre");
  mitre.scale.set(0.78,1.42,0.78);
  mitre.rotation.y=Math.PI/4;
  group.add(mitre);
  const cut=mesh(new THREE.BoxGeometry(0.078,0.76,0.54,3,8,5),materials.dark,1.49,"bishop-cut");
  cut.rotation.z=0.62;
  cut.rotation.y=0.18;
  group.add(cut);
  const slashGlow=mesh(new THREE.BoxGeometry(0.025,0.68,0.555,2,6,3),materials.glow,1.49,"glow-cut");
  slashGlow.rotation.copy(cut.rotation);
  slashGlow.position.x=0.035;
  group.add(slashGlow);
  group.add(mesh(new THREE.IcosahedronGeometry(0.07,2),materials.jewel,1.86,"jewel"));
  return group;
}

function createQueen(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,0.98);
  group.add(lathe([[0.31,0],[0.285,0.07],[0.235,0.16],[0.182,0.39],[0.147,0.68],[0.173,0.81],[0.248,0.89],[0.295,0.95],[0.252,1.01]],materials.primary,0.28));
  const collar=mesh(new THREE.TorusGeometry(0.272,0.047,14,60),materials.secondary,1.26,"collar"); collar.rotation.x=Math.PI/2; group.add(collar);
  const crownRing=mesh(new THREE.TorusGeometry(0.258,0.052,14,60),materials.glow,1.45,"glow-ring"); crownRing.rotation.x=Math.PI/2; group.add(crownRing);
  for(let index=0;index<10;index+=1){
    const angle=index*Math.PI/5;
    const point=mesh(new THREE.ConeGeometry(0.066,0.38,24,3),index%2?materials.primary:materials.secondary,1.65,"crown-point");
    point.position.set(Math.cos(angle)*0.248,1.65,Math.sin(angle)*0.248);
    point.rotation.z=-Math.cos(angle)*0.09;
    point.rotation.x=Math.sin(angle)*0.09;
    group.add(point);
    const jewel=mesh(new THREE.IcosahedronGeometry(0.048,2),materials.jewel,1.87,"jewel");
    jewel.position.set(Math.cos(angle)*0.248,1.87,Math.sin(angle)*0.248);
    group.add(jewel);
  }
  group.add(mesh(new THREE.IcosahedronGeometry(0.11,3),materials.jewel,1.68,"orb"));
  return group;
}

function createKing(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,1.02);
  group.add(lathe([[0.32,0],[0.295,0.07],[0.245,0.17],[0.192,0.43],[0.162,0.73],[0.192,0.85],[0.265,0.93],[0.315,0.99],[0.272,1.05]],materials.primary,0.28));
  const shoulder=mesh(new THREE.TorusGeometry(0.295,0.055,14,60),materials.secondary,1.32,"shoulder"); shoulder.rotation.x=Math.PI/2; group.add(shoulder);
  const crownBase=mesh(new THREE.CylinderGeometry(0.245,0.295,0.26,20,3),materials.primary,1.50,"crown"); crownBase.rotation.y=Math.PI/20; group.add(crownBase);
  addJewelStuds(group,materials,0.255,1.48,8,0.036);
  group.add(mesh(new THREE.IcosahedronGeometry(0.145,3),materials.jewel,1.73,"orb"));
  const vertical=mesh(new THREE.BoxGeometry(0.11,0.56,0.11,3,7,3),materials.primary,2.06,"cross");
  const horizontal=mesh(new THREE.BoxGeometry(0.45,0.11,0.11,7,3,3),materials.primary,2.09,"cross");
  vertical.rotation.y=Math.PI/4; horizontal.rotation.y=Math.PI/4; group.add(vertical,horizontal);
  const crossGlow=mesh(new THREE.BoxGeometry(0.035,0.49,0.14,2,5,2),materials.glow,2.06,"cross-glow"); crossGlow.rotation.y=Math.PI/4; group.add(crossGlow);
  return group;
}

function createKnight(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,1.0);
  group.add(lathe([[0.30,0],[0.275,0.08],[0.235,0.2],[0.22,0.36],[0.292,0.49],[0.325,0.55]],materials.primary,0.28,"pedestal"));
  const neckCurve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,0.77,0),new THREE.Vector3(-0.07,0.98,0.01),new THREE.Vector3(-0.15,1.19,0.03),new THREE.Vector3(-0.11,1.42,0.05),new THREE.Vector3(0.03,1.58,0.07),
  ]);
  const neck=mesh(new THREE.TubeGeometry(neckCurve,72,0.215,24,false),materials.primary,0,"neck"); neck.scale.z=0.9; group.add(neck);
  const chest=mesh(new THREE.IcosahedronGeometry(0.305,3),materials.secondary,0.83,"chest"); chest.scale.set(0.88,1.1,0.8); chest.position.x=-0.02; group.add(chest);
  const head=mesh(new THREE.IcosahedronGeometry(0.292,3),materials.primary,1.66,"head"); head.scale.set(1.18,0.84,0.84); head.position.x=0.13; head.rotation.z=-0.18; group.add(head);
  const muzzle=mesh(new THREE.CapsuleGeometry(0.135,0.30,12,24),materials.secondary,1.57,"muzzle"); muzzle.rotation.z=Math.PI/2-0.15; muzzle.position.x=0.39; muzzle.scale.z=0.77; group.add(muzzle);
  const cheek=mesh(new THREE.IcosahedronGeometry(0.18,2),materials.jewel,1.63,"cheek"); cheek.position.set(0.06,1.63,0.19); cheek.scale.set(1.22,0.92,0.46); group.add(cheek);
  for(const side of [-1,1]){
    const ear=mesh(new THREE.ConeGeometry(0.077,0.35,20,3),materials.primary,1.99,"ear"); ear.position.set(-0.02,1.99,side*0.125); ear.rotation.z=-0.12; ear.rotation.x=side*0.08; group.add(ear);
    const eye=mesh(new THREE.IcosahedronGeometry(0.038,2),materials.jewel,1.76,"eye"); eye.position.set(0.29,1.76,side*0.19); group.add(eye);
  }
  for(let index=0;index<9;index+=1){
    const mane=mesh(new THREE.ConeGeometry(0.058,0.24,16,2),index%2?materials.accent:materials.glow,1.19+index*0.098,"mane");
    mane.position.x=-0.205+index*0.011; mane.position.z=-0.03; mane.rotation.z=-Math.PI/2-0.12; group.add(mane);
  }
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
    fitPieceInsideCell(group,type);
    addContours(group,materials);
    fitPieceInsideCell(group,type);
    group.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(group);
    const size=bounds.getSize(new THREE.Vector3());
    const triangles=countObjectTriangles(group);
    group.userData.forgeVisualSource="forgemcp-premium-procedural-v3";
    group.userData.forgePremiumRevision=PREMIUM_REVISION;
    group.userData.forgePremiumType=type;
    group.userData.forgePremiumColor=color;
    group.userData.forgePremiumTriangles=triangles;
    this.stats.set(this.templateKey(type,color),{
      type,color,triangles,bounds:{x:size.x,y:size.y,z:size.z},
      finite:[size.x,size.y,size.z].every((value)=>Number.isFinite(value)&&value>0),revision:PREMIUM_REVISION,
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