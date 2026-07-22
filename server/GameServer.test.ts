import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { GameServer } from "./GameServer.js";

let server: GameServer | null = null;

interface TestServerMessage {
  type?: string;
  code?: string;
  role?: string;
  state?: {
    sequence: number;
    sideToMove: string;
  };
}

interface HealthResponse {
  ok: boolean;
  regions: unknown[];
}

afterEach(async () => {
  await server?.stop();
  server = null;
});

function nextMessage(socket: WebSocket): Promise<TestServerMessage> {
  return new Promise((resolve, reject) => {
    socket.once("message", (raw) => resolve(JSON.parse(raw.toString())));
    socket.once("error", reject);
  });
}

async function join(socket: WebSocket, playerId: string) {
  socket.send(
    JSON.stringify({
      type: "join",
      region: "europe",
      roomCode: "TEST512",
      playerId,
    }),
  );
  return nextMessage(socket);
}

describe("authoritative multiplayer test server", () => {
  it("exposes eight logical regions and validates a room move", async () => {
    server = new GameServer();
    const port = await server.start(0);
    const health = (await fetch(`http://127.0.0.1:${port}/health`).then(
      (response) => response.json(),
    )) as HealthResponse;
    expect(health.ok).toBe(true);
    expect(health.regions).toHaveLength(8);

    const white = new WebSocket(`ws://127.0.0.1:${port}`);
    const black = new WebSocket(`ws://127.0.0.1:${port}`);
    await Promise.all([
      new Promise((resolve) => white.once("open", resolve)),
      new Promise((resolve) => black.once("open", resolve)),
    ]);
    expect((await join(white, "white-player")).role).toBe("white");
    expect((await join(black, "black-player")).role).toBe("black");

    const whiteState = nextMessage(white);
    const blackState = nextMessage(black);
    white.send(
      JSON.stringify({
        type: "move",
        sequence: 1,
        move: { pieceId: "white-pawn-1", square3D: "A:a3" },
      }),
    );
    expect((await whiteState).state).toMatchObject({
      sequence: 1,
      sideToMove: "black",
    });
    expect((await blackState).state).toMatchObject({
      sequence: 1,
      sideToMove: "black",
    });

    const rejection = nextMessage(white);
    white.send(
      JSON.stringify({
        type: "move",
        sequence: 2,
        move: { pieceId: "white-pawn-2", square3D: "A:b4" },
      }),
    );
    expect(await rejection).toMatchObject({ type: "error", code: "rejected" });
    white.close();
    const reconnectedWhite = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise((resolve) => reconnectedWhite.once("open", resolve));
    expect((await join(reconnectedWhite, "white-player")).role).toBe("white");
    reconnectedWhite.close();
    black.close();
  });
});
