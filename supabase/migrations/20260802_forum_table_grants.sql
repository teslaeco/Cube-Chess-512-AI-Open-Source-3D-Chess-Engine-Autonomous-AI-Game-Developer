-- RLS policies do not replace PostgreSQL table privileges.
-- The original forum migration enabled RLS and created policies, but did not
-- grant the authenticated role access to the tables. PostgREST therefore
-- returned: permission denied for table forum_topics.

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.forum_topics to authenticated;
grant select, insert, update, delete on table public.forum_replies to authenticated;

-- Keep anonymous visitors fully blocked. The UI also requires an account,
-- while these revokes enforce the rule at database level.
revoke all on table public.forum_topics from anon;
revoke all on table public.forum_replies from anon;
