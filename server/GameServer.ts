import { createServer, type Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { GameRoom, type PlayerRole } from "./GameRoom.js";
import { REGIONS, isRegionId, type RegionId } from "./regions.js";

interface ClientIdentity {
  playerId: string;
  roomKey: string;
  role: PlayerRole;
}

function json(
  response: import("node:http").ServerResponse,
  status: number,
  body: unknown,
) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function validToken(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    new RegExp(`^[A-Za-z0-9_-]{1,${maxLength}}$`).test(value)
  );
}

export class GameServer {
  private readonly rooms = new Map<string, GameRoom>();
  private readonly clients = new WeakMap<WebSocket, ClientIdentity>();
  private server: Server | null = null;
  private webSockets: WebSocketServer | null = null;

  public async start(port = 8787, host = "127.0.0.1"): Promise<number> {
    if (this.server) throw new Error("Server already started");
    this.server = createServer((request, response) => {
      if (request.url === "/health") {
        json(response, 200, {
          ok: true,
          rooms: this.rooms.size,
          regions: REGIONS,
        });
      } else if (request.url === "/regions") {
        json(
          response,
          200,
          REGIONS.map((region) => ({ ...region, status: "local-test" })),
        );
      } else {
        json(response, 404, { error: "Not found" });
      }
    });
    this.webSockets = new WebSocketServer({
      server: this.server,
      maxPayload: 16_384,
    });
    this.webSockets.on("connection", (socket) => {
      socket.on("message", (raw) =>
        this.handleMessage(socket, raw.toString()),
      );
    });
    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(port, host, resolve);
    });
    const address = this.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Server did not bind a TCP port");
    }
    return address.port;
  }

  public async stop(): Promise<void> {
    for (const client of this.webSockets?.clients ?? []) client.terminate();
    await new Promise<void>((resolve, reject) => {
      if (!this.server) return resolve();
      this.server.close((error) => (error ? reject(error) : resolve()));
    });
    this.webSockets?.close();
    this.webSockets = null;
    this.server = null;
  }

  private send(socket: WebSocket, message: unknown) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private room(region: RegionId, code: string): [string, GameRoom] {
    const key = `${region}:${code.toUpperCase()}`;
    let room = this.rooms.get(key);
    if (!room) {
      room = new GameRoom();
      this.rooms.set(key, room);
    }
    return [key, room];
  }

  private handleMessage(socket: WebSocket, raw: string) {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(raw);
    } catch {
      this.send(socket, { type: "error", code: "invalid-json" });
      return;
    }
    try {
      if (message.type === "join") {
        if (
          !isRegionId(message.region) ||
          !validToken(message.roomCode, 12) ||
          !validToken(message.playerId, 64)
        ) {
          throw new Error("Invalid join parameters");
        }
        const [roomKey, room] = this.room(message.region, message.roomCode);
        const role = room.join(message.playerId);
        this.clients.set(socket, {
          playerId: message.playerId,
          roomKey,
          role,
        });
        this.send(socket, {
          type: "joined",
          role,
          roomKey,
          state: room.snapshot(),
        });
        return;
      }
      if (message.type === "move") {
        const identity = this.clients.get(socket);
        if (!identity) throw new Error("Join a room before sending moves");
        const room = this.rooms.get(identity.roomKey)!;
        const intent = message.move as
          | { pieceId?: unknown; square3D?: unknown }
          | undefined;
        if (
          !Number.isInteger(message.sequence) ||
          !validToken(intent?.pieceId, 80) ||
          typeof intent?.square3D !== "string"
        ) {
          throw new Error("Invalid move message");
        }
        room.applyIntent(identity.playerId, Number(message.sequence), {
          pieceId: intent.pieceId,
          square3D: intent.square3D,
        });
        this.broadcast(identity.roomKey, {
          type: "state",
          state: room.snapshot(),
        });
        return;
      }
      throw new Error("Unknown message type");
    } catch (error) {
      this.send(socket, {
        type: "error",
        code: "rejected",
        message: error instanceof Error ? error.message : "Rejected",
      });
    }
  }

  private broadcast(roomKey: string, message: unknown) {
    for (const client of this.webSockets?.clients ?? []) {
      if (this.clients.get(client)?.roomKey === roomKey) {
        this.send(client, message);
      }
    }
  }
}
