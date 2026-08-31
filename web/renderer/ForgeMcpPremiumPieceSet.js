import * as THREE from "three";
import { fitPieceInsideCell } from "./PieceGeometryFactory.js";

const LATHE_SEGMENTS = 96;
const TORUS_RADIAL = 20;
const TORUS_TUBULAR = 72;
const PREMIUM_REVISION = "2026-08-31-premium-v1";

function makePhysical(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: options.metalness ?? 0.28,
    roughness: options.roughness ?? 0.2,
    clearcoat: options.clearcoat ?? 0.82,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.14,
    reflectivity: options.reflectivity ?? 0.74,
  });
}

function createMaterialSet(color) {
  if (color === "white") {
    return {
      primary: makePhysical(0xf0eadf, { metalness: 0.16, roughness: 0.19, clearcoat: 0.9 }),
      secondary: makePhysical(0xd7ccb8, { metalness: 0.34, roughness: 0.23 }),
      accent: makePhysical(0xb99542, { metalness: 0.8, roughness: 0.2, clearcoat: 0.55 }),
      dark: makePhysical(0x37322d, { metalness: 0.5, roughness: 0.28 }),
      outline: 0x1b2430,
    };
  }
  return {
    primary: makePhysical(0x252b35, { metalness: 0.62, roughness: 0.17, clearcoat: 0.9 }),
    secondary: makePhysical(0x4a515d, { metalness: 0.72, roughness: 0.2 }),
    accent: makePhysical(0xb56b3e, { metalness: 0.82, roughness: 0.21, clearcoat: 0.55 }),
    dark: makePhysical(0x0f141b, { metalness: 0.5, roughness: 0.25 }),
    outline: 0xd2d9e3,
  };
}

function markMesh(mesh, role = "surface") {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.forgePremiumRole = role;
  return mesh;
}

function mesh(geometry, material, y = 0, role = "surface") {
  const result = markMesh(new THREE.Mesh(geometry, material), role);
  result.position.y = y;
  return result;
}

function lathe(profile, material, y = 0, role = "surface") {
  return mesh(
    new THREE.LatheGeometry(
      profile.map(([radius, height]) => new THREE.Vector2(radius, height)),
      LATHE_SEGMENTS,
    ),
    material,
    y,
    role,
  );
}

