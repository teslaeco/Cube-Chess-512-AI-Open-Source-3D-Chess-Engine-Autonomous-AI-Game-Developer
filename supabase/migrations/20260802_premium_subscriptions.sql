-- Premium entitlements are written only by a trusted billing webhook/service role.
-- The client may read only its own row. Payment-provider secrets never belong in the browser.

create table if not exists public.player_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'premium_monthly', 'premium_yearly', 'supporter')),
  status text not null default 'expired'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'expired')),
  provider text check (provider in ('stripe', 'apple', 'google', 'steam', 'manual')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists player_subscriptions_provider_subscription_idx
  on public.player_subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;

alter table public.player_subscriptions enable row level security;

drop policy if exists "players read own subscription" on public.player_subscriptions;
create policy "players read own subscription"
on public.player_subscriptions for select
to authenticated
using (auth.uid() = user_id);

-- Deliberately no INSERT, UPDATE or DELETE policy for authenticated/anon roles.
-- Billing state must only be changed by server-side code using the service role.
revoke all on table public.player_subscriptions from anon;
revoke insert, update, delete on table public.player_subscriptions from authenticated;
grant select on table public.player_subscriptions to authenticated;

create or replace function public.touch_player_subscription_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists player_subscriptions_touch_updated_at on public.player_subscriptions;
create trigger player_subscriptions_touch_updated_at
before update on public.player_subscriptions
for each row execute function public.touch_player_subscription_updated_at();
