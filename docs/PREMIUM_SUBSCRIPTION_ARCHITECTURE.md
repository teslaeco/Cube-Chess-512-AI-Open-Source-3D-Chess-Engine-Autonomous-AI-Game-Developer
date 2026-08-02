# Cube Chess 512 Premium Subscription Architecture

## Goal

Add paid Premium access without weakening the free game, exposing payment secrets in the browser, or coupling chess rules to one billing provider.

## Product tiers

- `free`: core game, local play and standard online access.
- `premium_monthly`: recurring monthly entitlement.
- `premium_yearly`: recurring yearly entitlement.
- `supporter`: long-lived supporter entitlement managed by an approved server-side source.

Premium features are represented by stable feature keys rather than direct checks for a payment-provider product ID.

## Security boundary

The browser is never trusted to grant Premium access.

1. The client starts checkout through a server-side endpoint.
2. Stripe, Apple, Google or another provider confirms payment to a signed webhook.
3. The webhook verifies the provider signature.
4. Trusted server-side code writes `public.player_subscriptions` with the Supabase service role.
5. The authenticated client may only read the row where `auth.uid() = user_id`.
6. The game derives feature access through `SubscriptionAccess.js`.

The `authenticated` and `anon` roles cannot insert, update or delete entitlement rows.

## Required production endpoints

These endpoints are intentionally not included until the payment provider and merchant account are selected and configured:

- `POST /api/billing/checkout-session`
- `POST /api/billing/customer-portal`
- `POST /api/billing/webhook`
- `GET /api/billing/subscription`

## Webhook requirements

The webhook implementation must be idempotent and must:

- verify the raw request signature,
- reject unknown price/product identifiers,
- map provider states to the internal plan and status enums,
- use provider event IDs for replay protection,
- update entitlement only after verified events,
- log failures without logging secrets or full payment data.

## Backward compatibility

Missing, malformed or expired subscription data resolves to the free tier. Existing saves, chess rules, multiplayer messages and guest mode remain valid.

## Validation before merge

- Unit tests for entitlement normalization and expiration.
- Migration review for RLS and grants.
- CI typecheck, unit tests and production build.
- Manual verification that free users retain all current functionality.
- Provider sandbox tests before any real-money release.