function addOutline(group, outlineColor) {
  const sourceMeshes = [];
  group.traverse((child) => {
    if (child.isMesh && !child.userData.decorative) sourceMeshes.push(child);
  });
  for (const child of sourceMeshes) {
    const outline = new THREE.Mesh(
      child.geometry,
      new THREE.MeshBasicMaterial({
        color: outlineColor,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    );
    outline.position.copy(child.position);
    outline.rotation.copy(child.rotation);
    outline.scale.copy(child.scale).multiplyScalar(1.012);
    outline.renderOrder = 30;
    outline.userData.decorative = true;
    child.parent.add(outline);
  }
}

function addPremiumBase(group, materials, footprint = 1) {
  group.add(lathe([
    [0.0, 0.0],
    [0.34 * footprint, 0.0],
    [0.47 * footprint, 0.045],
    [0.51 * footprint, 0.09],
    [0.49 * footprint, 0.14],
    [0.42 * footprint, 0.19],
    [0.37 * footprint, 0.24],
    [0.35 * footprint, 0.31],
  ], materials.primary));
  group.add(lathe([
    [0.34 * footprint, 0.0],
    [0.37 * footprint, 0.025],
    [0.35 * footprint, 0.055],
  ], materials.accent, 0.13, "accent"));
  const footRing = mesh(
    new THREE.TorusGeometry(0.405 * footprint, 0.027, TORUS_RADIAL, TORUS_TUBULAR),
    materials.secondary,
    0.215,
    "trim",
  );
  footRing.rotation.x = Math.PI / 2;
  group.add(footRing);
}

function addFacetBand(group, material, radius, y, height = 0.07, segments = 12) {
  const band = mesh(new THREE.CylinderGeometry(radius, radius * 1.02, height, segments), material, y, "facet-band");
  band.rotation.y = Math.PI / segments;
  group.add(band);
}

function createPawn(materials) {
  const group = new THREE.Group();
  addPremiumBase(group, materials, 0.93);
  group.add(lathe([
    [0.31, 0], [0.29, 0.05], [0.24, 0.12], [0.20, 0.25], [0.165, 0.45],
    [0.17, 0.56], [0.23, 0.63], [0.25, 0.68], [0.205, 0.73],
  ], materials.primary, 0.27));
  addFacetBand(group, materials.secondary, 0.245, 0.96, 0.075, 12);
  const neckRing = mesh(new THREE.TorusGeometry(0.205, 0.026, 18, 64), materials.accent, 1.015, "accent");
  neckRing.rotation.x = Math.PI / 2;
  group.add(neckRing);
  const head = mesh(new THREE.IcosahedronGeometry(0.235, 3), materials.primary, 1.255, "head");
  head.scale.y = 1.04;
  group.add(head);
  const crownCap = mesh(new THREE.IcosahedronGeometry(0.073, 2), materials.accent, 1.49, "accent");
  group.add(crownCap);
  return group;
}

function createRook(materials) {
  const group = new THREE.Group();
  addPremiumBase(group, materials, 1.0);
  group.add(lathe([
    [0.31,0],[0.29,0.08],[0.25,0.18],[0.225,0.43],[0.22,0.67],[0.26,0.78],[0.32,0.84]
  ], materials.primary, 0.28));
  addFacetBand(group, materials.secondary, 0.29, 0.83, 0.08, 12);
  const upperRing = mesh(new THREE.TorusGeometry(0.325,0.035,18,72),materials.accent,1.095,"accent");
  upperRing.rotation.x=Math.PI/2;
  group.add(upperRing);
  const crown = mesh(new THREE.CylinderGeometry(0.36,0.34,0.17,16),materials.primary,1.185,"crown");
  crown.rotation.y=Math.PI/16;
  group.add(crown);
  const recess = mesh(new THREE.CylinderGeometry(0.255,0.255,0.11,16),materials.dark,1.29,"recess");
  recess.rotation.y=Math.PI/16;
  group.add(recess);
  for(let index=0;index<8;index+=1){
    const angle=index*Math.PI/4;
    const block=mesh(new THREE.BoxGeometry(0.17,0.23,0.17),materials.primary,1.39,"battlement");
    block.position.x=Math.cos(angle)*0.285;
    block.position.z=Math.sin(angle)*0.285;
    block.rotation.y=-angle+Math.PI/4;
    group.add(block);
  }
  return group;
}

function createBishop(materials) {
  const group = new THREE.Group();
  addPremiumBase(group, materials, 0.95);
  group.add(lathe([
    [0.30,0],[0.27,0.07],[0.22,0.16],[0.18,0.34],[0.145,0.58],[0.17,0.72],
    [0.235,0.80],[0.27,0.85],[0.215,0.91]
  ],materials.primary,0.28));
  addFacetBand(group,materials.secondary,0.235,1.13,0.07,12);
  const mitre = mesh(new THREE.OctahedronGeometry(0.31,3),materials.primary,1.43,"mitre");
  mitre.scale.set(0.82,1.34,0.82);
  mitre.rotation.y=Math.PI/4;
  group.add(mitre);
  const cut = mesh(new THREE.BoxGeometry(0.075,0.72,0.52),materials.dark,1.46,"bishop-cut");
  cut.rotation.z=0.62;
  cut.rotation.y=0.17;
  group.add(cut);
  const tip=mesh(new THREE.IcosahedronGeometry(0.065,2),materials.accent,1.82,"accent");
  group.add(tip);
  return group;
}

function createQueen(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,0.98);
  group.add(lathe([
    [0.31,0],[0.28,0.07],[0.23,0.16],[0.18,0.39],[0.145,0.68],[0.17,0.80],
    [0.245,0.88],[0.29,0.94],[0.25,1.0]
  ],materials.primary,0.28));
  const collar=mesh(new THREE.TorusGeometry(0.27,0.045,20,80),materials.secondary,1.25,"collar");
  collar.rotation.x=Math.PI/2;
  group.add(collar);
  const crownRing=mesh(new THREE.TorusGeometry(0.255,0.05,20,80),materials.accent,1.43,"accent");
  crownRing.rotation.x=Math.PI/2;
  group.add(crownRing);
  for(let index=0;index<10;index+=1){
    const angle=index*Math.PI/5;
    const point=mesh(new THREE.ConeGeometry(0.062,0.36,18),index%2?materials.primary:materials.secondary,1.62,"crown-point");
    point.position.x=Math.cos(angle)*0.245;
    point.position.z=Math.sin(angle)*0.245;
    point.rotation.z=-Math.cos(angle)*0.08;
    point.rotation.x=Math.sin(angle)*0.08;
    group.add(point);
    const jewel=mesh(new THREE.IcosahedronGeometry(0.045,2),materials.accent,1.82,"jewel");
    jewel.position.x=Math.cos(angle)*0.245;
    jewel.position.z=Math.sin(angle)*0.245;
    group.add(jewel);
  }
  const orb=mesh(new THREE.IcosahedronGeometry(0.105,3),materials.accent,1.66,"orb");
  group.add(orb);
  return group;
}

function createKing(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,1.02);
  group.add(lathe([
    [0.32,0],[0.29,0.07],[0.24,0.17],[0.19,0.43],[0.16,0.73],[0.19,0.84],
    [0.26,0.92],[0.31,0.98],[0.27,1.04]
  ],materials.primary,0.28));
  const shoulder=mesh(new THREE.TorusGeometry(0.29,0.052,20,80),materials.secondary,1.31,"shoulder");
  shoulder.rotation.x=Math.PI/2;
  group.add(shoulder);
  const crownBase=mesh(new THREE.CylinderGeometry(0.24,0.29,0.25,12),materials.primary,1.48,"crown");
  crownBase.rotation.y=Math.PI/12;
  group.add(crownBase);
  const orb=mesh(new THREE.IcosahedronGeometry(0.14,3),materials.accent,1.70,"orb");
  group.add(orb);
  const vertical=mesh(new THREE.BoxGeometry(0.105,0.53,0.105,2,4,2),materials.primary,2.03,"cross");
  const horizontal=mesh(new THREE.BoxGeometry(0.43,0.105,0.105,4,2,2),materials.primary,2.06,"cross");
  vertical.rotation.y=Math.PI/4;
  horizontal.rotation.y=Math.PI/4;
  group.add(vertical,horizontal);
  return group;
}

