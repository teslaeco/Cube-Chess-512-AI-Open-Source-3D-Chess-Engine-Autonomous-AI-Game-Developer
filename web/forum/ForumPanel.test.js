import { describe, expect, it } from "vitest";
import { canAccessForum, forumCategory } from "./ForumPanel.js";

describe("account-only forum access", () => {
  it("allows authenticated accounts", () => {
    expect(canAccessForum({ mode: "account", playerId: "user-1" })).toBe(true);
  });

  it.each([
    null,
    { mode: "guest", playerId: "guest-1" },
    { mode: "account", playerId: "" },
  ])("rejects guests and incomplete identities", (identity) => {
    expect(canAccessForum(identity)).toBe(false);
  });

  it("accepts known categories and safely falls back", () => {
    expect(forumCategory("rules")).toBe("rules");
    expect(forumCategory("bugs")).toBe("bugs");
    expect(forumCategory("unknown")).toBe("general");
  });
});
