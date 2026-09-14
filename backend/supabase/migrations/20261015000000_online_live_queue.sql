-- Online admission into the existing Live queue. No persistent Party mutations.
-- Service-only RPCs: the authenticated edge derives equipment and role.
begin;
-- Legacy queue tables predate the authenticated gateway. All existing queue
-- writers are server-side; raw client writes would bypass ownership and roles.
alter table public.matchmaking_tickets enable row level security;
revoke all on public.matchmaking_tickets from public,anon,authenticated;
grant all on public.matchmaking_tickets to service_role;
create or replace function public.online_live_queue_state_server_v1(p_account_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('ticket',(
  select jsonb_build_object('ticketId',t.id,'dungeonId',t.expedition_id,'tier',t.tier,'role',t.role,
   'status',case when t.status='queued' and t.heartbeat_expires_at<=clock_timestamp() then 'expired' else t.status end,
   'enqueuedAt',t.created_at,'heartbeatExpiresAt',t.heartbeat_expires_at,'reservationId',t.reservation_id)
  from public.matchmaking_tickets t where t.account_id=p_account_id and t.mode='live'
   and t.content_version='online-coop-loadout-v1' order by t.created_at desc,t.id limit 1
 ),'serverNow',floor(extract(epoch from clock_timestamp())*1000));
$$;

create or replace function public.join_online_live_queue_server_v1(
 p_account_id uuid,p_game_version bigint,p_request_id text,p_request_hash text,p_ticket_id uuid,
 p_expedition_id text,p_tier smallint,p_content_version text,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare g public.online_game_states;v_prior jsonb;v_response jsonb;v_now timestamptz:=clock_timestamp();
begin
 perform pg_advisory_xact_lock(hashtextextended('online-coop:'||p_account_id::text,0));
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'live_queue_v1',p_account_id::text,p_request_id);
 if v_prior is not null then
  if v_prior->>'requestHash' is distinct from p_request_hash then raise exception 'idempotency_key_conflict';end if;
  return v_prior->'response';
 end if;
 if p_request_id is null or p_request_id!~'^[a-zA-Z0-9_-]{8,128}$' or p_request_hash is null or p_request_hash!~'^[a-f0-9]{64}$'
  or p_tier is null or p_tier not between 1 and 5 or p_content_version is distinct from 'online-coop-loadout-v1'
  or p_expedition_id is null or p_expedition_id not in ('EXP_001','EXP_002','EXP_003','EXP_004') then raise exception 'invalid_request';end if;
 select * into g from public.online_game_states where account_id=p_account_id for share;
 if not found or g.character_id is null then raise exception 'character_required';end if;
 if g.revision is distinct from p_game_version then raise exception 'stale_game_version';end if;
 if p_snapshot->>'accountId' is distinct from p_account_id::text or p_snapshot->>'characterId' is distinct from g.character_id::text
  or p_snapshot->>'revision' is distinct from g.revision::text or p_snapshot->>'loadoutId' is distinct from 'current'
  or (p_snapshot#>>'{readiness,ready}')::boolean is not true
  or coalesce(p_snapshot#>>'{readiness,role}','') not in ('tank','damage','support')
  or coalesce(p_snapshot#>>'{snapshotHash}','')!~'^[a-f0-9]{64}$'
  or not coalesce((p_snapshot#>>'{readiness,normalizedScore}')::numeric between 0.8 and 1000000,false)
 then raise exception 'invalid_loadout';end if;
 v_now:=clock_timestamp();
 -- Lock order matches match commitment: account, game, ticket, reservation.
 update public.matchmaking_tickets set status='expired' where account_id=p_account_id and mode='live'
  and status='queued' and heartbeat_expires_at<=v_now;
 delete from public.coop_account_reservations where account_id=p_account_id and reservation_kind='queue' and expires_at<=v_now;
 if exists(select 1 from public.coop_account_reservations where account_id=p_account_id)
  or exists(select 1 from public.matchmaking_tickets where account_id=p_account_id and mode='live' and status in ('queued','reserved','matched'))
  or exists(select 1 from public.coop_run_access_memberships a join public.expedition_runs r on r.id=a.run_id where a.account_id=p_account_id and a.active and r.status='active')
 then raise exception 'account_already_participating';end if;
 insert into public.matchmaking_tickets(id,account_id,character_id,mode,role,power_index,expedition_id,echo_allowed,
  tier,content_version,balance_version,service_region,normalized_readiness,loadout_id,loadout_revision,loadout_snapshot_hash,heartbeat_expires_at,created_at)
 values(p_ticket_id,p_account_id,g.character_id,'live',p_snapshot#>>'{readiness,role}',(p_snapshot#>>'{readiness,normalizedScore}')::numeric,p_expedition_id,false,
  p_tier,p_content_version,p_content_version,'default',(p_snapshot#>>'{readiness,normalizedScore}')::numeric,'current',g.revision,p_snapshot->>'snapshotHash',v_now+interval '30 seconds',v_now);
 insert into public.coop_account_reservations(account_id,ticket_id,reservation_kind,expires_at)
 values(p_account_id,p_ticket_id,'queue',v_now+interval '30 seconds');
 v_response:=public.online_live_queue_state_server_v1(p_account_id);
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json)
 values(p_account_id,'live_queue_v1',p_account_id::text,p_request_id,p_request_hash,v_response);
 return v_response;
end $$;

create or replace function public.command_online_live_queue_server_v1(p_account_id uuid,p_ticket_id uuid,p_action text,p_request_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t public.matchmaking_tickets;v_prior jsonb;v_hash text;v_response jsonb;v_now timestamptz:=clock_timestamp();
begin
 perform pg_advisory_xact_lock(hashtextextended('online-coop:'||p_account_id::text,0));
 if p_action is null or p_action not in ('heartbeat','cancel') or p_request_id is null or p_request_id!~'^[a-zA-Z0-9_-]{8,128}$' then raise exception 'invalid_request';end if;
 v_hash:=encode(sha256(convert_to(p_action,'UTF8')),'hex');
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'live_queue_command_v1',p_ticket_id::text,p_request_id);
 if v_prior is not null then
  if v_prior->>'requestHash' is distinct from v_hash then raise exception 'idempotency_key_conflict';end if;
  return v_prior->'response';
 end if;
 select * into t from public.matchmaking_tickets where id=p_ticket_id and account_id=p_account_id and mode='live' and content_version='online-coop-loadout-v1' for update;
 if not found then raise exception 'ticket_not_owned';end if;
 v_now:=clock_timestamp();
 if t.status='queued' and t.heartbeat_expires_at<=v_now then
  update public.matchmaking_tickets set status='expired' where id=t.id;
  delete from public.coop_account_reservations where account_id=p_account_id and ticket_id=t.id and reservation_kind='queue';
 elsif t.status='queued' then
  if p_action='cancel' then
   update public.matchmaking_tickets set status='cancelled' where id=t.id;
   delete from public.coop_account_reservations where account_id=p_account_id and ticket_id=t.id and reservation_kind='queue';
  else
   update public.coop_account_reservations set expires_at=v_now+interval '30 seconds' where account_id=p_account_id and ticket_id=t.id and reservation_kind='queue';
   if not found then raise exception 'ticket_not_queued';end if;
   update public.matchmaking_tickets set heartbeat_expires_at=v_now+interval '30 seconds' where id=t.id;
  end if;
 elsif t.status not in ('expired','cancelled') then raise exception 'ticket_not_queued';
 end if;
 v_response:=jsonb_build_object('ticketId',t.id,'status',(select status from public.matchmaking_tickets where id=t.id),
  'heartbeatExpiresAt',(select heartbeat_expires_at from public.matchmaking_tickets where id=t.id),'serverNow',floor(extract(epoch from v_now)*1000));
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json)
 values(p_account_id,'live_queue_command_v1',p_ticket_id::text,p_request_id,v_hash,v_response);
 return v_response;
end $$;

-- Atomically hand admission reservations to the existing exact-1T/2D/1S matcher.
-- Sorting account locks also serializes against Q-Mode starts and cancellations.
create or replace function public.reserve_online_live_match_server_v1(p_ticket_ids uuid[],p_reservation_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a uuid;v_now timestamptz;v_count integer;v_result jsonb;
begin
 if p_ticket_ids is null or cardinality(p_ticket_ids)<>4 or p_reservation_id is null then raise exception 'invalid_reservation_request';end if;
 for a in select distinct account_id from public.matchmaking_tickets where id=any(p_ticket_ids) order by account_id loop
  perform pg_advisory_xact_lock(hashtextextended('online-coop:'||a::text,0));
 end loop;
 perform 1 from public.online_game_states where account_id in (select account_id from public.matchmaking_tickets where id=any(p_ticket_ids)) order by account_id for share;
 perform 1 from public.matchmaking_tickets where id=any(p_ticket_ids) order by id for update;
 v_now:=clock_timestamp();
 select count(*) into v_count from public.matchmaking_tickets t join public.online_game_states g on g.account_id=t.account_id
  join public.coop_account_reservations r on r.account_id=t.account_id and r.ticket_id=t.id
  where t.id=any(p_ticket_ids) and t.mode='live' and t.content_version='online-coop-loadout-v1'
   and t.status='queued' and t.heartbeat_expires_at>v_now and g.revision=t.loadout_revision and g.character_id=t.character_id
   and r.reservation_kind='queue' and r.expires_at>v_now;
 if v_count<>4 then raise exception 'reservation_conflict';end if;
 if exists(select 1 from public.player_blocks b join public.matchmaking_tickets x on x.account_id=b.blocker_id
  join public.matchmaking_tickets y on y.account_id=b.blocked_id where x.id=any(p_ticket_ids) and y.id=any(p_ticket_ids)) then raise exception 'reservation_conflict';end if;
 delete from public.coop_account_reservations where ticket_id=any(p_ticket_ids) and reservation_kind='queue';
 v_result:=public.reserve_coop_match_server_v1(p_ticket_ids,p_reservation_id,v_now,v_now+interval '20 seconds',0.8);
 update public.coop_account_reservations set reservation_kind='ready' where ticket_id=any(p_ticket_ids);
 return v_result;
end $$;

revoke all on function public.online_live_queue_state_server_v1(uuid) from public,anon,authenticated;
revoke all on function public.join_online_live_queue_server_v1(uuid,bigint,text,text,uuid,text,smallint,text,jsonb) from public,anon,authenticated;
revoke all on function public.command_online_live_queue_server_v1(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.reserve_online_live_match_server_v1(uuid[],uuid) from public,anon,authenticated;
grant execute on function public.online_live_queue_state_server_v1(uuid) to service_role;
grant execute on function public.join_online_live_queue_server_v1(uuid,bigint,text,text,uuid,text,smallint,text,jsonb) to service_role;
grant execute on function public.command_online_live_queue_server_v1(uuid,uuid,text,text) to service_role;
grant execute on function public.reserve_online_live_match_server_v1(uuid[],uuid) to service_role;
commit;