function createKnight(materials) {
  const group=new THREE.Group();
  addPremiumBase(group,materials,1.0);
  const pedestal=lathe([
    [0.30,0],[0.27,0.08],[0.23,0.2],[0.22,0.36],[0.29,0.48],[0.32,0.54]
  ],materials.primary,0.28,"pedestal");
  group.add(pedestal);

  const neckCurve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,0.77,0),
    new THREE.Vector3(-0.06,0.96,0.01),
    new THREE.Vector3(-0.14,1.17,0.03),
    new THREE.Vector3(-0.10,1.39,0.05),
    new THREE.Vector3(0.02,1.55,0.07),
  ]);
  const neck=mesh(new THREE.TubeGeometry(neckCurve,64,0.21,20,false),materials.primary,0,"neck");
  neck.scale.z=0.9;
  group.add(neck);

  const chest=mesh(new THREE.IcosahedronGeometry(0.30,3),materials.secondary,0.82,"chest");
  chest.scale.set(0.86,1.08,0.78);
  chest.position.x=-0.02;
  group.add(chest);

  const head=mesh(new THREE.IcosahedronGeometry(0.285,3),materials.primary,1.62,"head");
  head.scale.set(1.16,0.82,0.82);
  head.position.x=0.12;
  head.rotation.z=-0.18;
  group.add(head);

  const muzzle=mesh(new THREE.CapsuleGeometry(0.13,0.28,10,20),materials.secondary,1.54,"muzzle");
  muzzle.rotation.z=Math.PI/2-0.15;
  muzzle.position.x=0.37;
  muzzle.scale.z=0.76;
  group.add(muzzle);

  const cheek=mesh(new THREE.OctahedronGeometry(0.17,2),materials.accent,1.60,"cheek");
  cheek.position.set(0.05,1.60,0.18);
  cheek.scale.set(1.2,0.9,0.45);
  group.add(cheek);

  for(const side of [-1,1]){
    const ear=mesh(new THREE.ConeGeometry(0.075,0.33,14),materials.primary,1.94,"ear");
    ear.position.set(-0.02,1.94,side*0.12);
    ear.rotation.z=-0.12;
    ear.rotation.x=side*0.08;
    group.add(ear);
  }

  for(let index=0;index<7;index+=1){
    const mane=mesh(new THREE.ConeGeometry(0.055,0.22,12),materials.accent,1.22+index*0.105,"mane");
    mane.position.x=-0.19+index*0.012;
    mane.position.z=-0.02;
    mane.rotation.z=-Math.PI/2-0.12;
    group.add(mane);
  }

  const eyeMaterial=materials.dark;
  for(const side of [-1,1]){
    const eye=mesh(new THREE.IcosahedronGeometry(0.035,2),eyeMaterial,1.72,"eye");
    eye.position.set(0.27,1.72,side*0.18);
    group.add(eye);
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

function cloneTemplate(template) {
  const clone=template.clone(true);
  clone.traverse((child)=>{
    if(!child.isMesh) return;
    child.geometry=child.geometry.clone();
    if(Array.isArray(child.material)) child.material=child.material.map((material)=>material.clone());
    else child.material=child.material.clone();
  });
  return clone;
}

export class ForgeMcpPremiumPieceSet {
  constructor(){
    this.templates=new Map();
    this.stats=new Map();
  }

  templateKey(type,color){return `${type}:${color}`;}

  buildTemplate(type,color){
    const builder=BUILDERS[type]??BUILDERS.pawn;
    const materials=createMaterialSet(color);
    const group=builder(materials);
    group.name=`${color}-${type}-forgemcp-premium-template`;
    fitPieceInsideCell(group,type);
    addOutline(group,materials.outline);
    group.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(group);
    const size=bounds.getSize(new THREE.Vector3());
    const triangles=countObjectTriangles(group);
    group.userData.forgeVisualSource="forgemcp-premium-procedural";
    group.userData.forgePremiumRevision=PREMIUM_REVISION;
    group.userData.forgePremiumType=type;
    group.userData.forgePremiumColor=color;
    group.userData.forgePremiumTriangles=triangles;
    this.stats.set(this.templateKey(type,color),{
      type,color,triangles,
      bounds:{x:size.x,y:size.y,z:size.z},
      finite:[size.x,size.y,size.z].every((value)=>Number.isFinite(value)&&value>0),
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

  inspectAll(){
    return Object.keys(BUILDERS).map((type)=>this.inspect(type,"white"));
  }
}

export const FORGEMCP_PREMIUM_REVISION=PREMIUM_REVISION;
