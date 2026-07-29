import { describe, expect, it } from "vitest";
import {
  ROOM_CHAT_MAX_LENGTH,
  ROOM_CHAT_MAX_MESSAGES_PER_WINDOW,
  ROOM_CHAT_WINDOW_MS,
  RoomChatRateLimiter,
  normalizeRoomChatText,
} from "./RoomChat.js";

describe("room chat safeguards", () => {
  it("normalizes harmless whitespace", () => {
    expect(normalizeRoomChatText("  good   game\nwell played  ")).toBe("good game well played");
  });

  it("rejects empty, oversized and control-character messages", () => {
    expect(() => normalizeRoomChatText("   ")).toThrow("cannot be empty");
    expect(() => normalizeRoomChatText("a".repeat(ROOM_CHAT_MAX_LENGTH + 1))).toThrow(
      `cannot exceed ${ROOM_CHAT_MAX_LENGTH}`,
    );
    expect(() => normalizeRoomChatText("hello\u0000world")).toThrow("control characters");
  });

  it("limits bursts per player and recovers after the window", () => {
    const limiter = new RoomChatRateLimiter();
    const start = 1_000_000;

    for (let index = 0; index < ROOM_CHAT_MAX_MESSAGES_PER_WINDOW; index += 1) {
      expect(() => limiter.assertAllowed("player-1", start + index)).not.toThrow();
    }

    expect(() => limiter.assertAllowed("player-1", start + 100)).toThrow("rate limit exceeded");
    expect(() => limiter.assertAllowed("player-2", start + 100)).not.toThrow();
    expect(() => limiter.assertAllowed("player-1", start + ROOM_CHAT_WINDOW_MS + 1)).not.toThrow();
  });

  it("can clear state after a player leaves", () => {
    const limiter = new RoomChatRateLimiter();
    const now = 2_000_000;

    for (let index = 0; index < ROOM_CHAT_MAX_MESSAGES_PER_WINDOW; index += 1) {
      limiter.assertAllowed("player-1", now + index);
    }
    limiter.forget("player-1");

    expect(() => limiter.assertAllowed("player-1", now + 100)).not.toThrow();
  });
});
