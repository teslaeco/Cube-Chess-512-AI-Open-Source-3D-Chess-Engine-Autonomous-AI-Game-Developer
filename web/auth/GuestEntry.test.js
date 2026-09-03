import { describe, expect, it } from "vitest";
import { bootstrapGuestEntry, createDirectGuestIdentity } from "./GuestEntry.js";

describe("direct guest entry", () => {
  it("creates a bounded guest identity", () => {
    expect(createDirectGuestIdentity(() => "abc")).toEqual({
      mode: "guest",
      provider: "guest",
      playerId: "guest-link-abc",
      displayName: "Gość",
    });
  });

  it("boots guest mode from the public guest query without requiring auth", () => {
    const stored = new Map();
    const storage = {
      setItem(key, value) { stored.set(key, value); },
    };
    expect(bootstrapGuestEntry({ search: "?guest=1", storage, randomUUID: () => "forge" })).toBe(true);
    expect(JSON.parse(stored.get("cubeChessIdentity"))).toEqual({
      mode: "guest",
      provider: "guest",
      playerId: "guest-link-forge",
      displayName: "Gość",
    });
  });

  it("does not bypass auth without an explicit guest flag", () => {
    let wrote = false;
    const storage = { setItem() { wrote = true; } };
    expect(bootstrapGuestEntry({ search: "", storage, randomUUID: () => "unused" })).toBe(false);
    expect(wrote).toBe(false);
  });

  it("keeps the existing dev e2e guest behavior", () => {
    const stored = new Map();
    const storage = { setItem(key, value) { stored.set(key, value); } };
    expect(bootstrapGuestEntry({ search: "?e2e=1", storage, isDev: true })).toBe(true);
    expect(JSON.parse(stored.get("cubeChessIdentity")).playerId).toBe("guest-e2e");
  });
});
