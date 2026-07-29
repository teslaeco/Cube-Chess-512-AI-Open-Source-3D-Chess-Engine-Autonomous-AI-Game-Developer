# Spectator access foundation

This stage adds a small server-side policy for read-only spectators. It does not expose a new WebSocket message yet and does not change the current player protocol.

## Included

- validated spectator identifiers
- optional room-scoped spectator token
- configurable room capacity with a hard upper bound
- duplicate admission protection
- explicit leave and cleanup support
- a server-owned `spectator-state` event envelope
- unit tests that require no external services or secrets

## Trust boundary

Spectators are never players. A future `GameServer` integration must store them separately from `ClientIdentity` player sessions and must reject spectator attempts to send `ready`, `move`, game-result, moderation or payment messages.

The browser must not choose authoritative metadata such as room key, role, spectator count, event type or timestamp. The server derives those fields from the authenticated connection and room record.

For private rooms, generate a dedicated spectator token. Do not reuse the player invitation token or reconnect token. Leaking a spectator link must not allow anyone to join as black, reconnect as a player or submit moves.

## Recommended protocol integration

A later PR can add a message similar to:

```json
{
  "type": "watch-room",
  "region": "eu-west",
  "roomCode": "ABCD1234",
  "spectatorId": "viewer_123",
  "spectatorToken": "server-generated-token"
}
```

After validation, the server should:

1. look up the room without creating it,
2. call `SpectatorAccess.admit`,
3. attach the socket with a distinct spectator identity,
4. send a sanitized snapshot,
5. broadcast only the updated spectator count,
6. remove the spectator on close.

## Privacy and anti-cheat requirements

Before production use:

- authenticate spectators with Supabase where accounts are required,
- allow room owners to disable spectators,
- never expose reconnect tokens, invite tokens, email addresses or internal moderation data,
- consider delaying spectator state for ranked or tournament games,
- add block, report, mute and moderation controls before enabling spectator chat,
- rate-limit admission attempts per IP and account at the WebSocket edge.

## Validation

Run:

```bash
npm test -- server/SpectatorAccess.test.ts
npm run typecheck
```

No Supabase, Render, Stripe, PayPal or GitHub secrets are needed for this stage.
