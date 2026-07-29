# Supabase player profiles

This stage adds the first production-oriented database object for Cube Chess 512: `public.profiles`.

## Scope

The migration creates:

- one profile row per Supabase Auth user,
- case-insensitive unique usernames,
- public profile and leaderboard reads,
- player-editable display fields,
- server-controlled ELO, match statistics and premium state,
- automatic profile creation after signup,
- automatic `updated_at` maintenance,
- row-level security.

No credentials, project URLs or service-role keys are stored in the repository.

## Apply locally

Install the Supabase CLI, link a development project, then run:

```bash
supabase db push
```

For a fresh local environment:

```bash
supabase start
supabase db reset
```

## Required Supabase dashboard setup

1. Create a Supabase project owned by the Terraforming Planet organization account.
2. Add the production and local callback URLs in Authentication > URL Configuration.
3. Enable providers only after their OAuth client IDs and secrets are available.
4. Keep the `service_role` key on the trusted backend only. Never expose it to Vite or GitHub Pages.
5. Put public browser values in deployment environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Put server-only values in Render secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Security model

Clients may read profiles and update only these fields on their own row:

- `username`
- `display_name`
- `avatar_url`
- `bio`
- `country_code`
- `preferred_locale`

The following fields are authoritative and must be updated only by the trusted game server:

- `elo_rating`
- `games_played`
- `wins`
- `draws`
- `losses`
- `is_premium`

Future migrations should add game history, friendships and tournament tables without weakening these rules.

## Manual verification

After applying the migration:

1. Register a test user.
2. Confirm a matching row appears in `public.profiles`.
3. Confirm anonymous users can select profiles.
4. Confirm the signed-in user can change `display_name`.
5. Confirm the signed-in user cannot directly change `elo_rating` or `is_premium`.
6. Delete the test Auth user and confirm the profile row is removed by cascade.
