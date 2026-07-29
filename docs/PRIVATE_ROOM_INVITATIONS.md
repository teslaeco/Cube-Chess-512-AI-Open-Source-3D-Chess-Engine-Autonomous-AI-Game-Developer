# Private room invitation foundation

This stage adds a small server-side invitation store for future private multiplayer rooms. It does not change the current WebSocket protocol and does not require Supabase, Render or payment credentials.

## Included

- validated invite, player and room identifiers
- single-use invitation tokens
- default 15-minute expiry
- configurable TTL capped at 24 hours
- role assignment for white, black or spectator access
- inviter-only revocation of unused invitations
- cleanup for expired and consumed records
- safe return values that never expose invitation tokens
- unit tests requiring no external services

## Trust boundary

The browser must not create authoritative invitation records. The trusted WebSocket service should generate the invite ID and a cryptographically random token, bind the invitation to the authenticated recipient, and store the record server-side.

Do not log tokens, include them in public room snapshots, save them in game history, or reuse them as reconnect or payment tokens. Production storage should persist only a hash of the token rather than the raw value.

## Planned protocol integration

A later PR can add server messages such as:

```json
{
  "type": "create-invite",
  "roomKey": "ABC123",
  "invitedPlayerId": "verified-supabase-user-id",
  "role": "black"
}
```

The server should then:

1. confirm the sender owns or controls the room,
2. confirm the recipient is allowed to receive invitations,
3. generate a random token with `crypto.randomBytes`,
4. store a hash and expiry server-side,
5. send the invitation through an authenticated channel,
6. redeem it once when the matching user joins,
7. issue a separate reconnect credential after admission.

## Security requirements before production

- replace temporary player identifiers with verified Supabase user IDs,
- hash tokens with a constant-time comparison path,
- rate-limit invitation creation and redemption,
- check block lists and privacy preferences,
- prevent role collisions with occupied player seats,
- revoke outstanding invitations when a room closes,
- keep private invite links out of analytics and chat history.

## Validation

Run:

```bash
npm test -- server/RoomInvitations.test.ts
npm run typecheck
```

No secrets or external services are required for this stage.
