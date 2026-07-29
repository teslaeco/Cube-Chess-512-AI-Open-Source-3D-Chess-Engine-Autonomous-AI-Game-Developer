import { describe, expect, it } from "vitest";
import {
  MATCHMAKING_INITIAL_RATING_RANGE,
  MatchmakingQueue,
} from "./MatchmakingQueue";

describe("MatchmakingQueue", () => {
  it("matches compatible players and removes them atomically", () => {
    const queue = new MatchmakingQueue();
    queue.enqueue({ playerId: "alpha", mode: "ranked", timeControl: "rapid_10_0", rating: 1500 }, 1_000);
    queue.enqueue({ playerId: "beta", mode: "ranked", timeControl: "rapid_10_0", rating: 1540 }, 1_001);

    expect(queue.findMatch(1_001)).toEqual({
      first: {
        playerId: "alpha",
        mode: "ranked",
        timeControl: "rapid_10_0",
        rating: 1500,
        joinedAt: 1_000,
      },
      second: {
        playerId: "beta",
        mode: "ranked",
        timeControl: "rapid_10_0",
        rating: 1540,
        joinedAt: 1_001,
      },
    });
    expect(queue.size()).toBe(0);
  });

  it("does not mix modes or time controls", () => {
    const queue = new MatchmakingQueue();
    queue.enqueue({ playerId: "ranked", mode: "ranked", timeControl: "blitz_5_0", rating: 1500 }, 1_000);
    queue.enqueue({ playerId: "casual", mode: "casual", timeControl: "blitz_5_0", rating: 1500 }, 1_000);
    queue.enqueue({ playerId: "rapid", mode: "ranked", timeControl: "rapid_10_0", rating: 1500 }, 1_000);

    expect(queue.findMatch(1_000)).toBeNull();
    expect(queue.size()).toBe(3);
  });

  it("expands the acceptable rating range over time", () => {
    const queue = new MatchmakingQueue();
    const difference = MATCHMAKING_INITIAL_RATING_RANGE + 200;
    queue.enqueue({ playerId: "waiting", mode: "ranked", timeControl: "rapid", rating: 1400 }, 0);
    queue.enqueue({ playerId: "newcomer", mode: "ranked", timeControl: "rapid", rating: 1400 + difference }, 0);

    expect(queue.findMatch(10_000)).toBeNull();
    expect(queue.findMatch(20_000)).not.toBeNull();
  });

  it("uses the strictest rating range of both players", () => {
    const queue = new MatchmakingQueue();
    queue.enqueue({ playerId: "old", mode: "ranked", timeControl: "rapid", rating: 1400 }, 0);
    queue.enqueue({ playerId: "new", mode: "ranked", timeControl: "rapid", rating: 1600 }, 19_000);

    expect(queue.findMatch(20_000)).toBeNull();
  });

  it("rejects duplicate players and invalid client-controlled values", () => {
    const queue = new MatchmakingQueue();
    queue.enqueue({ playerId: "player-1", mode: "casual", timeControl: "rapid", rating: 1200 }, 1_000);

    expect(() => queue.enqueue({ playerId: "player-1", mode: "casual", timeControl: "rapid", rating: 1200 }, 1_000)).toThrow(
      "player is already queued",
    );
    expect(() => queue.enqueue({ playerId: "bad id", mode: "casual", timeControl: "rapid", rating: 1200 }, 1_000)).toThrow();
    expect(() => queue.enqueue({ playerId: "player-2", mode: "ranked", timeControl: "rapid", rating: 99 }, 1_000)).toThrow();
    expect(() => queue.enqueue({ playerId: "player-3", mode: "ranked", timeControl: "rapid!", rating: 1200 }, 1_000)).toThrow();
  });

  it("supports explicit cancellation", () => {
    const queue = new MatchmakingQueue();
    queue.enqueue({ playerId: "player", mode: "casual", timeControl: "rapid", rating: 1200 }, 1_000);

    expect(queue.dequeue("player")).toBe(true);
    expect(queue.dequeue("player")).toBe(false);
    expect(queue.has("player")).toBe(false);
  });
});
