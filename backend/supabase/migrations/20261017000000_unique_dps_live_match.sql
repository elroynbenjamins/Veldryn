-- Prevent duplicate Damage classes in Live dungeon matchmaking by exposing
-- the authoritative current class on candidate tickets. The matcher remains
-- server-authoritative and still re-freezes the full roster at ready commit.
begin;

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
 if c.id is null then
  select rc.* into c from public.coop_ready_checks rc join public.matchmaking_tickets q on q.reservation_id=rc.id
   where rc.status='refilling' and q.status='reserved' and q.expedition_id=t.expedition_id and q.tier=t.tier
    and q.content_version=t.content_version and q.balance_version=t.balance_version order by rc.refill_started_at,rc.id limit 1;
 end if;
 if c.id is not null then select coalesce(jsonb_agg(id),'[]') into v_required from public.matchmaking_tickets where reservation_id=c.id and status='reserved';end if;
 if not (v_required @> jsonb_build_array(t.id)) then v_required:=v_required||jsonb_build_array(t.id);end if;
 with eligible as (
  select q.*,coalesce(g.state#>>'{character,classId}','') as authoritative_class_id,
   row_number() over(partition by q.role order by (q.reservation_id=c.id) desc nulls last,q.created_at,q.id) as position
  from public.matchmaking_tickets q join public.online_game_states g on g.account_id=q.account_id
  where q.mode='live' and q.expedition_id=t.expedition_id and q.tier=t.tier and q.content_version=t.content_version and q.balance_version=t.balance_version
   and g.character_id=q.character_id and g.revision=q.loadout_revision
   and (q.status='queued' and q.heartbeat_expires_at>v_now or q.status='reserved' and q.reservation_id=c.id)
   and not exists(select 1 from public.player_blocks b where b.blocker_id=p_account_id and b.blocked_id=q.account_id or b.blocked_id=p_account_id and b.blocker_id=q.account_id)
 ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'accountId',account_id,'characterId',character_id,'role',role,'classId',authoritative_class_id,'normalizedReadiness',normalized_readiness,
  'loadoutId',loadout_id,'loadoutRevision',loadout_revision,'loadoutSnapshotHash',loadout_snapshot_hash,'expeditionId',expedition_id,'tier',tier,'contentVersion',content_version,'balanceVersion',balance_version,'serviceRegion',service_region,
  'enqueuedAtMs',floor(extract(epoch from created_at)*1000),'heartbeatExpiresAtMs',floor(extract(epoch from case when status='reserved' then c.refill_started_at+interval '60 seconds' else heartbeat_expires_at end)*1000),'status','queued')),'[]')
 into v_rows from eligible where position<=8;
 select coalesce(jsonb_agg(jsonb_build_object('blocker',blocker_id,'blocked',blocked_id)),'[]') into v_blocks from public.player_blocks
  where blocker_id in (select (x->>'accountId')::uuid from jsonb_array_elements(v_rows) x) and blocked_id in (select (x->>'accountId')::uuid from jsonb_array_elements(v_rows) x);
 return jsonb_build_object('tickets',v_rows,'serverNow',floor(extract(epoch from v_now)*1000),'refillId',c.id,'requiredTicketIds',v_required,'blockedPairs',v_blocks);
end $$;

revoke all on function public.online_live_candidates_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.online_live_candidates_server_v1(uuid) to service_role;
commit;
