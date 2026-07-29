export const ROOM_CHAT_MAX_LENGTH = 280;
export const ROOM_CHAT_WINDOW_MS = 10_000;
export const ROOM_CHAT_MAX_MESSAGES_PER_WINDOW = 6;

export interface RoomChatMessage {
  type: "chat";
  messageId: string;
  roomKey: string;
  playerId: string;
  role: "white" | "black" | "spectator";
  text: string;
  sentAt: number;
}

export function normalizeRoomChatText(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Chat message must be text");
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    throw new Error("Chat message cannot be empty");
  }
  if (normalized.length > ROOM_CHAT_MAX_LENGTH) {
    throw new Error(`Chat message cannot exceed ${ROOM_CHAT_MAX_LENGTH} characters`);
  }
  if (/\p{C}/u.test(normalized)) {
    throw new Error("Chat message contains unsupported control characters");
  }

  return normalized;
}

export class RoomChatRateLimiter {
  private readonly timestamps = new Map<string, number[]>();

  public assertAllowed(playerId: string, now = Date.now()): void {
    const cutoff = now - ROOM_CHAT_WINDOW_MS;
    const recent = (this.timestamps.get(playerId) ?? []).filter((timestamp) => timestamp > cutoff);

    if (recent.length >= ROOM_CHAT_MAX_MESSAGES_PER_WINDOW) {
      this.timestamps.set(playerId, recent);
      throw new Error("Chat rate limit exceeded");
    }

    recent.push(now);
    this.timestamps.set(playerId, recent);
  }

  public forget(playerId: string): void {
    this.timestamps.delete(playerId);
  }
}
