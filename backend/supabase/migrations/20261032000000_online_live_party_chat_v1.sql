-- Service-owned Live party chat transport. The channel is scoped to the
-- membership epoch so removed members cannot read or write future messages.
begin;

create or replace function public.online_live_party_chat_server_v1(
 p_run_id uuid,
 p_account_id uuid,
 p_request_id text default null,
 p_body text default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_epoch integer;v_channel text;v_body text:=trim(coalesce(p_body,''));v_id uuid;v_response jsonb;v_term public.chat_filter_terms%rowtype;
begin
 select channel_epoch into v_epoch from public.coop_run_access_memberships a join public.expedition_runs r on r.id=a.run_id
 where a.run_id=p_run_id and a.account_id=p_account_id and a.active and r.coop_mode='live';
 if v_epoch is null then raise exception 'not_participant';end if;
 v_channel:=p_run_id::text||':'||v_epoch::text;
 if p_body is not null then
  if char_length(coalesce(p_request_id,'')) not between 8 and 128 then raise exception 'invalid_request';end if;
  select response_json into v_response from public.coop_idempotency_receipts where caller_account_id=p_account_id and operation='live_chat_v1' and resource_id=v_channel and request_id=p_request_id;
  if found then return v_response;end if;
  if char_length(v_body) not between 1 and 300 then raise exception 'invalid_message_length';end if;
  if exists(select 1 from public.chat_account_sanctions where account_id=p_account_id and muted_until>clock_timestamp()) then raise exception 'chat_muted';end if;
  if (select count(*) from public.chat_messages where account_id=p_account_id and created_at>clock_timestamp()-interval '10 seconds')>=3 then raise exception 'chat_cooldown';end if;
  if (select count(*) from public.chat_messages where account_id=p_account_id and created_at>clock_timestamp()-interval '1 minute')>=15 then raise exception 'chat_rate_limit';end if;
  for v_term in select * from public.chat_filter_terms where enabled loop
   if position(v_term.normalized_term in lower(v_body))>0 then
    if v_term.action='block' then raise exception 'message_blocked';end if;
    v_body:=replace(lower(v_body),v_term.normalized_term,repeat('•',char_length(v_term.normalized_term)));
   end if;
  end loop;
  insert into public.chat_messages(account_id,channel_type,channel_id,sender_name,body)
  values(p_account_id,'party',v_channel,coalesce((select display_name from public.player_profiles where account_id=p_account_id),'Adventurer'),v_body) returning id into v_id;
  v_response:=jsonb_build_object('sent',true,'messageId',v_id);
  insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json)
  values(p_account_id,'live_chat_v1',v_channel,p_request_id,md5(v_body),v_response);
 end if;
 return jsonb_build_object('sent',coalesce((v_response->>'sent')::boolean,false),'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'senderName',m.sender_name,'body',m.body,'createdAt',floor(extract(epoch from m.created_at)*1000)) order by m.created_at asc) from (select * from public.chat_messages where channel_type='party' and channel_id=v_channel order by created_at desc limit 50) m),'[]'::jsonb));
end; $$;

revoke all on function public.online_live_party_chat_server_v1(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.online_live_party_chat_server_v1(uuid,uuid,text,text) to service_role;
commit;
