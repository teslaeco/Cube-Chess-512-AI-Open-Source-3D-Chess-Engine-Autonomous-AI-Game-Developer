# Matchmaking queue foundation

This stage adds an isolated, in-memory matchmaking policy for the future Render WebSocket service. It does not yet expose a public WebSocket message or create game rooms.

## Current behaviour

- one active queue entry per player;
- separate pools for `casual` and `ranked` games;
- separate pools for each validated time-control identifier;
- oldest compatible player is considered first;
- the closest compatible rating is selected;
- the permitted rating difference expands gradually while both players wait;
- matched players are removed from the queue in the same synchronous operation;
- players can explicitly cancel their queue entry.

The initial rating range is 100 ELO points. It grows by 10 points per second and is capped at 800 points. Matching uses the stricter range of the two players so a long-waiting account cannot immediately pull a newly joined account into a very wide search.

## Trust boundary

The browser must not be authoritative for ranked matchmaking data.

Before production integration, `GameServer` must:

1. authenticate the WebSocket session using a verified Supabase access token;
2. derive `playerId` from the authenticated session instead of the incoming payload;
3. load ranked ELO from the trusted profile store instead of accepting a client-supplied rating;
4. map UI time-control choices to a server allow-list;
5. rate-limit queue joins, cancellations and reconnect attempts;
6. remove the queue entry on disconnect unless a short reconnect grace period is active;
7. create the room and seat assignment on the server;
8. persist only the final authoritative match and result through the backend service role.

The Supabase service-role key must remain only in Render environment variables. It must never be sent to the browser or committed to the repository.

## Reconnect and horizontal scaling

This implementation is intentionally in memory and safe only for a single server process. Before enabling multiple Render instances, replace the storage layer with a shared atomic coordinator such as Redis or a database-backed queue. Room ownership, queue claims and reconnect leases must use atomic operations to prevent one player from being matched twice.

Reconnect tokens must be cryptographically random, short-lived and separate from invitation, spectator and payment tokens.

## Validation

Run:

```bash
npm test -- server/MatchmakingQueue.test.ts
npm run typecheck
```

## Next integration stage

A later PR can wire this queue into authenticated WebSocket messages such as `queue-join` and `queue-leave`, then hand a successful pair to the existing room manager. That integration should remain separate from the chess engine and rendering code.
