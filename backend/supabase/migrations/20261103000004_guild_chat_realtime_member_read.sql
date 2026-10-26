-- Guild Chat realtime read events must be visible to members in their current Guild.
-- The authoritative RPC already reads these rows; Realtime Postgres Changes
-- additionally requires a SELECT RLS policy for the signed-in subscriber.
-- Keep visibility at least as strict as guild_chat_state_v1: current Guild only,
-- excluding players blocked in either direction. No new INSERT or UPDATE grant.
do $guild_realtime$
begin
 if not exists (
  select 1 from pg_catalog.pg_policies
  where schemaname='public' and tablename='chat_messages'
    and policyname='guild_chat_current_members_realtime_read_v1'
 ) then
  create policy guild_chat_current_members_realtime_read_v1
  on public.chat_messages
  for select to authenticated
  using (
 channel_type='guild'
 and exists (
  select 1 from public.guild_members gm
  where gm.guild_id::text=chat_messages.channel_id
    and gm.account_id=(select auth.uid())
 )
   and not public.party_social_blocked_v16(account_id)
  );
 end if;
end;
$guild_realtime$;
