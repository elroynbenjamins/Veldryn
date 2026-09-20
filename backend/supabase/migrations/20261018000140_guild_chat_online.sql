-- VELDRYN — authoritative Guild Chat.
-- Replaces the mobile-only preview with a membership-scoped, moderated channel.
begin;

create or replace function public.guild_chat_state_v1(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();
 v_gid uuid;
 v_guild_name text;
 v_tag text;
 v_tag_color text;
 v_messages jsonb;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 select gm.guild_id,g.name,g.tag,g.tag_color_id
 into v_gid,v_guild_name,v_tag,v_tag_color
 from public.guild_members gm
 join public.guilds g on g.id=gm.guild_id
 where gm.account_id=v_uid
 limit 1;

 if v_gid is null then
  return jsonb_build_object('guild',null,'messages','[]'::jsonb,'serverTime',clock_timestamp());
 end if;

 select coalesce(jsonb_agg(jsonb_build_object(
  'id',rows.id,
  'account_id',rows.account_id,
  'sender_name',rows.sender_name,
  'body',rows.body,
  'created_at',rows.created_at,
  'guild_tag',v_tag,
  'guild_tag_color_id',v_tag_color,
  'guild_role',rows.guild_role
 ) order by rows.created_at,rows.id),'[]'::jsonb)
 into v_messages
 from (
  select m.id,m.account_id,m.sender_name,m.body,m.created_at,gm.role guild_role
  from public.chat_messages m
  left join public.guild_members gm on gm.guild_id=v_gid and gm.account_id=m.account_id
  where m.channel_type='guild'
    and m.channel_id=v_gid::text
    and not exists(
      select 1 from public.player_blocks b
      where (b.blocker_id=v_uid and b.blocked_id=m.account_id)
         or (b.blocked_id=v_uid and b.blocker_id=m.account_id)
    )
  order by m.created_at desc,m.id desc
  limit greatest(1,least(coalesce(p_limit,50),100))
 ) rows;

 return jsonb_build_object(
  'guild',jsonb_build_object('id',v_gid,'name',v_guild_name,'tag',v_tag,'tagColorId',v_tag_color),
  'messages',v_messages,
  'serverTime',clock_timestamp()
 );
end
$$;

create or replace function public.send_guild_chat_v1(p_body text,p_idempotency_key text)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();
 v_gid uuid;
 v_body text:=trim(coalesce(p_body,''));
 v_term public.chat_filter_terms%rowtype;
 v_id uuid;
 v_response jsonb;
 v_sender_name text;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if char_length(coalesce(p_idempotency_key,'')) not between 8 and 160 then raise exception 'invalid_idempotency_key';end if;
 if char_length(v_body) not between 1 and 300 then raise exception 'INVALID_MESSAGE_LENGTH';end if;

 select gm.guild_id into v_gid
 from public.guild_members gm
 where gm.account_id=v_uid
 limit 1;
 if v_gid is null then raise exception 'NOT_IN_GUILD';end if;

 perform pg_advisory_xact_lock(hashtextextended('guild-chat:'||v_uid::text,0));

 select r.response into v_response
 from public.server_action_receipts r
 where r.account_id=v_uid and r.action='guild_chat' and r.idempotency_key=p_idempotency_key;
 if found then return (v_response->>'message_id')::uuid;end if;

 if exists(select 1 from public.chat_account_sanctions s where s.account_id=v_uid and s.muted_until>now()) then
  raise exception 'CHAT_MUTED';
 end if;
 if (select count(*) from public.chat_messages m where m.account_id=v_uid and m.created_at>now()-interval '10 seconds')>=3 then
  raise exception 'CHAT_COOLDOWN';
 end if;
 if (select count(*) from public.chat_messages m where m.account_id=v_uid and m.created_at>now()-interval '1 minute')>=15 then
  raise exception 'CHAT_RATE_LIMIT';
 end if;

 for v_term in select * from public.chat_filter_terms where enabled loop
  if position(v_term.normalized_term in lower(v_body))>0 then
   if v_term.action in('block','mute_review') then raise exception 'MESSAGE_BLOCKED';end if;
   v_body:=replace(lower(v_body),v_term.normalized_term,repeat('•',char_length(v_term.normalized_term)));
  end if;
 end loop;

 select left(coalesce(nullif(pp.display_name,''),'Adventurer'),20)
 into v_sender_name
 from public.player_profiles pp
 where pp.account_id=v_uid;
 v_sender_name:=coalesce(v_sender_name,'Adventurer');

 insert into public.chat_messages(account_id,channel_type,channel_id,sender_name,body)
 values(v_uid,'guild',v_gid::text,v_sender_name,v_body)
 returning id into v_id;

 insert into public.server_action_receipts(account_id,action,idempotency_key,response)
 values(v_uid,'guild_chat',p_idempotency_key,jsonb_build_object('message_id',v_id));

 return v_id;
end
$$;

revoke all on function public.guild_chat_state_v1(integer),public.send_guild_chat_v1(text,text) from public,anon;
grant execute on function public.guild_chat_state_v1(integer),public.send_guild_chat_v1(text,text) to authenticated;

comment on function public.guild_chat_state_v1(integer) is 'Returns only the authenticated account current Guild chat, filtering blocked relationships.';
comment on function public.send_guild_chat_v1(text,text) is 'Server-authoritative moderated Guild chat send with membership, rate-limit and idempotency enforcement.';
commit;
