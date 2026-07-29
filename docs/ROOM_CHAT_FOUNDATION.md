# Room chat foundation

This stage adds reusable server-side safeguards for future room chat without changing the current WebSocket protocol.

## Included

- whitespace normalization
- empty-message rejection
- 280-character maximum
- control-character rejection
- per-player burst limiting: 6 messages per 10 seconds
- cleanup support when a player leaves
- a server-owned chat event shape containing the room, player, role and timestamp

## Trust boundary

The browser must never choose authoritative chat metadata such as `playerId`, `roomKey`, `role`, `messageId` or `sentAt`. The WebSocket server derives those fields from the authenticated connection and only accepts the message text from the client.

Clients must render `text` as plain text, for example with `textContent`. Do not inject chat content with `innerHTML`.

## Planned integration

A later PR should wire `RoomChatRateLimiter` and `normalizeRoomChatText` into `GameServer` after the connection has joined a room. The server should then broadcast the constructed `RoomChatMessage` only to clients attached to that room.

Authentication and moderation are intentionally separate stages. Production deployment should replace temporary player identifiers with verified Supabase user IDs and add block/report controls before public chat is enabled.

## Validation

Run:

```bash
npm test -- server/RoomChat.test.ts
npm run typecheck
```

No secrets or external services are required for these tests.
