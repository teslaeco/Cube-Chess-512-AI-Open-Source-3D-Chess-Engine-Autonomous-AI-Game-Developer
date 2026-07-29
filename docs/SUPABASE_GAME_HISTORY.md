# Supabase game history

This stage adds an append-oriented, server-authoritative record of Cube Chess 512 matches.

## Scope

The migration creates:

- `public.games` for participants, status, result and final state,
- `public.game_moves` for an ordered move log,
- constraints that keep winners and results consistent,
- indexes for player history and active-game queries,
- RLS so authenticated players can read only their own games,
- no direct browser write privileges.

The schema depends on the player profile migration from PR #58.

## Trust boundary

The browser must never decide the official result, rating update or move history. Only the trusted multiplayer service should insert or update these tables using `SUPABASE_SERVICE_ROLE_KEY` stored as a Render secret.

Clients may submit move requests to the WebSocket service. The service must validate each move against the authoritative 8x8x8 engine before recording it.

## Data model

`games.status` supports:

- `waiting`
- `active`
- `finished`
- `aborted`

`games.result` supports:

- `white_win`
- `black_win`
- `draw`

Each move is stored with a strictly increasing `ply`, the acting player, a JSON move payload and an optional deterministic position hash.

## Recommended move payload

The schema intentionally leaves `move` as JSON while the engine protocol is still evolving. The server should standardize it before production, for example:

```json
{
  "from": { "x": 0, "y": 1, "z": 0 },
  "to": { "x": 0, "y": 2, "z": 0 },
  "piece": "pawn",
  "promotion": null
}
```

Do not store display text as the authoritative move representation.

## Manual verification

After PR #58 and this migration are applied to a development project:

1. Create two test users and confirm both profiles exist.
2. Insert a game using the service role.
3. Confirm each participant can read the game while a third user cannot.
4. Insert ordered moves and confirm duplicate `ply` values are rejected.
5. Confirm a move from a non-participant is rejected.
6. Confirm a draw cannot have a winner.
7. Confirm a finished game requires a result and `finished_at`.
8. Confirm browser clients cannot insert or update games directly.

## Deliberately deferred

Separate migrations should add:

- atomic result finalization with ELO/stat updates,
- reconnect/session state,
- public spectator views,
- replay annotations,
- tournaments and matchmaking queues.
