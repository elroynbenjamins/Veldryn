-- Persisted Live ready checks reuse queue reservations and ready response tables.
begin;
alter table public.coop_ready_checks add column if not exists frozen_roster_json jsonb;

create or replace function public.fail_online_live_ready_server_v1(p_check_id uuid,p_decliner uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare c public.coop_ready_checks;t public.matchmaking_tickets;v_now timestamptz:=clock_timestamp();v_retained integer:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended('online-live-ready',0));
 select * into c from public.coop_ready_checks where id=p_check_id for update;
 if not found or c.status<>'open' then return;end if;
 for t in select * from public.matchmaking_tickets where reservation_id=c.id order by account_id loop
  perform pg_advisory_xact_lock(hashtextextended('online-coop:'||t.account_id::text,0));
  if t.account_id is distinct from p_decliner and exists(select 1 from public.coop_ready_responses where ready_check_id=c.id and account_id=t.account_id and accept) then
   update public.coop_account_reservations set expires_at=v_now+interval '60 seconds' where ticket_id=t.id;
   v_retained:=v_retained+1;
  elsif p_decliner is not null and t.account_id<>p_decliner then
   -- An immediate decline gives nonresponders their place in the queue back.
   update public.matchmaking_tickets set status='queued',reservation_id=null,reservation_expires_at=null,heartbeat_expires_at=v_now+interval '30 seconds' where id=t.id;
   update public.coop_account_reservations set reservation_kind='queue',expires_at=v_now+interval '30 seconds' where ticket_id=t.id;
  else
   update public.matchmaking_tickets set status='cancelled',reservation_id=null,reservation_expires_at=null where id=t.id;
   delete from public.coop_account_reservations where ticket_id=t.id;
  end if;
 end loop;
 update public.coop_ready_checks set status=case when v_retained=0 then 'requeued' else 'refilling' end,refill_started_at=v_now where id=c.id;
end $$;

create or replace function public.expire_online_live_ready_server_v1(p_limit integer default 16)
returns integer language plpgsql security definer set search_path=public as $$
declare c public.coop_ready_checks;t public.matchmaking_tickets;v_count integer:=0;v_now timestamptz;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_limit';end if;
 perform pg_advisory_xact_lock(hashtextextended('online-live-ready',0));v_now:=clock_timestamp();
 for c in select * from public.coop_ready_checks where
  (status='open' and closes_at<=v_now or status='refilling' and refill_started_at<=v_now-interval '60 seconds')
  and exists(select 1 from public.matchmaking_tickets where reservation_id=coop_ready_checks.id and content_version='online-coop-loadout-v1')
  order by closes_at,id limit p_limit for update loop
  if c.status='open' then perform public.fail_online_live_ready_server_v1(c.id);
  else
   for t in select * from public.matchmaking_tickets where reservation_id=c.id and status='reserved' order by account_id loop
    perform pg_advisory_xact_lock(hashtextextended('online-coop:'||t.account_id::text,0));
    update public.matchmaking_tickets set status='queued',reservation_id=null,reservation_expires_at=null,heartbeat_expires_at=clock_timestamp()+interval '30 seconds' where id=t.id;
    update public.coop_account_reservations set reservation_kind='queue',expires_at=clock_timestamp()+interval '30 seconds' where ticket_id=t.id;
   end loop;
   update public.coop_ready_checks set status='requeued' where id=c.id;
  end if;v_count:=v_count+1;
 end loop;return v_count;
end $$;

