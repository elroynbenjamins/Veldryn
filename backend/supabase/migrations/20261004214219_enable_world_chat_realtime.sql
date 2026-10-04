-- World chat now listens for INSERT notifications in addition to bounded polling.
-- Keep the existing publication and its other tables (including co-op snapshots).
-- Existing SELECT grants and channel-scoped RLS continue to govern delivery.
-- A bare PostgreSQL development database may not have Supabase's publication.
do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
      and not puballtables
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end
$$;
