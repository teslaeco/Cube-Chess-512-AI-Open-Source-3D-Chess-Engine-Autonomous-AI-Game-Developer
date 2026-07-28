import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "../auth/AuthGate.js";

describe("startup authentication gate", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("blocks the game until the user chooses a login method or guest mode", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const authenticated = vi.fn();
    const gate = new AuthGate(root, authenticated);

    expect(root.querySelector("[data-auth='google']")).not.toBeNull();
    expect(root.querySelector("[data-auth='apple']")).not.toBeNull();
    expect(root.querySelector("[data-auth='guest']")).not.toBeNull();
    expect(authenticated).not.toHaveBeenCalled();
    expect(gate.element.classList.contains("auth-gate-hidden")).toBe(false);

    gate.dispose();
  });

  it("starts a temporary session when the player chooses guest mode", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "guest-test-id" });
    const root = document.createElement("main");
    document.body.append(root);
    const authenticated = vi.fn();
    const gate = new AuthGate(root, authenticated);

    root.querySelector("[data-auth='guest']").click();

    expect(authenticated).toHaveBeenCalledWith({
      mode: "guest",
      provider: "guest",
      playerId: "guest-guest-test-id",
      displayName: "Gość",
    });
    expect(gate.element.classList.contains("auth-gate-hidden")).toBe(true);
    expect(JSON.parse(sessionStorage.getItem("cubeChessIdentity"))).toMatchObject({
      mode: "guest",
      playerId: "guest-guest-test-id",
    });

    gate.dispose();
  });
});