create or replace function public.online_live_candidates_server_v1(p_account_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t public.matchmaking_tickets;c public.coop_ready_checks;v_rows jsonb;v_required jsonb:='[]';v_now timestamptz;v_blocks jsonb;
begin
 perform public.expire_online_live_ready_server_v1();v_now:=clock_timestamp();
 select * into t from public.matchmaking_tickets where account_id=p_account_id and mode='live' and content_version='online-coop-loadout-v1'
  and status in ('queued','reserved') order by created_at desc limit 1;
 if t.status='reserved' then select * into c from public.coop_ready_checks where id=t.reservation_id and status='refilling';end if;
 if t.id is null or t.status='reserved' and c.id is null or t.status='queued' and t.heartbeat_expires_at<=v_now then
  return jsonb_build_object('tickets','[]'::jsonb,'requiredTicketIds','[]'::jsonb,'refillId',null,'serverNow',floor(extract(epoch from v_now)*1000));
 end if;
 -- A queued replacement can also discover a waiting partial roster.
 if c.id is null then
  select rc.* into c from public.coop_ready_checks rc join public.matchmaking_tickets q on q.reservation_id=rc.id
   where rc.status='refilling' and q.status='reserved' and q.expedition_id=t.expedition_id and q.tier=t.tier
    and q.content_version=t.content_version and q.balance_version=t.balance_version order by rc.refill_started_at,rc.id limit 1;
 end if;
 if c.id is not null then select coalesce(jsonb_agg(id),'[]') into v_required from public.matchmaking_tickets where reservation_id=c.id and status='reserved';end if;
 if not (v_required @> jsonb_build_array(t.id)) then v_required:=v_required||jsonb_build_array(t.id);end if;
 with eligible as (
  select q.*,row_number() over(partition by q.role order by (q.reservation_id=c.id) desc nulls last,q.created_at,q.id) as position
  from public.matchmaking_tickets q join public.online_game_states g on g.account_id=q.account_id
  where q.mode='live' and q.expedition_id=t.expedition_id and q.tier=t.tier and q.content_version=t.content_version and q.balance_version=t.balance_version
   and g.character_id=q.character_id and g.revision=q.loadout_revision
   and (q.status='queued' and q.heartbeat_expires_at>v_now or q.status='reserved' and q.reservation_id=c.id)
   and not exists(select 1 from public.player_blocks b where b.blocker_id=p_account_id and b.blocked_id=q.account_id or b.blocked_id=p_account_id and b.blocker_id=q.account_id)
 ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'accountId',account_id,'characterId',character_id,'role',role,'normalizedReadiness',normalized_readiness,
  'loadoutId',loadout_id,'loadoutRevision',loadout_revision,'loadoutSnapshotHash',loadout_snapshot_hash,'expeditionId',expedition_id,'tier',tier,'contentVersion',content_version,'balanceVersion',balance_version,'serviceRegion',service_region,
  'enqueuedAtMs',floor(extract(epoch from created_at)*1000),'heartbeatExpiresAtMs',floor(extract(epoch from case when status='reserved' then c.refill_started_at+interval '60 seconds' else heartbeat_expires_at end)*1000),'status','queued')),'[]')
 into v_rows from eligible where position<=8;
 select coalesce(jsonb_agg(jsonb_build_object('blocker',blocker_id,'blocked',blocked_id)),'[]') into v_blocks from public.player_blocks
  where blocker_id in (select (x->>'accountId')::uuid from jsonb_array_elements(v_rows) x) and blocked_id in (select (x->>'accountId')::uuid from jsonb_array_elements(v_rows) x);
 return jsonb_build_object('tickets',v_rows,'serverNow',floor(extract(epoch from v_now)*1000),'refillId',c.id,'requiredTicketIds',v_required,'blockedPairs',v_blocks);
end $$;

create or replace function public.open_online_live_ready_server_v1(p_account_id uuid,p_ticket_ids uuid[],p_check_id uuid,p_refill_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare c public.coop_ready_checks;a uuid;v_roster jsonb;v_result jsonb;v_now timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended('online-live-ready',0));
 if p_check_id is null or p_ticket_ids is null or cardinality(p_ticket_ids)<>4 then raise exception 'invalid_reservation_request';end if;
 if not exists(select 1 from public.matchmaking_tickets where account_id=p_account_id and id=any(p_ticket_ids)) then raise exception 'not_ready_member';end if;
 for a in select account_id from public.matchmaking_tickets where id=any(p_ticket_ids) order by account_id loop
  perform pg_advisory_xact_lock(hashtextextended('online-coop:'||a::text,0));
 end loop;
 v_now:=clock_timestamp();
 if p_refill_id is not null then
  select * into c from public.coop_ready_checks where id=p_refill_id for update;
  if not found or c.status<>'refilling' or c.refill_started_at+interval '60 seconds'<=v_now then raise exception 'stale_ready_roster';end if;
  if exists(select 1 from public.matchmaking_tickets where reservation_id=c.id and status='reserved' and not(id=any(p_ticket_ids))) then raise exception 'reservation_conflict';end if;
  update public.matchmaking_tickets set status='queued',heartbeat_expires_at=v_now+interval '30 seconds',reservation_id=null,reservation_expires_at=null where reservation_id=c.id and status='reserved';
  update public.coop_account_reservations set reservation_kind='queue',expires_at=v_now+interval '30 seconds' where ticket_id=any(p_ticket_ids) and reservation_kind='ready';
 end if;
 v_result:=public.reserve_online_live_match_server_v1(p_ticket_ids,p_check_id);
 select jsonb_agg(jsonb_build_object('accountId',x->>'accountId','characterId',x->>'characterId','ticketId',x->>'ticketId','role',x->>'role','loadoutId',x->>'loadoutId','loadoutRevision',(x->>'loadoutRevision')::bigint,'loadoutSnapshotHash',x->>'loadoutSnapshotHash','originalEnqueuedAtMs',floor(extract(epoch from (x->>'originalEnqueuedAt')::timestamptz)*1000))) into v_roster from jsonb_array_elements(v_result) x;
 insert into public.coop_ready_checks(id,party_id,roster_revision,roster_json,status,opened_at,closes_at)
 values(p_check_id,coalesce(c.party_id,p_check_id),coalesce(c.roster_revision+1,1),v_roster,'open',clock_timestamp(),clock_timestamp()+interval '20 seconds');
 if c.id is not null then update public.coop_ready_checks set status='requeued' where id=c.id;end if;
 return p_check_id;
