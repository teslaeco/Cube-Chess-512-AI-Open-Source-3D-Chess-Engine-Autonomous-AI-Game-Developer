create table if not exists public.forum_topics (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 80),
  title text not null check (char_length(title) between 4 and 120),
  category text not null default 'general' check (category in ('general','rules','bugs','ideas','tournaments')),
  body text not null check (char_length(body) between 10 and 5000),
  reply_count integer not null default 0 check (reply_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.forum_topics(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 80),
  body text not null check (char_length(body) between 2 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.forum_topics enable row level security;
alter table public.forum_replies enable row level security;

create policy "authenticated users read forum topics"
on public.forum_topics for select
to authenticated
using (true);

create policy "authenticated users create own forum topics"
on public.forum_topics for insert
to authenticated
with check (auth.uid() = author_id);

create policy "authors update own forum topics"
on public.forum_topics for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "authors delete own forum topics"
on public.forum_topics for delete
to authenticated
using (auth.uid() = author_id);

create policy "authenticated users read forum replies"
on public.forum_replies for select
to authenticated
using (true);

create policy "authenticated users create own forum replies"
on public.forum_replies for insert
to authenticated
with check (auth.uid() = author_id);

create policy "authors update own forum replies"
on public.forum_replies for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "authors delete own forum replies"
on public.forum_replies for delete
to authenticated
using (auth.uid() = author_id);

create or replace function public.update_forum_reply_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.forum_topics set reply_count = reply_count + 1, updated_at = now() where id = new.topic_id;
    return new;
  end if;
  if tg_op = 'DELETE' then
    update public.forum_topics set reply_count = greatest(0, reply_count - 1), updated_at = now() where id = old.topic_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists forum_reply_count_insert on public.forum_replies;
create trigger forum_reply_count_insert after insert on public.forum_replies
for each row execute function public.update_forum_reply_count();

drop trigger if exists forum_reply_count_delete on public.forum_replies;
create trigger forum_reply_count_delete after delete on public.forum_replies
for each row execute function public.update_forum_reply_count();

create index if not exists forum_topics_created_at_idx on public.forum_topics(created_at desc);
create index if not exists forum_replies_topic_created_idx on public.forum_replies(topic_id, created_at);
