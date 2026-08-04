-- PR #105 removed the browser-side 5,000-character limit, but the live
-- Supabase database still rejected longer content through its CHECK constraints.
-- Keep the existing minimum-content validation while removing the upper bound.

alter table public.forum_topics
  drop constraint if exists forum_topics_body_check;

alter table public.forum_topics
  add constraint forum_topics_body_check
  check (char_length(btrim(body)) >= 10);

alter table public.forum_replies
  drop constraint if exists forum_replies_body_check;

alter table public.forum_replies
  add constraint forum_replies_body_check
  check (char_length(btrim(body)) >= 2);
