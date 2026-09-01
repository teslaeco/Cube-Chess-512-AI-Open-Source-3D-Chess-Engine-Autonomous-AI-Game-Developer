import { describe, expect, it } from "vitest";
import { OpenSourceStauntonV13RefinedPieceSet } from "./OpenSourceStauntonV13RefinedPieceSet.js";

function rolesOf(object) {
  const roles = [];
  object.traverse((child) => {
    const role = child.userData?.openSourceStauntonRole;
    if (role) roles.push(role);
  });
  return roles;
}

describe("verified closeup reference refinement", () => {
  it("rebuilds knight as one smooth horse body with short muzzle, ears and carved mane", () => {
    const knight = new OpenSourceStauntonV13RefinedPieceSet().create("knight", "white");
    const roles = rolesOf(knight);
    expect(roles.filter((role) => role === "knight-sculpt")).toHaveLength(1);
    expect(roles.filter((role) => role === "knight-muzzle-refined")).toHaveLength(1);
    expect(roles.filter((role) => role === "knight-jaw")).toHaveLength(1);
    expect(roles.filter((role) => role === "knight-ear")).toHaveLength(2);
    expect(roles.filter((role) => role === "knight-eye")).toHaveLength(2);
    expect(roles.filter((role) => role === "knight-nostril")).toHaveLength(1);
    expect(roles.filter((role) => role === "knight-mane-ridge-detail")).toHaveLength(6);
    expect(roles.filter((role) => role === "knight-mane")).toHaveLength(1);
    expect(roles.filter((role) => role === "knight-mane-trim")).toHaveLength(1);
  });

  it("rebuilds bishop head as rounded mitre lobes with one narrow slit", () => {
    const bishop = new OpenSourceStauntonV13RefinedPieceSet().create("bishop", "black");
    const roles = rolesOf(bishop);
    expect(roles.filter((role) => role === "bishop-mitre-left")).toHaveLength(1);
    expect(roles.filter((role) => role === "bishop-mitre-right")).toHaveLength(1);
    expect(roles.filter((role) => role === "bishop-slit")).toHaveLength(1);
    expect(roles).toContain("bishop-mitre-tip");
  });

  it("adds architectural and royal crown structure without changing chess identity", () => {
    const set = new OpenSourceStauntonV13RefinedPieceSet();
    expect(rolesOf(set.create("rook", "black")).filter((role) => role === "rook-crown-buttress")).toHaveLength(8);
    expect(rolesOf(set.create("queen", "white"))).toContain("queen-crown-bowl");
    expect(rolesOf(set.create("queen", "white")).filter((role) => role === "queen-crown-point")).toHaveLength(8);
    expect(rolesOf(set.create("king", "black"))).toContain("king-crown-cap-refine");
    expect(rolesOf(set.create("king", "black"))).toContain("king-cross-trim-v");
    expect(rolesOf(set.create("king", "black"))).toContain("king-cross-trim-h");
  });

  it("keeps the refined runtime within the existing hard budgets", () => {
    const set = new OpenSourceStauntonV13RefinedPieceSet();
    for (const type of ["pawn", "rook", "knight", "bishop", "queen", "king"]) {
      const stat = set.inspect(type, "white");
      expect(stat.visualQaPass).toBe("verified-closeup-reference-refinement");
      expect(stat.triangles).toBeLessThan(30000);
      expect(stat.fitsCell).toBe(true);
      expect(stat.fitsLevel).toBe(true);
    }
  });
});
