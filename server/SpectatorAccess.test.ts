import { describe, expect, it } from "vitest";
import { SpectatorAccess, spectatorSnapshot } from "./SpectatorAccess.js";

describe("SpectatorAccess", () => {
  it("admits a valid spectator and tracks departures", () => {
    const access = new SpectatorAccess();

    expect(access.admit("viewer_1")).toEqual({ accepted: true, spectatorId: "viewer_1" });
    expect(access.has("viewer_1")).toBe(true);
    expect(access.count()).toBe(1);
    expect(access.leave("viewer_1")).toBe(true);
    expect(access.count()).toBe(0);
  });

  it("rejects malformed and duplicate spectator identifiers", () => {
    const access = new SpectatorAccess();

    expect(access.admit("bad spectator")).toEqual({ accepted: false, reason: "invalid-id" });
    expect(access.admit("viewer-2")).toEqual({ accepted: true, spectatorId: "viewer-2" });
    expect(access.admit("viewer-2")).toEqual({ accepted: false, reason: "already-watching" });
  });

  it("requires the room spectator token when configured", () => {
    const access = new SpectatorAccess({ accessToken: "abcdefghijklmnop" });

    expect(access.admit("viewer_3")).toEqual({ accepted: false, reason: "invalid-token" });
    expect(access.admit("viewer_3", "wrong-token-value")).toEqual({ accepted: false, reason: "invalid-token" });
    expect(access.admit("viewer_3", "abcdefghijklmnop")).toEqual({ accepted: true, spectatorId: "viewer_3" });
  });

  it("enforces room capacity", () => {
    const access = new SpectatorAccess({ maxSpectators: 1 });

    expect(access.admit("viewer_a").accepted).toBe(true);
    expect(access.admit("viewer_b")).toEqual({ accepted: false, reason: "room-full" });
  });

  it("rejects unsafe configuration", () => {
    expect(() => new SpectatorAccess({ maxSpectators: -1 })).toThrow();
    expect(() => new SpectatorAccess({ maxSpectators: 257 })).toThrow();
    expect(() => new SpectatorAccess({ accessToken: "short" })).toThrow();
  });
});

describe("spectatorSnapshot", () => {
  it("creates a server-owned read-only event envelope", () => {
    expect(spectatorSnapshot({ sequence: 7 }, 2)).toEqual({
      type: "spectator-state",
      state: { sequence: 7 },
      spectatorCount: 2,
    });
  });

  it("rejects invalid counts", () => {
    expect(() => spectatorSnapshot({}, -1)).toThrow();
    expect(() => spectatorSnapshot({}, 1.5)).toThrow();
  });
});
