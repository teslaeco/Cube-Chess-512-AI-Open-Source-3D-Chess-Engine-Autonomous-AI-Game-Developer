-- Cube Chess 512: secure friend requests and accepted friendships.
-- Depends on public.profiles from the initial Supabase profile migration.

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friend_requests_distinct_players check (requester_id <> recipient_id),
  constraint friend_requests_unique_direction unique (requester_id, recipient_id)
);

create table if not exists public.friendships (
  player_one_id uuid not null references public.profiles(id) on delete cascade,
  player_two_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_one_id, player_two_id),
  constraint friendships_canonical_order check (player_one_id < player_two_id)
);

create index if not exists friend_requests_recipient_idx
  on public.friend_requests (recipient_id, created_at desc);

create index if not exists friendships_player_two_idx
  on public.friendships (player_two_id, created_at desc);

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

-- A signed-in player can see requests they sent or received.
drop policy if exists "Players can read their friend requests" on public.friend_requests;
create policy "Players can read their friend requests"
on public.friend_requests
for select
to authenticated
using (auth.uid() = requester_id or auth.uid() = recipient_id);

-- Players may create only requests originating from their own account.
-- Existing friendships and reverse pending requests are rejected by the trigger below.
drop policy if exists "Players can send friend requests" on public.friend_requests;
create policy "Players can send friend requests"
on public.friend_requests
for insert
to authenticated
with check (auth.uid() = requester_id and requester_id <> recipient_id);

-- The sender may cancel a pending request. Accept/reject uses dedicated RPC functions.
drop policy if exists "Players can cancel sent friend requests" on public.friend_requests;
create policy "Players can cancel sent friend requests"
on public.friend_requests
for delete
to authenticated
using (auth.uid() = requester_id);

-- Accepted friendships are visible only to the two players involved.
drop policy if exists "Players can read their friendships" on public.friendships;
create policy "Players can read their friendships"
on public.friendships
for select
to authenticated
using (auth.uid() = player_one_id or auth.uid() = player_two_id);

create or replace function public.validate_friend_request()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  canonical_one uuid;
  canonical_two uuid;
begin
  canonical_one := least(new.requester_id, new.recipient_id);
  canonical_two := greatest(new.requester_id, new.recipient_id);

  if exists (
    select 1
    from public.friendships f
    where f.player_one_id = canonical_one
      and f.player_two_id = canonical_two
  ) then
    raise exception 'Players are already friends';
  end if;

  if exists (
    select 1
    from public.friend_requests r
    where r.requester_id = new.recipient_id
      and r.recipient_id = new.requester_id
  ) then
    raise exception 'A reverse friend request already exists';
  end if;

  return new;
end;
$$;

drop trigger if exists friend_requests_validate on public.friend_requests;
create trigger friend_requests_validate
before insert on public.friend_requests
for each row execute function public.validate_friend_request();

create or replace function public.accept_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.friend_requests%rowtype;
begin
  select *
  into request_row
  from public.friend_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Friend request not found';
  end if;

  if auth.uid() is null or auth.uid() <> request_row.recipient_id then
    raise exception 'Only the recipient can accept this request';
  end if;

  insert into public.friendships (player_one_id, player_two_id)
  values (
    least(request_row.requester_id, request_row.recipient_id),
    greatest(request_row.requester_id, request_row.recipient_id)
  )
  on conflict do nothing;

  delete from public.friend_requests
  where id = request_id;
end;
$$;

create or replace function public.reject_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_recipient uuid;
begin
  select recipient_id
  into request_recipient
  from public.friend_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Friend request not found';
  end if;

  if auth.uid() is null or auth.uid() <> request_recipient then
    raise exception 'Only the recipient can reject this request';
  end if;

  delete from public.friend_requests
  where id = request_id;
end;
$$;

create or replace function public.remove_friend(friend_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.friendships
  where auth.uid() is not null
    and (
      (player_one_id = least(auth.uid(), friend_id) and player_two_id = greatest(auth.uid(), friend_id))
    );
$$;

grant select, insert, delete on public.friend_requests to authenticated;
grant select on public.friendships to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.reject_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
