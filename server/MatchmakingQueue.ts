export type MatchmakingMode = "casual" | "ranked";

export interface MatchmakingRequest {
  playerId: string;
  mode: MatchmakingMode;
  timeControl: string;
  rating: number;
  joinedAt?: number;
}

export interface QueuedPlayer {
  playerId: string;
  mode: MatchmakingMode;
  timeControl: string;
  rating: number;
  joinedAt: number;
}

export interface MatchmakingPair {
  first: QueuedPlayer;
  second: QueuedPlayer;
}

export const MATCHMAKING_MIN_RATING = 100;
export const MATCHMAKING_MAX_RATING = 4_000;
export const MATCHMAKING_INITIAL_RATING_RANGE = 100;
export const MATCHMAKING_RANGE_GROWTH_PER_SECOND = 10;
export const MATCHMAKING_MAX_RATING_RANGE = 800;

const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const TIME_CONTROL_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

function assertIdentifier(value: string, field: string): void {
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`${field} must contain 1-64 letters, numbers, underscores or hyphens`);
  }
}

function assertTimeControl(value: string): void {
  if (!TIME_CONTROL_PATTERN.test(value)) {
    throw new Error("timeControl must contain 1-32 letters, numbers, underscores or hyphens");
  }
}

function assertRating(value: number): void {
  if (!Number.isInteger(value) || value < MATCHMAKING_MIN_RATING || value > MATCHMAKING_MAX_RATING) {
    throw new Error(`rating must be an integer between ${MATCHMAKING_MIN_RATING} and ${MATCHMAKING_MAX_RATING}`);
  }
}

function allowedRatingDifference(player: QueuedPlayer, now: number): number {
  const waitedSeconds = Math.max(0, now - player.joinedAt) / 1_000;
  return Math.min(
    MATCHMAKING_MAX_RATING_RANGE,
    MATCHMAKING_INITIAL_RATING_RANGE + waitedSeconds * MATCHMAKING_RANGE_GROWTH_PER_SECOND,
  );
}

export class MatchmakingQueue {
  private readonly players = new Map<string, QueuedPlayer>();

  public enqueue(request: MatchmakingRequest, now = Date.now()): QueuedPlayer {
    assertIdentifier(request.playerId, "playerId");
    assertTimeControl(request.timeControl);
    assertRating(request.rating);

    if (request.mode !== "casual" && request.mode !== "ranked") {
      throw new Error("mode must be casual or ranked");
    }
    if (!Number.isFinite(now) || now < 0) {
      throw new Error("joinedAt must be a non-negative timestamp");
    }
    if (this.players.has(request.playerId)) {
      throw new Error("player is already queued");
    }

    const player: QueuedPlayer = {
      playerId: request.playerId,
      mode: request.mode,
      timeControl: request.timeControl,
      rating: request.rating,
      joinedAt: request.joinedAt ?? now,
    };

    if (!Number.isFinite(player.joinedAt) || player.joinedAt < 0 || player.joinedAt > now) {
      throw new Error("joinedAt must be a non-negative timestamp not later than now");
    }

    this.players.set(player.playerId, player);
    return { ...player };
  }

  public dequeue(playerId: string): boolean {
    return this.players.delete(playerId);
  }

  public has(playerId: string): boolean {
    return this.players.has(playerId);
  }

  public size(): number {
    return this.players.size;
  }

  public findMatch(now = Date.now()): MatchmakingPair | null {
    const ordered = [...this.players.values()].sort(
      (left, right) => left.joinedAt - right.joinedAt || left.playerId.localeCompare(right.playerId),
    );

    for (let firstIndex = 0; firstIndex < ordered.length; firstIndex += 1) {
      const first = ordered[firstIndex];
      let best: QueuedPlayer | null = null;
      let bestDifference = Number.POSITIVE_INFINITY;

      for (let secondIndex = firstIndex + 1; secondIndex < ordered.length; secondIndex += 1) {
        const candidate = ordered[secondIndex];
        if (candidate.mode !== first.mode || candidate.timeControl !== first.timeControl) {
          continue;
        }

        const difference = Math.abs(candidate.rating - first.rating);
        const mutualRange = Math.min(
          allowedRatingDifference(first, now),
          allowedRatingDifference(candidate, now),
        );
        if (difference > mutualRange) {
          continue;
        }

        if (
          difference < bestDifference ||
          (difference === bestDifference && best !== null && candidate.joinedAt < best.joinedAt)
        ) {
          best = candidate;
          bestDifference = difference;
        }
      }

      if (best !== null) {
        this.players.delete(first.playerId);
        this.players.delete(best.playerId);
        return { first: { ...first }, second: { ...best } };
      }
    }

    return null;
  }
}
