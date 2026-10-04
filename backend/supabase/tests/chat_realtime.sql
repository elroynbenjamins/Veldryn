-- Read-only schema and access verification. Creates no users or chat messages.
-- Run after enable_world_chat_realtime; a real INSERT delivery smoke test also
-- needs two signed-in clients and an ordinary player-authored message.
begin read only;

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    raise exception 'Supabase Realtime publication is missing';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    raise exception 'Chat messages are not published for Realtime';
  end if;

  if to_regclass('public.coop_run_client_snapshots') is not null
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'coop_run_client_snapshots'
    ) then
    raise exception 'Existing co-op snapshot publication was lost';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.chat_messages'::regclass) then
    raise exception 'Chat row-level security must remain enabled';
  end if;

  if not has_table_privilege('authenticated', 'public.chat_messages', 'SELECT') then
    raise exception 'Signed-in players cannot read chat';
  end if;

  if has_table_privilege('anon', 'public.chat_messages', 'SELECT') then
    raise exception 'Unauthenticated public clients can read chat';
  end if;

  if has_table_privilege('authenticated', 'public.chat_messages', 'INSERT')
    or has_table_privilege('authenticated', 'public.chat_messages', 'UPDATE')
    or has_table_privilege('authenticated', 'public.chat_messages', 'DELETE') then
    raise exception 'Client chat writes must still use the moderated server RPCs';
  end if;

  -- Use an ephemeral request identity, without inserting an auth user or session.
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', gen_random_uuid(), 'role', 'authenticated', 'is_anonymous', true
  )::text, true);
end
$$;

set local role authenticated;

do $$
begin
  if auth.uid() is null or current_user <> 'authenticated' then
    raise exception 'Chat access check is not using an authenticated guest request';
  end if;
  if exists (
    select 1 from public.chat_messages
    where channel_type <> 'world'
      or channel_id not in ('world-1', 'world-2', 'world-3', 'world-4')
  ) then
    raise exception 'A non-member request can read a private chat channel';
  end if;
end
$$;

-- Return counts and timestamps only, never player names or message contents.
with newest_page as (
  select id, created_at
  from public.chat_messages
  where channel_type = 'world' and channel_id = 'world-1'
  order by created_at desc, id desc
  limit 50
)
select
  'PASS: chat publication, co-op preservation, moderated writes and guest read scope' as result,
  count(*) as latest_page_count,
  max(created_at) as latest_message_at
from newest_page;

rollback;
