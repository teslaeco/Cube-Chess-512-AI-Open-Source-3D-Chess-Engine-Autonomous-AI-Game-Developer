-- Cube Chess 512: initial public player profiles schema.
-- Authentication identities remain owned by Supabase Auth (auth.users).

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text,
  avatar_url text,
  bio text,
  country_code text,
  preferred_locale text not null default 'en',
  elo_rating integer not null default 1200,
  games_played integer not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 24),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]+$'),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) <= 50),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 280),
  constraint profiles_country_code_format check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint profiles_elo_nonnegative check (elo_rating >= 0),
  constraint profiles_stats_nonnegative check (
    games_played >= 0 and wins >= 0 and draws >= 0 and losses >= 0
  ),
  constraint profiles_stats_consistent check (games_played = wins + draws + losses)
);

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

create index if not exists profiles_elo_rating_idx
  on public.profiles (elo_rating desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
begin
  requested_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    'player_' || substr(replace(new.id::text, '-', ''), 1, 12)
  );

  insert into public.profiles (id, username, display_name, avatar_url, preferred_locale)
  values (
    new.id,
    requested_username,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'en')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

-- Public leaderboard/profile data is readable by everyone.
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles
for select
using (true);

-- Players may edit only non-authoritative profile fields.
-- Rating, statistics and premium state must be changed by trusted server code.
drop policy if exists "Players can update their own profile" on public.profiles;
create policy "Players can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and elo_rating = (select p.elo_rating from public.profiles p where p.id = auth.uid())
  and games_played = (select p.games_played from public.profiles p where p.id = auth.uid())
  and wins = (select p.wins from public.profiles p where p.id = auth.uid())
  and draws = (select p.draws from public.profiles p where p.id = auth.uid())
  and losses = (select p.losses from public.profiles p where p.id = auth.uid())
  and is_premium = (select p.is_premium from public.profiles p where p.id = auth.uid())
);

-- Direct client inserts/deletes are intentionally not permitted.
-- New rows are created by the auth trigger; account deletion cascades from auth.users.

grant select on public.profiles to anon, authenticated;
grant update (username, display_name, avatar_url, bio, country_code, preferred_locale)
  on public.profiles to authenticated;
