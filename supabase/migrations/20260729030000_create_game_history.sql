-- Cube Chess 512: authoritative game history.
-- This migration depends on public.profiles from the previous schema stage.

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  white_player_id uuid not null references public.profiles(id) on delete restrict,
  black_player_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'waiting',
  result text,
  winner_id uuid references public.profiles(id) on delete restrict,
  termination_reason text,
  initial_position jsonb not null default '{}'::jsonb,
  final_position jsonb,
  move_count integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint games_distinct_players check (white_player_id <> black_player_id),
  constraint games_status_valid check (status in ('waiting', 'active', 'finished', 'aborted')),
  constraint games_result_valid check (result is null or result in ('white_win', 'black_win', 'draw')),
  constraint games_move_count_nonnegative check (move_count >= 0),
  constraint games_finished_consistency check (
    (status = 'finished' and result is not null and finished_at is not null)
    or (status <> 'finished' and result is null)
  ),
  constraint games_winner_consistency check (
    (result = 'draw' and winner_id is null)
    or (result = 'white_win' and winner_id = white_player_id)
    or (result = 'black_win' and winner_id = black_player_id)
    or result is null
  )
);

create table if not exists public.game_moves (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  ply integer not null,
  player_id uuid not null references public.profiles(id) on delete restrict,
  move jsonb not null,
  position_hash text,
  created_at timestamptz not null default now(),
  constraint game_moves_ply_positive check (ply > 0),
  constraint game_moves_unique_ply unique (game_id, ply)
);

create index if not exists games_white_player_idx
  on public.games (white_player_id, created_at desc);

create index if not exists games_black_player_idx
  on public.games (black_player_id, created_at desc);

create index if not exists games_status_idx
  on public.games (status, created_at desc);

create index if not exists game_moves_game_idx
  on public.game_moves (game_id, ply);

create or replace function public.validate_game_move_player()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  white_id uuid;
  black_id uuid;
begin
  select white_player_id, black_player_id
  into white_id, black_id
  from public.games
  where id = new.game_id;

  if new.player_id <> white_id and new.player_id <> black_id then
    raise exception 'Move player must participate in the game';
  end if;

  return new;
end;
$$;

drop trigger if exists game_moves_validate_player on public.game_moves;
create trigger game_moves_validate_player
before insert or update on public.game_moves
for each row execute function public.validate_game_move_player();

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at
before update on public.games
for each row execute function public.set_updated_at();

alter table public.games enable row level security;
alter table public.game_moves enable row level security;

-- Players may read their own games. Public spectator access should be added later
-- through a dedicated view that exposes only explicitly public matches.
drop policy if exists "Players can read their own games" on public.games;
create policy "Players can read their own games"
on public.games
for select
to authenticated
using (auth.uid() = white_player_id or auth.uid() = black_player_id);

drop policy if exists "Players can read moves from their own games" on public.game_moves;
create policy "Players can read moves from their own games"
on public.game_moves
for select
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = game_moves.game_id
      and (auth.uid() = g.white_player_id or auth.uid() = g.black_player_id)
  )
);

-- No direct client writes are granted. The trusted multiplayer server owns all
-- inserts and updates using the Supabase service-role key.
grant select on public.games to authenticated;
grant select on public.game_moves to authenticated;
