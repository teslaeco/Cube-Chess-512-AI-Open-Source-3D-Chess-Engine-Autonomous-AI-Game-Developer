export const ROOM_INVITE_TTL_MS = 15 * 60 * 1000;
export const ROOM_INVITE_TOKEN_MIN_LENGTH = 24;
export const ROOM_INVITE_TOKEN_MAX_LENGTH = 128;

export type RoomInviteRole = "white" | "black" | "spectator";

export interface RoomInvite {
  inviteId: string;
  roomKey: string;
  invitedBy: string;
  invitedPlayerId: string;
  role: RoomInviteRole;
  token: string;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
}

export type InviteRedemption =
  | { accepted: true; invite: Omit<RoomInvite, "token"> }
  | {
      accepted: false;
      reason: "not-found" | "wrong-player" | "invalid-token" | "expired" | "already-used";
    };

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function isRoomKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z0-9]{6,16}$/.test(value);
}

function isInviteToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= ROOM_INVITE_TOKEN_MIN_LENGTH &&
    value.length <= ROOM_INVITE_TOKEN_MAX_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

function withoutToken(invite: RoomInvite): Omit<RoomInvite, "token"> {
  const { token: _token, ...safeInvite } = invite;
  return safeInvite;
}

export class RoomInvitationStore {
  private readonly invites = new Map<string, RoomInvite>();

  public create(input: {
    inviteId: unknown;
    roomKey: unknown;
    invitedBy: unknown;
    invitedPlayerId: unknown;
    role: RoomInviteRole;
    token: unknown;
    now?: number;
    ttlMs?: number;
  }): Omit<RoomInvite, "token"> {
    if (!isIdentifier(input.inviteId)) throw new Error("Invite ID is invalid");
    if (!isRoomKey(input.roomKey)) throw new Error("Room key is invalid");
    if (!isIdentifier(input.invitedBy)) throw new Error("Inviter ID is invalid");
    if (!isIdentifier(input.invitedPlayerId)) throw new Error("Invited player ID is invalid");
    if (!isInviteToken(input.token)) throw new Error("Invite token is invalid");
    if (!["white", "black", "spectator"].includes(input.role)) throw new Error("Invite role is invalid");
    if (this.invites.has(input.inviteId)) throw new Error("Invite ID already exists");

    const now = input.now ?? Date.now();
    const ttlMs = input.ttlMs ?? ROOM_INVITE_TTL_MS;
    if (!Number.isFinite(now) || now < 0) throw new Error("Invite timestamp is invalid");
    if (!Number.isInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 24 * 60 * 60 * 1000) {
      throw new Error("Invite TTL must be between 1 second and 24 hours");
    }

    const invite: RoomInvite = {
      inviteId: input.inviteId,
      roomKey: input.roomKey,
      invitedBy: input.invitedBy,
      invitedPlayerId: input.invitedPlayerId,
      role: input.role,
      token: input.token,
      createdAt: now,
      expiresAt: now + ttlMs,
      usedAt: null,
    };

    this.invites.set(invite.inviteId, invite);
    return withoutToken(invite);
  }

  public redeem(input: {
    inviteId: unknown;
    playerId: unknown;
    token: unknown;
    now?: number;
  }): InviteRedemption {
    if (!isIdentifier(input.inviteId)) return { accepted: false, reason: "not-found" };
    const invite = this.invites.get(input.inviteId);
    if (!invite) return { accepted: false, reason: "not-found" };
    if (invite.usedAt !== null) return { accepted: false, reason: "already-used" };
    if (input.playerId !== invite.invitedPlayerId) return { accepted: false, reason: "wrong-player" };
    if (input.token !== invite.token) return { accepted: false, reason: "invalid-token" };

    const now = input.now ?? Date.now();
    if (!Number.isFinite(now) || now >= invite.expiresAt) {
      return { accepted: false, reason: "expired" };
    }

    invite.usedAt = now;
    return { accepted: true, invite: withoutToken(invite) };
  }

  public revoke(inviteId: string, invitedBy: string): boolean {
    const invite = this.invites.get(inviteId);
    if (!invite || invite.invitedBy !== invitedBy || invite.usedAt !== null) return false;
    return this.invites.delete(inviteId);
  }

  public purgeExpired(now = Date.now()): number {
    let removed = 0;
    for (const [inviteId, invite] of this.invites) {
      if (invite.expiresAt <= now || invite.usedAt !== null) {
        this.invites.delete(inviteId);
        removed += 1;
      }
    }
    return removed;
  }

  public count(): number {
    return this.invites.size;
  }
}
