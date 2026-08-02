import { describe, expect, it } from "vitest";
import { canAccessForum, canManageTopic, forumCategory, topicHash } from "./ForumPanel.js";

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

describe("forum topic navigation and ownership", () => {
  it("builds an encoded topic route", () => {
    expect(topicHash("topic/with spaces")).toBe("#forum/topic/topic%2Fwith%20spaces");
  });

  it("allows only the topic author to manage a topic", () => {
    const topic = { author_id: "user-1" };
    expect(canManageTopic({ mode: "account", playerId: "user-1" }, topic)).toBe(true);
    expect(canManageTopic({ mode: "account", playerId: "user-2" }, topic)).toBe(false);
    expect(canManageTopic({ mode: "guest", playerId: "user-1" }, topic)).toBe(false);
  });
});