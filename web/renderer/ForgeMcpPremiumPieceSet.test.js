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
    expect(roles).toContain("knight-sculpt"); expect(roles).toContain("knight-jaw"); expect(roles.filter(r=>r==="knight-ear")).toHaveLength(2); expect(roles.filter(r=>r==="knight-eye")).toHaveLength(2); expect(roles).toContain("knight-nostril"); expect(roles.filter(r=>r==="knight-mane")).toHaveLength(1); expect(roles).toContain("knight-cheek-engraving");
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
    expect(king.filter(r=>r==="king-engraved-flute")).toHaveLength(8); expect(king).toContain("king-cross"); expect(king).toContain("king-cross-inlay");
  });

  it("creates twelve compact role-specific color maps", () => {
    const textures=[]; for(const side of ["white","black"]) for(const type of TYPES){const texture=getRoleTextureV14(type,side);textures.push(texture);expect(texture.image.width).toBe(128);expect(texture.image.height).toBe(128);expect(texture.userData.type).toBe(type);expect(texture.userData.side).toBe(side);} expect(new Set(textures.map(t=>t.uuid)).size).toBe(12);
  });

  it("keeps PBR resources and triangle budgets bounded", () => {
    const set=new OpenSourceStauntonPieceSet(); for(const side of ["white","black"]) for(const type of TYPES){const object=set.create(type,side);expect(countObjectTriangles(object)).toBeLessThan(30000);const resources=countUniquePieceResources(object);expect(resources.meshes).toBeGreaterThan(0);expect(resources.uniqueMaterials).toBeLessThanOrEqual(4);expect(resources.uniqueTextures).toBeGreaterThanOrEqual(1);}
  });

  it("reports v14 as the free normal runtime source", () => {
    const set=new OpenSourceStauntonPieceSet(); expect(OPEN_SOURCE_STAUNTON_REVISION).toContain("staunton-v14-carved-polyhedral");
    for(const item of set.inspectAll()){expect(item.runtimePrimarySource).toBe("open-source-staunton-v14-carved-polyhedral");expect(item.referenceAssetsPolicy).toBe("reference-only-not-runtime");expect(item.freeForPublicRenderer).toBe(true);expect(item.triangles).toBeLessThan(30000);expect(item.finite).toBe(true);expect(item.fitsLevel).toBe(true);expect(item.fitsCell).toBe(true);expect(item.bounds.y).toBeLessThanOrEqual(OPEN_SOURCE_STAUNTON_SAFE_FIT[item.type].maxHeight+1e-6);}
  });

  it("keeps historical WebMCP constructor on the same free v14 source", () => { const compatible=new ForgeMcpPremiumPieceSet(); expect(compatible.inspect("pawn").runtimePrimarySource).toBe("open-source-staunton-v14-carved-polyhedral"); });
});
