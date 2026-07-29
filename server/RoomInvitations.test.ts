import { describe, expect, it } from "vitest";
import { ROOM_INVITE_TTL_MS, RoomInvitationStore } from "./RoomInvitations.js";

const token = "abcdefghijklmnopqrstuvwxyz012345";

function createInvite(store: RoomInvitationStore, overrides: Record<string, unknown> = {}) {
  return store.create({
    inviteId: "invite_1",
    roomKey: "ABC123",
    invitedBy: "owner_1",
    invitedPlayerId: "player_2",
    role: "black",
    token,
    now: 1_000,
    ...overrides,
  });
}

describe("RoomInvitationStore", () => {
  it("creates an invite without exposing its token", () => {
    const store = new RoomInvitationStore();
    const invite = createInvite(store);

    expect(invite).toEqual({
      inviteId: "invite_1",
      roomKey: "ABC123",
      invitedBy: "owner_1",
      invitedPlayerId: "player_2",
      role: "black",
      createdAt: 1_000,
      expiresAt: 1_000 + ROOM_INVITE_TTL_MS,
      usedAt: null,
    });
    expect("token" in invite).toBe(false);
  });

  it("redeems an invite exactly once for the intended player", () => {
    const store = new RoomInvitationStore();
    createInvite(store);

    expect(store.redeem({ inviteId: "invite_1", playerId: "player_2", token, now: 2_000 })).toMatchObject({
      accepted: true,
      invite: { roomKey: "ABC123", role: "black", usedAt: 2_000 },
    });
    expect(store.redeem({ inviteId: "invite_1", playerId: "player_2", token, now: 3_000 })).toEqual({
      accepted: false,
      reason: "already-used",
    });
  });

  it("rejects the wrong player, token and expired invites", () => {
    const store = new RoomInvitationStore();
    createInvite(store);

    expect(store.redeem({ inviteId: "invite_1", playerId: "player_3", token, now: 2_000 })).toEqual({
      accepted: false,
      reason: "wrong-player",
    });
    expect(store.redeem({ inviteId: "invite_1", playerId: "player_2", token: `${token}x`, now: 2_000 })).toEqual({
      accepted: false,
      reason: "invalid-token",
    });
    expect(
      store.redeem({
        inviteId: "invite_1",
        playerId: "player_2",
        token,
        now: 1_000 + ROOM_INVITE_TTL_MS,
      }),
    ).toEqual({ accepted: false, reason: "expired" });
  });

  it("allows only the inviter to revoke an unused invite", () => {
    const store = new RoomInvitationStore();
    createInvite(store);

    expect(store.revoke("invite_1", "player_2")).toBe(false);
    expect(store.revoke("invite_1", "owner_1")).toBe(true);
    expect(store.count()).toBe(0);
  });

  it("purges expired and already-used records", () => {
    const store = new RoomInvitationStore();
    createInvite(store, { inviteId: "invite_old", ttlMs: 1_000 });
    createInvite(store, { inviteId: "invite_used" });
    store.redeem({ inviteId: "invite_used", playerId: "player_2", token, now: 2_000 });

    expect(store.purgeExpired(2_001)).toBe(2);
    expect(store.count()).toBe(0);
  });

  it("rejects malformed input and unsafe TTL values", () => {
    const store = new RoomInvitationStore();

    expect(() => createInvite(store, { roomKey: "bad room" })).toThrow("Room key is invalid");
    expect(() => createInvite(store, { token: "short" })).toThrow("Invite token is invalid");
    expect(() => createInvite(store, { ttlMs: 999 })).toThrow("Invite TTL");
    expect(() => createInvite(store, { ttlMs: 24 * 60 * 60 * 1000 + 1 })).toThrow("Invite TTL");
  });
});
