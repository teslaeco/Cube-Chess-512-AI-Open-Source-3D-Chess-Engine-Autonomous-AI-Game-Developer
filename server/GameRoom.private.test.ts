import { describe, expect, it } from "vitest";
import { GameRoom } from "./GameRoom.js";

describe("private multiplayer room lifecycle", () => {
  it("waits for both players before starting", () => {
    const room = new GameRoom(true);
    expect(room.join("host", "white")).toBe("white");
    expect(room.join("guest", "black")).toBe("black");
    expect(room.snapshot().started).toBe(false);

    room.setReady("host", true);
    expect(room.snapshot().started).toBe(false);
    room.setReady("guest", true);

    expect(room.snapshot()).toMatchObject({
      started: true,
      players: {
        white: true,
        black: true,
        ready: { white: true, black: true },
      },
    });
  });

  it("keeps spectators out of readiness state", () => {
    const room = new GameRoom(true);
    room.join("host", "white");
    room.join("guest", "black");
    expect(room.join("viewer")).toBe("spectator");
    expect(() => room.setReady("viewer", true)).toThrow(/Spectators/);
  });

  it("preserves legacy rooms that start immediately", () => {
    const room = new GameRoom(false);
    room.join("host", "white");
    room.join("guest", "black");
    expect(room.snapshot().started).toBe(true);
  });
});