end $$;

create or replace function public.online_live_ready_state_server_v1(p_account_id uuid,p_check_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.coop_ready_checks;v_members jsonb;
begin
 perform public.expire_online_live_ready_server_v1();
 select * into c from public.coop_ready_checks where id=p_check_id;
 if not found or not exists(select 1 from jsonb_array_elements(c.roster_json) x where x->>'accountId'=p_account_id::text) then raise exception 'not_ready_member';end if;
 select jsonb_agg(jsonb_build_object('characterId',x->>'characterId','role',x->>'role','self',x->>'accountId'=p_account_id::text,
  'accepted',exists(select 1 from public.coop_ready_responses r where r.ready_check_id=c.id and r.account_id=(x->>'accountId')::uuid and r.accept)))
 into v_members from jsonb_array_elements(c.roster_json) x;
 return jsonb_build_object('readyCheckId',c.id,'rosterRevision',c.roster_revision,'status',c.status,'closesAtMs',floor(extract(epoch from c.closes_at)*1000),
  'refillEndsAtMs',floor(extract(epoch from c.refill_started_at+interval '60 seconds')*1000),'members',v_members,'serverNow',floor(extract(epoch from clock_timestamp())*1000));
end $$;

create or replace function public.online_live_ready_sources_server_v1(p_account_id uuid,p_check_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.coop_ready_checks;v_members jsonb;t public.matchmaking_tickets;
begin
 select * into c from public.coop_ready_checks where id=p_check_id;
 if not found or not exists(select 1 from jsonb_array_elements(c.roster_json) x where x->>'accountId'=p_account_id::text) then raise exception 'not_ready_member';end if;
 if c.status<>'open' or c.closes_at<=clock_timestamp() then raise exception 'ready_check_closed';end if;
 select * into t from public.matchmaking_tickets where reservation_id=c.id limit 1;
 select jsonb_agg(x||jsonb_build_object('state',g.state,'version',g.revision)) into v_members
 from jsonb_array_elements(c.roster_json) x join public.online_game_states g on g.account_id=(x->>'accountId')::uuid;
 return jsonb_build_object('dungeonId',t.expedition_id,'tier',t.tier,'members',v_members);
end $$;

create or replace function public.respond_online_live_ready_server_v1(p_account_id uuid,p_check_id uuid,p_roster_revision bigint,p_accept boolean,p_request_id text,p_request_hash text,p_frozen_roster jsonb default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.coop_ready_checks;v_prior jsonb;v_response jsonb;a uuid;v_count integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('online-live-ready',0));
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'live_ready_v1',p_check_id::text,p_request_id);
 if v_prior is not null then if v_prior->>'requestHash' is distinct from p_request_hash then raise exception 'idempotency_key_conflict';end if;return v_prior->'response';end if;
 if p_request_id is null or p_request_id!~'^[a-zA-Z0-9_-]{8,128}$' or p_accept is null or p_roster_revision is null
  or p_request_hash is distinct from format('[%s,%s]',p_roster_revision,p_accept::text) then raise exception 'invalid_request';end if;
 select * into c from public.coop_ready_checks where id=p_check_id for update;
 if not found or not exists(select 1 from jsonb_array_elements(c.roster_json) x where x->>'accountId'=p_account_id::text) then raise exception 'not_ready_member';end if;
 if c.roster_revision<>p_roster_revision then raise exception 'stale_ready_roster';end if;
 if c.status<>'open' then raise exception 'ready_check_closed';end if;
 if c.closes_at<=clock_timestamp() then
  perform public.fail_online_live_ready_server_v1(c.id);
 else
  insert into public.coop_ready_responses(ready_check_id,account_id,accept) values(c.id,p_account_id,p_accept)
   on conflict(ready_check_id,account_id) do update set accept=excluded.accept,responded_at=clock_timestamp();
  if not p_accept then perform public.fail_online_live_ready_server_v1(c.id,p_account_id);
  elsif (select count(*) from public.coop_ready_responses where ready_check_id=c.id and accept)=4 then
   for a in select (x->>'accountId')::uuid from jsonb_array_elements(c.roster_json) x order by x->>'accountId' loop
    perform pg_advisory_xact_lock(hashtextextended('online-coop:'||a::text,0));
   end loop;
   perform 1 from public.online_game_states where account_id in (select (x->>'accountId')::uuid from jsonb_array_elements(c.roster_json) x) order by account_id for share;
   select count(*) into v_count from jsonb_array_elements(c.roster_json) x join public.online_game_states g on g.account_id=(x->>'accountId')::uuid
    join public.coop_account_reservations r on r.account_id=g.account_id and r.ticket_id=(x->>'ticketId')::uuid
    where g.revision=(x->>'loadoutRevision')::bigint and g.character_id=(x->>'characterId')::uuid and r.reservation_kind='ready';
   if v_count<>4 then raise exception 'stale_game_version';end if;
   if p_frozen_roster is null or jsonb_array_length(p_frozen_roster)<>4 or exists(
    select 1 from jsonb_array_elements(c.roster_json) x where not exists(select 1 from jsonb_array_elements(p_frozen_roster) s where
     s->>'accountId'=x->>'accountId' and s->>'characterId'=x->>'characterId' and s->>'revision'=x->>'loadoutRevision'
     and s->>'snapshotHash'=x->>'loadoutSnapshotHash' and s#>>'{readiness,role}'=x->>'role' and (s#>>'{readiness,ready}')::boolean is true)) then raise exception 'invalid_frozen_roster';end if;
   if exists(select 1 from public.player_blocks b where b.blocker_id in (select (x->>'accountId')::uuid from jsonb_array_elements(c.roster_json) x)
    and b.blocked_id in (select (x->>'accountId')::uuid from jsonb_array_elements(c.roster_json) x)) then raise exception 'reservation_conflict';end if;
   -- Recheck time after contended locks: acceptance cannot cross its deadline.
   if c.closes_at<=clock_timestamp() then perform public.fail_online_live_ready_server_v1(c.id);
   else
    update public.coop_ready_checks set status='committed',frozen_roster_json=p_frozen_roster where id=c.id;
    update public.coop_account_reservations set expires_at=null where ticket_id in (select (x->>'ticketId')::uuid from jsonb_array_elements(c.roster_json) x);
   end if;
  end if;
 end if;
 v_response:=public.online_live_ready_state_server_v1(p_account_id,c.id);
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json)
 values(p_account_id,'live_ready_v1',c.id::text,p_request_id,p_request_hash,v_response);
 return v_response;
end $$;

revoke all on function public.fail_online_live_ready_server_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.expire_online_live_ready_server_v1(integer) from public,anon,authenticated;
revoke all on function public.online_live_candidates_server_v1(uuid) from public,anon,authenticated;
revoke all on function public.open_online_live_ready_server_v1(uuid,uuid[],uuid,uuid) from public,anon,authenticated;
revoke all on function public.online_live_ready_state_server_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.online_live_ready_sources_server_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.respond_online_live_ready_server_v1(uuid,uuid,bigint,boolean,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.fail_online_live_ready_server_v1(uuid,uuid),public.expire_online_live_ready_server_v1(integer),public.online_live_candidates_server_v1(uuid),public.open_online_live_ready_server_v1(uuid,uuid[],uuid,uuid),public.online_live_ready_state_server_v1(uuid,uuid),public.online_live_ready_sources_server_v1(uuid,uuid),public.respond_online_live_ready_server_v1(uuid,uuid,bigint,boolean,text,text,jsonb) to service_role;
do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('veldryn-online-live-ready','10 seconds','select public.expire_online_live_ready_server_v1(16)');
 end if;
end $$;
commit;
