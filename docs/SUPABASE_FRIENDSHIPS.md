# Supabase friendships

This stage adds friend requests and accepted friendships without exposing service-role credentials to the browser.

## Scope

The migration creates:

- `public.friend_requests` for pending invitations,
- `public.friendships` for accepted relationships,
- canonical ordering so one friendship can exist only once,
- row-level security limiting reads to the players involved,
- RPC functions for accepting, rejecting and removing friendships,
- validation preventing duplicate, reverse and already-accepted requests.

The schema depends on `public.profiles` from PR #58.

## Browser permissions

Authenticated clients may:

- send a request from their own account,
- view requests they sent or received,
- cancel a request they sent,
- accept or reject a request they received through RPC,
- view their accepted friendships,
- remove one of their own friendships through RPC.

Authenticated clients may not:

- create requests on behalf of another user,
- accept or reject another player's request,
- directly insert, update or delete friendship rows,
- read relationships that do not involve their account.

## Example client calls

Send a request:

```js
await supabase.from('friend_requests').insert({
  requester_id: user.id,
  recipient_id: otherPlayerId,
});
```

Accept a request:

```js
await supabase.rpc('accept_friend_request', {
  request_id: requestId,
});
```

Reject a request:

```js
await supabase.rpc('reject_friend_request', {
  request_id: requestId,
});
```

Remove a friend:

```js
await supabase.rpc('remove_friend', {
  friend_id: otherPlayerId,
});
```

## Manual verification

After applying the profile migration and this migration to a development Supabase project:

1. Create three test users: A, B and C.
2. Sign in as A and send a request to B.
3. Confirm A and B can read the request while C cannot.
4. Confirm A cannot accept the request.
5. Sign in as B and accept it.
6. Confirm one canonical friendship row exists.
7. Confirm a duplicate or reverse request is rejected.
8. Confirm C cannot read the friendship.
9. Confirm A or B can remove the friendship through `remove_friend`.
10. Confirm direct browser inserts into `friendships` are denied.

## Deliberately deferred

Separate stages should add:

- blocked users,
- presence and last-seen state,
- game invitations with expiry,
- friend search and pagination,
- notification delivery,
- abuse reporting and moderation controls.
