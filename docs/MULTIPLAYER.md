# Cube Chess 512 Multiplayer

## Current foundation

The repository already contains an authoritative WebSocket server in `server/GameServer.ts` and a server-side game room in `server/GameRoom.ts`.

The client sends move intent only. The server verifies player ownership, turn order, sequence number and move legality before applying a move and broadcasting the resulting authoritative state.

## Run a private server

```bash
docker compose -f docker-compose.multiplayer.yml up --build -d
```

Health check:

```bash
curl http://localhost:8787/health
```

Default WebSocket endpoint:

```text
ws://localhost:8787
```

For internet hosting, put the service behind an HTTPS reverse proxy and expose it as `wss://`.

## Required production milestones

### 1. Private games and invite links

- Explicit room creation instead of implicit room creation on join.
- Cryptographically random room code and separate invite token.
- Host controls: color selection, random color, spectators, time control.
- Ready state for both players.
- Reconnection token and grace period.
- Server-side clocks.
- Room expiry and cleanup.
- Invite URL handled by the web client.

### 2. Accounts and friends

- Authenticated account sessions.
- Player profile and unique public handle.
- Friend requests, acceptance, rejection and blocking.
- Presence: online, away, in game and offline.
- Invite a friend directly into an existing room.
- Private chat with reporting and blocking.

### 3. Matchmaking and ranking

- Casual and ranked queues.
- Region-aware matching.
- ELO rating and seasons.
- Match history and replay.
- Resign, draw offer and timeout outcomes.

### 4. Scalable infrastructure

- PostgreSQL for persistent users, friendships, games and ratings.
- Redis for presence, matchmaking and multi-instance pub/sub.
- Database migrations and backups.
- Rate limiting, audit logs and abuse controls.
- CI tests for protocol compatibility and Docker image startup.

## Security rules

- Never trust board state supplied by a client.
- Validate every move on the server.
- Bind a reconnect token to one player, room and role.
- Use short-lived, revocable invite tokens.
- Limit message size and message frequency.
- Keep payment functionality outside the game server.
