import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  OpenSourceStauntonPieceSet,
  ForgeMcpPremiumPieceSet,
  OPEN_SOURCE_STAUNTON_SAFE_FIT,
  OPEN_SOURCE_STAUNTON_REVISION,
  countObjectTriangles,
  countUniquePieceResources,
} from "./ForgeMcpPremiumPieceSet.js";
import { getRoleTextureV14 } from "./OpenSourceStauntonV14PieceSet.js";

const TYPES = ["pawn", "rook", "knight", "bishop", "queen", "king"];
const HEIGHT_ORDER = ["king", "queen", "bishop", "knight", "rook", "pawn"];
function rolesOf(object) { const roles=[]; object.traverse((child)=>{ if(child.userData?.openSourceStauntonRole) roles.push(child.userData.openSourceStauntonRole); }); return roles; }
function objectWithRole(object, role) { let match=null; object.traverse((child)=>{ if(!match&&child.userData?.openSourceStauntonRole===role) match=child; }); return match; }

describe("Normal public open-source carved polyhedral Staunton v14 set", () => {
  it.each(TYPES)("builds %s inside one strict 512-cell envelope", (type) => {
    const set=new OpenSourceStauntonPieceSet(); const object=set.create(type,"white"); object.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(object), size=bounds.getSize(new THREE.Vector3()), envelope=OPEN_SOURCE_STAUNTON_SAFE_FIT[type], triangles=countObjectTriangles(object);
    expect([size.x,size.y,size.z].every(Number.isFinite)).toBe(true); expect(Math.min(size.x,size.y,size.z)).toBeGreaterThan(0); expect(bounds.min.y).toBeGreaterThanOrEqual(-1e-6);
    expect(size.y).toBeLessThanOrEqual(envelope.maxHeight+1e-6); expect(size.x).toBeLessThanOrEqual(envelope.maxFootprint+1e-6); expect(size.z).toBeLessThanOrEqual(envelope.maxFootprint+1e-6);
    expect(triangles).toBeGreaterThan(1500); expect(triangles).toBeLessThan(30000); expect(object.userData.referenceAssetsPolicy).toBe("reference-only-not-runtime"); expect(object.userData.forgeVisualSource).toBe("open-source-staunton-v14-carved-polyhedral");
  });

  it("preserves classical descending height hierarchy", () => {
    const set=new OpenSourceStauntonPieceSet(); const heights=Object.fromEntries(TYPES.map((type)=>{const o=set.create(type,"white");o.updateMatrixWorld(true);return [type,new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).y];}));
    for(let i=0;i<HEIGHT_ORDER.length-1;i+=1) expect(heights[HEIGHT_ORDER[i]]).toBeGreaterThan(heights[HEIGHT_ORDER[i+1]]);
  });

  it("sculpts knight with continuous horse silhouette, actual cutout and one mane", () => {
    const roles=rolesOf(new OpenSourceStauntonPieceSet().create("knight","black"));
    expect(roles).toContain("knight-base-support"); expect(roles).toContain("knight-sculpt"); expect(roles).toContain("knight-jaw"); expect(roles.filter(r=>r==="knight-ear")).toHaveLength(2); expect(roles.filter(r=>r==="knight-eye")).toHaveLength(2); expect(roles).toContain("knight-nostril"); expect(roles.filter(r=>r==="knight-mane")).toHaveLength(1); expect(roles).toContain("knight-cheek-engraving");
  });

  it("models bishop as carved body with two mitre lobes and diagonal slit", () => {
    const roles=rolesOf(new OpenSourceStauntonPieceSet().create("bishop","white"));
    expect(roles).toContain("bishop-carved-body"); expect(roles).toContain("bishop-mitre-left"); expect(roles).toContain("bishop-mitre-right"); expect(roles).toContain("bishop-slit"); expect(roles).toContain("bishop-gem"); expect(roles.filter(r=>r==="bishop-body-engraving")).toHaveLength(6);
  });

  it("uses real engraved, recessed and embossed geometric details on major pieces", () => {
    const set=new OpenSourceStauntonPieceSet();
    const rook=rolesOf(set.create("rook","black")), queen=rolesOf(set.create("queen","black")), king=rolesOf(set.create("king","black"));
    expect(rook.filter(r=>r==="rook-battlement")).toHaveLength(8); expect(rook).toContain("rook-recess-cut"); expect(rook.filter(r=>r==="rook-vertical-engraving")).toHaveLength(8);
    expect(queen.filter(r=>r==="queen-crown-point")).toHaveLength(8); expect(queen.filter(r=>r==="queen-engraved-flute")).toHaveLength(8);
    expect(king.filter(r=>r==="king-engraved-flute")).toHaveLength(8); expect(king).toContain("king-crown-support"); expect(king).toContain("king-cross"); expect(king).toContain("king-cross-inlay");
  });

  it("creates twelve compact role-specific color maps", () => {
    const textures=[]; for(const side of ["white","black"]) for(const type of TYPES){const texture=getRoleTextureV14(type,side);textures.push(texture);expect(texture.image.width).toBe(128);expect(texture.image.height).toBe(128);expect(texture.userData.type).toBe(type);expect(texture.userData.side).toBe(side);} expect(new Set(textures.map(t=>t.uuid)).size).toBe(12);
  });

  it("keeps the black role texture bright enough to preserve carved detail", () => {
    const data=getRoleTextureV14("knight","black").image.data; let total=0;
    for(let index=0;index<data.length;index+=4) total+=(data[index]+data[index+1]+data[index+2])/3;
    expect(total/(data.length/4)).toBeGreaterThan(95);
  });

  it("keeps PBR resources and triangle budgets bounded", () => {
    const set=new OpenSourceStauntonPieceSet(); for(const side of ["white","black"]) for(const type of TYPES){const object=set.create(type,side);expect(countObjectTriangles(object)).toBeLessThan(30000);const resources=countUniquePieceResources(object);expect(resources.meshes).toBeGreaterThan(0);expect(resources.uniqueMaterials).toBeLessThanOrEqual(4);expect(resources.uniqueTextures).toBeGreaterThanOrEqual(1);}
  });

  it("keeps fitted model transforms below an identity runtime root", () => {
    const object=new OpenSourceStauntonPieceSet().create("queen","white");
    expect(object.position.toArray()).toEqual([0,0,0]); expect(object.scale.toArray()).toEqual([1,1,1]);
    expect(object.children).toHaveLength(1); expect(object.children[0].scale.x).not.toBe(1);
    const before=new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()); object.position.set(3,4,5); object.scale.setScalar(1.1); object.updateMatrixWorld(true);
    const after=new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()); expect(after.y).toBeCloseTo(before.y*1.1,6);
  });

  it("shares cached geometry while isolating per-piece material highlights", () => {
    const set=new OpenSourceStauntonPieceSet(), first=set.create("rook","white"), second=set.create("rook","white");
    const firstBody=objectWithRole(first,"rook-carved-tower"), secondBody=objectWithRole(second,"rook-carved-tower");
    expect(firstBody.geometry).toBe(secondBody.geometry); expect(firstBody.geometry.userData.forgeSharedPieceGeometry).toBe(true);
    expect(firstBody.material).not.toBe(secondBody.material); expect(firstBody.material.userData.forgePieceInstanceMaterial).toBe(true);
    firstBody.material.emissive.setHex(0x2f7dff); expect(secondBody.material.emissive.getHex()).not.toBe(0x2f7dff);
  });

  it("orients radial details and profile sculptures on their authored axes", () => {
    const set=new OpenSourceStauntonPieceSet();
    const rook=set.create("rook","white"), knight=set.create("knight","white"), bishop=set.create("bishop","white"), king=set.create("king","white");
    expect(objectWithRole(rook,"rook-vertical-engraving").rotation.y).toBeCloseTo(Math.PI/2,8);
    expect(objectWithRole(rook,"rook-battlement").rotation.y).toBeCloseTo(Math.PI/2,8);
    expect(objectWithRole(knight,"knight-sculpt").rotation.y).toBeCloseTo(0,8);
    expect(objectWithRole(knight,"knight-sculpt").position.y).toBeGreaterThan(1);
    expect(objectWithRole(bishop,"bishop-slit").rotation.y).toBeCloseTo(0,8);
    expect(Math.abs(objectWithRole(bishop,"bishop-slit").rotation.z)).toBeGreaterThan(0.4);
    expect(objectWithRole(king,"king-cross").rotation.y).toBeCloseTo(0,8);
  });

  it("reports v14 as the free normal runtime source", () => {
    const set=new OpenSourceStauntonPieceSet(); expect(OPEN_SOURCE_STAUNTON_REVISION).toContain("staunton-v14-carved-polyhedral");
    for(const item of set.inspectAll()){expect(item.runtimePrimarySource).toBe("open-source-staunton-v14-carved-polyhedral");expect(item.referenceAssetsPolicy).toBe("reference-only-not-runtime");expect(item.freeForPublicRenderer).toBe(true);expect(item.triangles).toBeLessThan(30000);expect(item.finite).toBe(true);expect(item.fitsLevel).toBe(true);expect(item.fitsCell).toBe(true);expect(item.bounds.y).toBeLessThanOrEqual(OPEN_SOURCE_STAUNTON_SAFE_FIT[item.type].maxHeight+1e-6);}
  });

  it("keeps historical WebMCP constructor on the same free v14 source", () => { const compatible=new ForgeMcpPremiumPieceSet(); expect(compatible.inspect("pawn").runtimePrimarySource).toBe("open-source-staunton-v14-carved-polyhedral"); });
});
