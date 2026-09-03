import { describe, expect, it } from "vitest";
import { createGuestIdentity, isDirectGuestEntry, parseStoredIdentity } from "../auth/AuthGate.js";

describe("startup authentication identity", () => {
  it("creates a deterministic temporary guest identity", () => {
    expect(createGuestIdentity(() => "guest-test-id")).toEqual({
      mode: "guest",
      provider: "guest",
      playerId: "guest-guest-test-id",
      displayName: "Guest",
    });
  });

  it("parses valid stored identities and rejects malformed data", () => {
    const identity = {
      mode: "guest",
      provider: "guest",
      playerId: "guest-123",
      displayName: "Guest",
    };

    expect(parseStoredIdentity(JSON.stringify(identity))).toEqual(identity);
    expect(parseStoredIdentity("not-json")).toBeNull();
    expect(parseStoredIdentity(JSON.stringify({ mode: "guest" }))).toBeNull();
    expect(parseStoredIdentity(JSON.stringify({ mode: "invalid", playerId: "x" }))).toBeNull();
  });

  it("recognizes only explicit ForgeMCP guest entry URLs", () => {
    expect(isDirectGuestEntry({ pathname: "/guest.html", search: "" })).toBe(true);
    expect(isDirectGuestEntry({ pathname: "/", search: "?guest=1" })).toBe(true);
    expect(isDirectGuestEntry({ pathname: "/", search: "?guest=0" })).toBe(false);
    expect(isDirectGuestEntry({ pathname: "/", search: "" })).toBe(false);
    expect(isDirectGuestEntry({ pathname: "/login", search: "?next=guest.html" })).toBe(false);
  });
});
