export const DEFAULT_SPECTATOR_LIMIT = 32;

export type SpectatorAdmission =
  | { accepted: true; spectatorId: string }
  | { accepted: false; reason: "invalid-id" | "invalid-token" | "room-full" | "already-watching" };

export interface SpectatorRoomOptions {
  accessToken?: string;
  maxSpectators?: number;
}

function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function validAccessToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,96}$/.test(value);
}

export class SpectatorAccess {
  private readonly spectators = new Set<string>();
  private readonly accessToken: string | null;
  private readonly maxSpectators: number;

  public constructor(options: SpectatorRoomOptions = {}) {
    const limit = options.maxSpectators ?? DEFAULT_SPECTATOR_LIMIT;
    if (!Number.isInteger(limit) || limit < 0 || limit > 256) {
      throw new Error("Spectator limit must be an integer between 0 and 256");
    }
    if (options.accessToken !== undefined && !validAccessToken(options.accessToken)) {
      throw new Error("Spectator access token is invalid");
    }

    this.accessToken = options.accessToken ?? null;
    this.maxSpectators = limit;
  }

  public admit(spectatorId: unknown, suppliedToken?: unknown): SpectatorAdmission {
    if (!validIdentifier(spectatorId)) {
      return { accepted: false, reason: "invalid-id" };
    }
    if (this.spectators.has(spectatorId)) {
      return { accepted: false, reason: "already-watching" };
    }
    if (this.accessToken !== null && suppliedToken !== this.accessToken) {
      return { accepted: false, reason: "invalid-token" };
    }
    if (this.spectators.size >= this.maxSpectators) {
      return { accepted: false, reason: "room-full" };
    }

    this.spectators.add(spectatorId);
    return { accepted: true, spectatorId };
  }

  public leave(spectatorId: string): boolean {
    return this.spectators.delete(spectatorId);
  }

  public has(spectatorId: string): boolean {
    return this.spectators.has(spectatorId);
  }

  public count(): number {
    return this.spectators.size;
  }

  public list(): readonly string[] {
    return [...this.spectators];
  }
}

export interface SpectatorSnapshot<TState> {
  type: "spectator-state";
  state: TState;
  spectatorCount: number;
}

export function spectatorSnapshot<TState>(state: TState, spectatorCount: number): SpectatorSnapshot<TState> {
  if (!Number.isInteger(spectatorCount) || spectatorCount < 0) {
    throw new Error("Spectator count must be a non-negative integer");
  }
  return { type: "spectator-state", state, spectatorCount };
}
