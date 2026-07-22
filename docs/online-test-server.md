# Local multiplayer test server

The repository contains a small authoritative WebSocket test server. It proves
the network boundary without pretending that GitHub Pages can host WebSockets or
that eight production servers already exist.

## Start locally

```bash
npm run server:start
```

Default address: `127.0.0.1:8787`.

- `GET /health` returns readiness, room count and all eight logical regions.
- `GET /regions` returns the development status of those regions.
- `ws://127.0.0.1:8787` accepts the protocol below.

Docker is optional:

```bash
docker compose up --build
```

## Protocol

Join or rejoin a room:

```json
{
  "type": "join",
  "region": "europe",
  "roomCode": "TEST512",
  "playerId": "local-player-1"
}
```

The first two identities receive White and Black; later identities are
spectators. Rejoining with the same identity restores that role for the
in-memory room.

Submit a move:

```json
{
  "type": "move",
  "sequence": 1,
  "move": {
    "pieceId": "white-pawn-1",
    "square3D": "A:a3"
  }
}
```

The server checks sequence, turn ownership, piece ownership and engine legality,
then broadcasts an authoritative snapshot. Payloads are limited to 16 KiB.

## Production gaps

Rooms currently live only in memory. There is no public deployment, account
system, lobby, invitation service, TLS termination, rate limiter, moderation,
database or multi-process coordination. The menu therefore marks Arctic,
Europe, Asia, Africa, North America, South America, Australia and Antarctica as
offline/under construction until real configured endpoints pass health checks.
