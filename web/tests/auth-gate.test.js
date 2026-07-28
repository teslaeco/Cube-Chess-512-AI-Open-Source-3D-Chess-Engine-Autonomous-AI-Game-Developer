import { describe, expect, it } from "vitest";
import { createGuestIdentity, parseStoredIdentity } from "../auth/AuthGate.js";

describe("startup authentication identity", () => {
  it("creates a deterministic temporary guest identity", () => {
    expect(createGuestIdentity(() => "guest-test-id")).toEqual({
      mode: "guest",
      provider: "guest",
      playerId: "guest-guest-test-id",
      displayName: "Gość",
    });
  });

  it("parses valid stored identities and rejects malformed data", () => {
    const identity = {
      mode: "guest",
      provider: "guest",
      playerId: "guest-123",
      displayName: "Gość",
    };

    expect(parseStoredIdentity(JSON.stringify(identity))).toEqual(identity);
    expect(parseStoredIdentity("not-json")).toBeNull();
    expect(parseStoredIdentity(JSON.stringify({ mode: "guest" }))).toBeNull();
    expect(parseStoredIdentity(JSON.stringify({ mode: "invalid", playerId: "x" }))).toBeNull();
  });
});
