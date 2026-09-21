-- VELDRYN — chat usability projections for unread dividers.
begin;

create or replace function public.social_chat_attention_state_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();
 v_gid uuid;
 v_pid uuid;
 v_display_name text;
 v_guild_read timestamptz;
 v_party_read timestamptz;
 v_now timestamptz:=clock_timestamp();
 v_guild_unread integer:=0;
 v_party_unread integer:=0;
 v_guild_mentions integer:=0;
 v_party_mentions integer:=0;
 v_guild_first uuid;
 v_party_first uuid;
begin
 if v_uid is null then raise exception 'authentication_required';end if;

 select coalesce(nullif(pp.display_name,''),c.name,'Adventurer')
 into v_display_name
 from auth.users u
 left join public.player_profiles pp on pp.account_id=u.id
 left join lateral(
  select ch.name
  from public.characters ch
  where ch.account_id=u.id
  order by (ch.id=pp.active_character_id) desc,ch.updated_at desc
  limit 1
 ) c on true
 where u.id=v_uid;

 select gm.guild_id into v_gid
 from public.guild_members gm
 where gm.account_id=v_uid
 limit 1;

 select pm.party_id into v_pid
 from public.party_members pm
 join public.parties p on p.id=pm.party_id
 where pm.account_id=v_uid and pm.left_at is null and p.status<>'disbanded'
 limit 1;

 if v_gid is not null then
  select m.last_read_at into v_guild_read
  from public.chat_read_markers_v1 m
  where m.account_id=v_uid and m.channel_type='guild' and m.channel_id=v_gid::text;

  if v_guild_read is null then
   insert into public.chat_read_markers_v1(account_id,channel_type,channel_id,last_read_at,updated_at)
   values(v_uid,'guild',v_gid::text,v_now,v_now)
   on conflict(account_id,channel_type,channel_id) do nothing;
   v_guild_read:=v_now;
  end if;

  select count(*)::integer,
         count(*) filter(where position('@'||lower(v_display_name) in lower(cm.body))>0)::integer
  into v_guild_unread,v_guild_mentions
  from public.chat_messages cm
  where cm.channel_type='guild'
    and cm.channel_id=v_gid::text
    and cm.created_at>v_guild_read
    and cm.account_id<>v_uid
    and not exists(
      select 1 from public.player_blocks b
      where (b.blocker_id=v_uid and b.blocked_id=cm.account_id)
         or (b.blocked_id=v_uid and b.blocker_id=cm.account_id)
    );

  select cm.id into v_guild_first
  from public.chat_messages cm
  where cm.channel_type='guild'
    and cm.channel_id=v_gid::text
    and cm.created_at>v_guild_read
    and cm.account_id<>v_uid
    and not exists(
      select 1 from public.player_blocks b
      where (b.blocker_id=v_uid and b.blocked_id=cm.account_id)
         or (b.blocked_id=v_uid and b.blocker_id=cm.account_id)
    )
  order by cm.created_at,cm.id
  limit 1;
 end if;

 if v_pid is not null then
  select m.last_read_at into v_party_read
  from public.chat_read_markers_v1 m
  where m.account_id=v_uid and m.channel_type='party' and m.channel_id=v_pid::text;

  if v_party_read is null then
   insert into public.chat_read_markers_v1(account_id,channel_type,channel_id,last_read_at,updated_at)
   values(v_uid,'party',v_pid::text,v_now,v_now)
   on conflict(account_id,channel_type,channel_id) do nothing;
   v_party_read:=v_now;
  end if;

  select count(*)::integer,
         count(*) filter(where position('@'||lower(v_display_name) in lower(cm.body))>0)::integer
  into v_party_unread,v_party_mentions
  from public.chat_messages cm
  where cm.channel_type='party'
    and cm.channel_id=v_pid::text
    and cm.created_at>v_party_read
    and cm.account_id<>v_uid
    and not exists(
      select 1 from public.player_blocks b
      where (b.blocker_id=v_uid and b.blocked_id=cm.account_id)
         or (b.blocked_id=v_uid and b.blocker_id=cm.account_id)
    );

  select cm.id into v_party_first
  from public.chat_messages cm
  where cm.channel_type='party'
    and cm.channel_id=v_pid::text
    and cm.created_at>v_party_read
    and cm.account_id<>v_uid
    and not exists(
      select 1 from public.player_blocks b
      where (b.blocker_id=v_uid and b.blocked_id=cm.account_id)
         or (b.blocked_id=v_uid and b.blocker_id=cm.account_id)
    )
  order by cm.created_at,cm.id
  limit 1;
 end if;

 return jsonb_build_object(
  'guild',jsonb_build_object(
    'channelId',v_gid,
    'unread',v_guild_unread,
    'mentions',v_guild_mentions,
    'lastReadAt',v_guild_read,
    'firstUnreadMessageId',v_guild_first
  ),
  'party',jsonb_build_object(
    'channelId',v_pid,
    'unread',v_party_unread,
    'mentions',v_party_mentions,
    'lastReadAt',v_party_read,
    'firstUnreadMessageId',v_party_first
  ),
  'totalUnread',v_guild_unread+v_party_unread,
  'totalMentions',v_guild_mentions+v_party_mentions,
  'serverTime',v_now
 );
end
$$;

revoke all on function public.social_chat_attention_state_v1() from public,anon;
grant execute on function public.social_chat_attention_state_v1() to authenticated;

comment on function public.social_chat_attention_state_v1() is 'Returns unread/mention counts plus the first unread message ID for current Guild and persistent Party chat.';
commit;
