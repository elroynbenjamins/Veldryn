-- Party channel IDs are <run uuid>:<membership epoch>. Only active Live humans may read.
create policy coop_party_chat_read_active_epoch on public.chat_messages for select using (
 channel_type='party' and exists (
  select 1 from public.coop_run_access_memberships a
  join public.expedition_runs r on r.id=a.run_id
  where r.coop_mode='live' and a.active and a.account_id=auth.uid()
    and split_part(chat_messages.channel_id,':',1)=a.run_id::text
    and split_part(chat_messages.channel_id,':',2)=a.channel_epoch::text
 )
);
