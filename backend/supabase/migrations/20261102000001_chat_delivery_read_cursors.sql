-- VELDRYN: retry-safe World sends and acknowledgements of displayed messages.
-- Keep the old callable RPCs for installed clients. New clients use the v2
-- requests below and never substitute a server-clock acknowledgement.
begin;

alter table public.chat_read_markers_v1
 add column if not exists last_read_message_id uuid,
 add column if not exists has_read_message boolean not null default false;

-- No foreign key: pruning/moderating a message must not erase a read frontier.
comment on column public.chat_read_markers_v1.last_read_message_id is
'Last displayed message UUID paired with last_read_at for stable timestamp ties; retained after message pruning.';
comment on column public.chat_read_markers_v1.has_read_message is
'False for initial/legacy baselines. The first displayed-message acknowledgement establishes the exact cursor; later acknowledgements only advance it.';

create or replace function public.send_world_chat_v2(
 p_channel_id text,
 p_body text,
 p_sender_name text,
 p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();
 v_body text:=trim(coalesce(p_body,''));
 v_request_hash text;
 v_response jsonb;
 v_id uuid;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_channel_id is null or p_channel_id not in('world-1','world-2','world-3','world-4') then
  raise exception 'INVALID_WORLD_CHANNEL';
 end if;
 if char_length(v_body) not between 1 and 300 then raise exception 'INVALID_MESSAGE_LENGTH';end if;
 if char_length(coalesce(p_idempotency_key,'')) not between 8 and 160 then raise exception 'invalid_idempotency_key';end if;

 -- Bind retries to the actual message intent without retaining a second copy
 -- of its plaintext in the receipt ledger. The sender hint is not authoritative.
 v_request_hash:=encode(sha256(convert_to(jsonb_build_array(p_channel_id,v_body)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('world-chat:'||v_uid::text,0));

 select r.response into v_response
 from public.server_action_receipts r
 where r.account_id=v_uid and r.action='world_chat_v2' and r.idempotency_key=p_idempotency_key;
 if found then
  if v_response->>'request_hash' is distinct from v_request_hash then
   raise exception 'idempotency_key_conflict';
  end if;
  return (v_response->>'message_id')::uuid;
 end if;

 -- Reuse the installed authoritative moderation, sanctions, burst limits and
 -- profile-name selection. Its shared message trigger still checks emotes.
 -- Receipts are checked first: a lost response must not turn a valid retry into
 -- a cooldown/mute failure or post the message again after moderation/pruning.
 v_id:=public.send_world_chat(p_channel_id,v_body,p_sender_name);
 insert into public.server_action_receipts(account_id,action,idempotency_key,response)
 values(v_uid,'world_chat_v2',p_idempotency_key,jsonb_build_object('message_id',v_id,'request_hash',v_request_hash));
 return v_id;
end
$$;

create or replace function public.mark_social_chat_read_v2(
 p_channel_type text,
 p_channel_id text,
 p_message_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();
 v_channel_id text;
 v_message_time timestamptz;
 v_marker public.chat_read_markers_v1%rowtype;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if p_channel_type is null or p_channel_type not in('guild','party') then raise exception 'invalid_chat_channel';end if;
 if p_message_id is null then raise exception 'chat_message_unavailable';end if;

 -- Lock current membership while acknowledging. A request from a retained old
 -- channel cannot mark a newly joined Guild/Party read or outlive departure.
 if p_channel_type='guild' then
  select gm.guild_id::text into v_channel_id
  from public.guild_members gm
  where gm.account_id=v_uid
  limit 1 for share;
 else
  select pm.party_id::text into v_channel_id
  from public.party_members pm
  join public.parties p on p.id=pm.party_id
  where pm.account_id=v_uid and pm.left_at is null and p.status<>'disbanded'
  limit 1 for share of pm,p;
 end if;
 if v_channel_id is null or v_channel_id is distinct from p_channel_id then
  raise exception 'chat_channel_unavailable';
 end if;

 select m.* into v_marker
 from public.chat_read_markers_v1 m
 where m.account_id=v_uid and m.channel_type=p_channel_type and m.channel_id=v_channel_id;
 -- An already accepted exact retry stays valid if the acknowledged message was
 -- subsequently pruned or blocked. It changes no state and grants no history.
 if found and v_marker.has_read_message and v_marker.last_read_message_id=p_message_id then
  return jsonb_build_object('channelType',p_channel_type,'channelId',v_channel_id,
    'readAt',v_marker.last_read_at,'readMessageId',v_marker.last_read_message_id);
 end if;

 select cm.created_at into v_message_time
 from public.chat_messages cm
 where cm.id=p_message_id
   and cm.channel_type=p_channel_type
   and cm.channel_id=v_channel_id
   and not exists(
    select 1 from public.player_blocks b
    where (b.blocker_id=v_uid and b.blocked_id=cm.account_id)
       or (b.blocked_id=v_uid and b.blocker_id=cm.account_id)
   );
 if not found then raise exception 'chat_message_unavailable';end if;

 insert into public.chat_read_markers_v1 as current_marker
  (account_id,channel_type,channel_id,last_read_at,last_read_message_id,has_read_message,updated_at)
 values(v_uid,p_channel_type,v_channel_id,v_message_time,p_message_id,true,clock_timestamp())
 on conflict(account_id,channel_type,channel_id) do update
 set last_read_at=excluded.last_read_at,
     last_read_message_id=excluded.last_read_message_id,
     has_read_message=true,
     updated_at=excluded.updated_at
 where not current_marker.has_read_message
    or (excluded.last_read_at,excluded.last_read_message_id)>
       (current_marker.last_read_at,current_marker.last_read_message_id)
 returning * into v_marker;

 -- An older/in-flight acknowledgement must not move the cursor backwards.
 if not found then
  select m.* into v_marker
  from public.chat_read_markers_v1 m
  where m.account_id=v_uid and m.channel_type=p_channel_type and m.channel_id=v_channel_id;
 end if;
 return jsonb_build_object('channelType',p_channel_type,'channelId',v_channel_id,
   'readAt',v_marker.last_read_at,'readMessageId',v_marker.last_read_message_id);
end
$$;

create or replace function public.mark_social_chat_read_v1(p_channel_type text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();
 v_channel_id text;
 v_message_id uuid;
 v_marker public.chat_read_markers_v1%rowtype;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if p_channel_type is null or p_channel_type not in('guild','party') then raise exception 'invalid_chat_channel';end if;
 if p_channel_type='guild' then
  select gm.guild_id::text into v_channel_id
  from public.guild_members gm where gm.account_id=v_uid limit 1 for share;
 else
  select pm.party_id::text into v_channel_id
  from public.party_members pm join public.parties p on p.id=pm.party_id
  where pm.account_id=v_uid and pm.left_at is null and p.status<>'disbanded'
  limit 1 for share of pm,p;
 end if;
 if v_channel_id is null then raise exception 'chat_channel_unavailable';end if;

 -- Older clients cannot provide a displayed-message ID. Keep their RPC but
 -- bound its best-effort acknowledgement to a visible stored message snapshot.
 select cm.id into v_message_id
 from public.chat_messages cm
 where cm.channel_type=p_channel_type and cm.channel_id=v_channel_id
   and not exists(
    select 1 from public.player_blocks b
    where (b.blocker_id=v_uid and b.blocked_id=cm.account_id)
       or (b.blocked_id=v_uid and b.blocker_id=cm.account_id)
   )
 order by cm.created_at desc,cm.id desc
 limit 1;
 if v_message_id is not null then
  return public.mark_social_chat_read_v2(p_channel_type,v_channel_id,v_message_id);
 end if;

 -- No message means nothing was read. Do not suppress a subsequent arrival by
 -- advancing an empty channel to the server clock.
 insert into public.chat_read_markers_v1(account_id,channel_type,channel_id,last_read_at)
 values(v_uid,p_channel_type,v_channel_id,'epoch'::timestamptz)
 on conflict(account_id,channel_type,channel_id) do nothing;
 select m.* into v_marker
 from public.chat_read_markers_v1 m
 where m.account_id=v_uid and m.channel_type=p_channel_type and m.channel_id=v_channel_id;
 return jsonb_build_object('channelType',p_channel_type,'channelId',v_channel_id,
   'readAt',case when v_marker.last_read_message_id is not null then v_marker.last_read_at end,
   'readMessageId',v_marker.last_read_message_id);
end
$$;

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
 v_now timestamptz:=clock_timestamp();
 v_channel record;
 v_marker public.chat_read_markers_v1%rowtype;
 v_initial_id uuid;
 v_initial_time timestamptz;
 v_unread integer;
 v_mentions integer;
 v_first uuid;
 v_total_unread integer:=0;
 v_total_mentions integer:=0;
 v_result jsonb:='{}'::jsonb;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 select coalesce(nullif(pp.display_name,''),c.name,'Adventurer')
 into v_display_name
 from auth.users u
 left join public.player_profiles pp on pp.account_id=u.id
 left join lateral(
  select ch.name from public.characters ch where ch.account_id=u.id
  order by (ch.id=pp.active_character_id) desc,ch.updated_at desc limit 1
 ) c on true
 where u.id=v_uid;
 select gm.guild_id into v_gid
 from public.guild_members gm where gm.account_id=v_uid limit 1;
 select pm.party_id into v_pid
 from public.party_members pm join public.parties p on p.id=pm.party_id
 where pm.account_id=v_uid and pm.left_at is null and p.status<>'disbanded'
 limit 1;

 for v_channel in select * from (values('guild',v_gid::text),('party',v_pid::text)) as channels(channel_type,channel_id) loop
  v_unread:=0;v_mentions:=0;v_first:=null;v_marker:=null;
  if v_channel.channel_id is not null then
   select m.* into v_marker from public.chat_read_markers_v1 m
   where m.account_id=v_uid and m.channel_type=v_channel.channel_type and m.channel_id=v_channel.channel_id;
   if not found then
    -- Preserve quiet first-view history, but remember this is only a baseline.
    -- If history was displayed before this query, its first real ACK may safely
    -- establish an earlier exact cursor and leave the intervening arrival unread.
    select cm.id,cm.created_at into v_initial_id,v_initial_time
    from public.chat_messages cm
    where cm.channel_type=v_channel.channel_type and cm.channel_id=v_channel.channel_id
      and not exists(
       select 1 from public.player_blocks b
       where (b.blocker_id=v_uid and b.blocked_id=cm.account_id)
          or (b.blocked_id=v_uid and b.blocker_id=cm.account_id)
      )
    order by cm.created_at desc,cm.id desc limit 1;
    insert into public.chat_read_markers_v1
     (account_id,channel_type,channel_id,last_read_at,last_read_message_id,has_read_message)
    values(v_uid,v_channel.channel_type,v_channel.channel_id,coalesce(v_initial_time,'epoch'::timestamptz),v_initial_id,false)
    on conflict(account_id,channel_type,channel_id) do nothing;
    -- A concurrently completed ACK takes precedence over this initial baseline.
    select m.* into v_marker from public.chat_read_markers_v1 m
    where m.account_id=v_uid and m.channel_type=v_channel.channel_type and m.channel_id=v_channel.channel_id;
   end if;

   select count(*)::integer,
          count(*) filter(where position('@'||lower(v_display_name) in lower(cm.body))>0)::integer
   into v_unread,v_mentions
   from public.chat_messages cm
   where cm.channel_type=v_channel.channel_type and cm.channel_id=v_channel.channel_id
     and (cm.created_at,cm.id)>(v_marker.last_read_at,coalesce(v_marker.last_read_message_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
     and cm.account_id<>v_uid
     and not exists(
      select 1 from public.player_blocks b
      where (b.blocker_id=v_uid and b.blocked_id=cm.account_id)
         or (b.blocked_id=v_uid and b.blocker_id=cm.account_id)
     );
   select cm.id into v_first
   from public.chat_messages cm
   where cm.channel_type=v_channel.channel_type and cm.channel_id=v_channel.channel_id
     and (cm.created_at,cm.id)>(v_marker.last_read_at,coalesce(v_marker.last_read_message_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
     and cm.account_id<>v_uid
     and not exists(
      select 1 from public.player_blocks b
      where (b.blocker_id=v_uid and b.blocked_id=cm.account_id)
         or (b.blocked_id=v_uid and b.blocker_id=cm.account_id)
     )
   order by cm.created_at,cm.id limit 1;
  end if;

  v_result:=v_result||jsonb_build_object(v_channel.channel_type,jsonb_build_object(
   'channelId',v_channel.channel_id,'unread',v_unread,'mentions',v_mentions,
   'lastReadAt',case when v_marker.last_read_at is distinct from 'epoch'::timestamptz then v_marker.last_read_at end,
   'lastReadMessageId',v_marker.last_read_message_id,'firstUnreadMessageId',v_first
  ));
  v_total_unread:=v_total_unread+v_unread;
  v_total_mentions:=v_total_mentions+v_mentions;
 end loop;
 return v_result||jsonb_build_object('totalUnread',v_total_unread,'totalMentions',v_total_mentions,'serverTime',v_now);
end
$$;

revoke all on function public.send_world_chat_v2(text,text,text,text),public.mark_social_chat_read_v2(text,text,uuid),
 public.mark_social_chat_read_v1(text),public.social_chat_attention_state_v1() from public,anon;
grant execute on function public.send_world_chat_v2(text,text,text,text),public.mark_social_chat_read_v2(text,text,uuid),
 public.mark_social_chat_read_v1(text),public.social_chat_attention_state_v1() to authenticated;

comment on function public.send_world_chat_v2(text,text,text,text) is
'Authoritative World send with account-scoped replay receipts bound to channel and normalized message intent.';
comment on function public.mark_social_chat_read_v2(text,text,uuid) is
'Acknowledges only a visible stored message in the authenticated account current Guild or persistent Party; exact cursors advance monotonically.';
comment on function public.mark_social_chat_read_v1(text) is
'Compatibility RPC for older clients; acknowledges the newest currently visible message snapshot without advancing an empty channel into the future.';
comment on function public.social_chat_attention_state_v1() is
'Unread and mention counts plus first-unread ID for current Guild/Party, using the same timestamp/UUID ordering as chat history.';

commit;
