import { randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { GameRoom, type PlayerRole } from "./GameRoom.js";
import { REGIONS, isRegionId, type RegionId } from "./regions.js";

interface ClientIdentity {
  playerId: string;
  roomKey: string;
  role: PlayerRole;
}

interface RoomRecord {
  game: GameRoom;
  inviteToken: string;
  reconnectTokens: Map<string, string>;
  createdAt: number;
}

function json(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function validToken(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && new RegExp(`^[A-Za-z0-9_-]{1,${maxLength}}$`).test(value);
}

function secureToken(bytes = 18): string {
  return randomBytes(bytes).toString("base64url");
}

function roomCode(): string {
  return randomBytes(5).toString("base64url").replace(/[-_]/g, "A").slice(0, 8).toUpperCase();
}

export class GameServer {
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly clients = new WeakMap<WebSocket, ClientIdentity>();
  private server: Server | null = null;
  private webSockets: WebSocketServer | null = null;

  public async start(port = 8787, host = "127.0.0.1"): Promise<number> {
    if (this.server) throw new Error("Server already started");
    this.server = createServer((request, response) => {
      if (request.url === "/health") {
        json(response, 200, { ok: true, rooms: this.rooms.size, regions: REGIONS });
      } else if (request.url === "/regions") {
        json(response, 200, REGIONS.map((region) => ({ ...region, status: "online" })));
      } else {
        json(response, 404, { error: "Not found" });
      }
    });
    this.webSockets = new WebSocketServer({ server: this.server, maxPayload: 16_384 });
    this.webSockets.on("connection", (socket) => {
      socket.on("message", (raw) => this.handleMessage(socket, raw.toString()));
      socket.on("close", () => this.handleDisconnect(socket));
    });
    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(port, host, resolve);
    });
    const address = this.server.address();
    if (!address || typeof address === "string") throw new Error("Server did not bind a TCP port");
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
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  private key(region: RegionId, code: string): string {
    return `${region}:${code.toUpperCase()}`;
  }

  private createPrivateRoom(region: RegionId, hostPlayerId: string) {
    let code = roomCode();
    while (this.rooms.has(this.key(region, code))) code = roomCode();
    const key = this.key(region, code);
    const record: RoomRecord = {
      game: new GameRoom(true),
      inviteToken: secureToken(),
      reconnectTokens: new Map(),
      createdAt: Date.now(),
    };
    const role = record.game.join(hostPlayerId, "white");
    const reconnectToken = secureToken();
    record.reconnectTokens.set(hostPlayerId, reconnectToken);
    this.rooms.set(key, record);
    return { key, code, record, role, reconnectToken };
  }

  private legacyRoom(region: RegionId, code: string): [string, RoomRecord] {
    const key = this.key(region, code);
    let record = this.rooms.get(key);
    if (!record) {
      record = {
        game: new GameRoom(false),
        inviteToken: "",
        reconnectTokens: new Map(),
        createdAt: Date.now(),
      };
      this.rooms.set(key, record);
    }
    return [key, record];
  }

  private attach(socket: WebSocket, roomKey: string, playerId: string, role: PlayerRole) {
    this.clients.set(socket, { playerId, roomKey, role });
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
      if (message.type === "create-room") {
        if (!isRegionId(message.region) || !validToken(message.playerId, 64)) {
          throw new Error("Invalid room creation parameters");
        }
        const created = this.createPrivateRoom(message.region, message.playerId);
        this.attach(socket, created.key, message.playerId, created.role);
        this.send(socket, {
          type: "room-created",
          region: message.region,
          roomCode: created.code,
          inviteToken: created.record.inviteToken,
          invitePath: `?region=${message.region}&room=${created.code}&invite=${created.record.inviteToken}`,
          reconnectToken: created.reconnectToken,
          role: created.role,
          state: created.record.game.snapshot(),
        });
        return;
      }

      if (message.type === "join-private") {
        if (
          !isRegionId(message.region) ||
          !validToken(message.roomCode, 12) ||
          !validToken(message.playerId, 64) ||
          !validToken(message.inviteToken, 64)
        ) {
          throw new Error("Invalid private-room parameters");
        }
        const roomKey = this.key(message.region, message.roomCode);
        const record = this.rooms.get(roomKey);
        if (!record || record.inviteToken !== message.inviteToken) {
          throw new Error("Invitation is invalid or expired");
        }
        const role = record.game.join(message.playerId, "black");
        const reconnectToken = secureToken();
        record.reconnectTokens.set(message.playerId, reconnectToken);
        this.attach(socket, roomKey, message.playerId, role);
        this.send(socket, {
          type: "joined",
          role,
          roomKey,
          reconnectToken,
          state: record.game.snapshot(),
        });
        this.broadcastState(roomKey);
        return;
      }

      if (message.type === "reconnect") {
        if (
          !isRegionId(message.region) ||
          !validToken(message.roomCode, 12) ||
          !validToken(message.playerId, 64) ||
          !validToken(message.reconnectToken, 64)
        ) {
          throw new Error("Invalid reconnect parameters");
        }
        const roomKey = this.key(message.region, message.roomCode);
        const record = this.rooms.get(roomKey);
        if (!record || record.reconnectTokens.get(message.playerId) !== message.reconnectToken) {
          throw new Error("Reconnect token rejected");
        }
        const role = record.game.roleOf(message.playerId);
        this.attach(socket, roomKey, message.playerId, role);
        this.send(socket, { type: "reconnected", role, roomKey, state: record.game.snapshot() });
        return;
      }

      if (message.type === "join") {
        if (!isRegionId(message.region) || !validToken(message.roomCode, 12) || !validToken(message.playerId, 64)) {
          throw new Error("Invalid join parameters");
        }
        const [roomKey, record] = this.legacyRoom(message.region, message.roomCode);
        const role = record.game.join(message.playerId);
        this.attach(socket, roomKey, message.playerId, role);
        this.send(socket, { type: "joined", role, roomKey, state: record.game.snapshot() });
        return;
      }

      if (message.type === "ready") {
        const identity = this.clients.get(socket);
        if (!identity) throw new Error("Join a room before becoming ready");
        const record = this.rooms.get(identity.roomKey)!;
        record.game.setReady(identity.playerId, message.ready !== false);
        this.broadcastState(identity.roomKey);
        return;
      }

      if (message.type === "move") {
        const identity = this.clients.get(socket);
        if (!identity) throw new Error("Join a room before sending moves");
        const record = this.rooms.get(identity.roomKey)!;
        const intent = message.move as { pieceId?: unknown; square3D?: unknown } | undefined;
        if (!Number.isInteger(message.sequence) || !validToken(intent?.pieceId, 80) || typeof intent?.square3D !== "string") {
          throw new Error("Invalid move message");
        }
        record.game.applyIntent(identity.playerId, Number(message.sequence), {
          pieceId: intent.pieceId,
          square3D: intent.square3D,
        });
        this.broadcastState(identity.roomKey);
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

  private handleDisconnect(socket: WebSocket) {
    const identity = this.clients.get(socket);
    if (!identity) return;
    this.broadcast(identity.roomKey, {
      type: "presence",
      playerId: identity.playerId,
      role: identity.role,
      connected: false,
    });
  }

  private broadcastState(roomKey: string) {
    const record = this.rooms.get(roomKey);
    if (record) this.broadcast(roomKey, { type: "state", state: record.game.snapshot() });
  }

  private broadcast(roomKey: string, message: unknown) {
    for (const client of this.webSockets?.clients ?? []) {
      if (this.clients.get(client)?.roomKey === roomKey) this.send(client, message);
    }
  }
}
