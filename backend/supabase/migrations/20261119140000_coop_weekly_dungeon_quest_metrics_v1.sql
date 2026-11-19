-- Dungeon-only weekly objectives: account-wide, Monday 00:00 UTC reset.
-- This replaces the earlier unshipped Class Challenges bridge. No changes to
-- normal weekly quests, monthly quest points or 25 combat-room Mark limit.
begin;

create table if not exists public.coop_dungeon_weekly_claims_v1 (
 account_id uuid not null references auth.users(id) on delete cascade,
 week_start date not null,
 objective_id text not null check (objective_id in ('clears','deep15','elite3')),
 reward_marks integer not null check (reward_marks=25),
 request_id text not null,
 claimed_at timestamptz not null default pg_catalog.transaction_timestamp(),
 primary key(account_id,week_start)
);
alter table public.coop_dungeon_weekly_claims_v1 enable row level security;
revoke all on public.coop_dungeon_weekly_claims_v1 from public,anon,authenticated;
grant select,insert on public.coop_dungeon_weekly_claims_v1 to service_role;

-- Returns verified results from committed dungeon nodes. For Live runs all
-- participating humans may earn progress; NPC/Echo donors never do.
-- The account can use any of its characters, but a run is counted just once.
create or replace function public.coop_dungeon_weekly_metrics_server_v1(
 p_account_id uuid,p_week_start timestamptz
) returns jsonb
language sql stable security definer set search_path=''
as $function$
 with eligible_runs as (
   select r.id,r.route_graph_json
   from public.expedition_runs as r
   where r.coop_mode in ('qmode','live')
     and r.route_graph_json->>'generatorVersion' like '%-endurance-v1'
     and exists (
      select 1 from public.expedition_run_members as member
      where member.run_id=r.id and member.account_id=p_account_id
        and member.member_kind='human'
     )
 ), completed_rooms as (
   select n.run_id, node.value->>'kind' as kind,
     (node.value->>'depth')::integer as depth
   from eligible_runs as r
   join public.coop_node_results as n on n.run_id=r.id
   cross join lateral pg_catalog.jsonb_array_elements(
     case when pg_catalog.jsonb_typeof(r.route_graph_json->'nodes')='array'
      then r.route_graph_json->'nodes' else '[]'::jsonb end
   ) as node(value)
   where n.node_id=node.value->>'nodeId'
     and n.success
     and n.committed_at>=p_week_start
     and n.committed_at<p_week_start+interval '7 days'
 ), per_run as (
   select run_id,max(depth) as deepest,
    count(*) filter(where kind='elite') as elite_wins,
    count(*) filter(where kind='boss') as boss_wins
   from completed_rooms group by run_id
 )
 select pg_catalog.jsonb_build_object(
  'clears',coalesce(max(case when boss_wins>0 then 1 else 0 end),0)::integer,
  'deep15',coalesce(max(deepest),0)::integer,
  'elite3',coalesce(max(elite_wins),0)::integer
 ) from per_run;
$function$;
revoke all on function public.coop_dungeon_weekly_metrics_server_v1(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.coop_dungeon_weekly_metrics_server_v1(uuid,timestamptz) to service_role;

create or replace function public.coop_dungeon_weekly_quest_snapshot_server_v1(p_account_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare
 v_now timestamptz:=pg_catalog.transaction_timestamp();
 v_week_start timestamptz;
 v_week_key text;
 v_week_number integer;
 v_id text;
 v_name text;
 v_description text;
 v_target integer;
 v_metrics jsonb;
 v_progress integer;
 v_claimed boolean;
begin
 if p_account_id is null or not exists(select 1 from auth.users u where u.id=p_account_id)
 then raise exception 'ACCOUNT_NOT_FOUND'; end if;
 v_week_start:=pg_catalog.date_trunc('week',v_now at time zone 'UTC') at time zone 'UTC';
 v_week_key:=pg_catalog.to_char(v_now at time zone 'UTC','IYYY-"W"IW');
 v_week_number:=extract(week from v_now at time zone 'UTC')::integer;
 case v_week_number%3
  when 0 then v_id:='clears';v_name:='Dungeon Duty';v_description:='Defeat a dungeon boss this week.';v_target:=1;
  when 1 then v_id:='deep15';v_name:='Deep Delver';v_description:='Reach room 15 in a single dungeon run this week.';v_target:=15;
  else v_id:='elite3';v_name:='Elite Hunter';v_description:='Defeat 3 elite encounters in a single dungeon run this week.';v_target:=3;
 end case;
 v_metrics:=public.coop_dungeon_weekly_metrics_server_v1(p_account_id,v_week_start);
 v_progress:=least(v_target,greatest(0,coalesce((v_metrics->>v_id)::integer,0)));
 select exists(select 1 from public.coop_dungeon_weekly_claims_v1 as c
    where c.account_id=p_account_id and c.week_start=(v_week_start at time zone 'UTC')::date)
 into v_claimed;
 return pg_catalog.jsonb_build_object(
  'weekKey',v_week_key,'id',v_id,'name',v_name,'description',v_description,
  'progress',v_progress,'target',v_target,'rewardMarks',25,'claimed',v_claimed,
  'resetAtMs',pg_catalog.floor(extract(epoch from v_week_start+interval '7 days')*1000)::bigint
 );
end;
$function$;
revoke all on function public.coop_dungeon_weekly_quest_snapshot_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.coop_dungeon_weekly_quest_snapshot_server_v1(uuid) to service_role;

-- Atomic one-per-account-per-week reward. A second character, a retried HTTP
-- request or parallel claim can never multiply the payout. No client-supplied
-- amounts or progress and no possible cross-week stale claim.
create or replace function public.coop_dungeon_weekly_quest_claim_server_v1(
 p_account_id uuid,p_week_key text,p_request_id text
) returns jsonb
language plpgsql security definer set search_path=''
as $function$
declare
 v_snapshot jsonb;
 v_week_start date;
 v_id text;
 v_reward_ledger_id uuid;
begin
 if p_account_id is null or p_request_id is null or
    p_request_id !~ '^[A-Za-z0-9_-]{8,128}$' or
    p_week_key is null or p_week_key !~ '^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$'
 then raise exception 'invalid_dungeon_weekly_request';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dungeon-weekly:'||p_account_id::text,0));
 v_snapshot:=public.coop_dungeon_weekly_quest_snapshot_server_v1(p_account_id);
 if v_snapshot->>'weekKey' is distinct from p_week_key then raise exception 'dungeon_weekly_quest_expired'; end if;
 if (v_snapshot->>'claimed')::boolean then return v_snapshot; end if;
 if (v_snapshot->>'progress')::integer<(v_snapshot->>'target')::integer then raise exception 'dungeon_weekly_quest_incomplete'; end if;
 v_week_start:=(pg_catalog.date_trunc('week',pg_catalog.transaction_timestamp() at time zone 'UTC'))::date;
 v_id:=v_snapshot->>'id';
 insert into public.coop_dungeon_weekly_claims_v1(account_id,week_start,objective_id,reward_marks,request_id)
 values(p_account_id,v_week_start,v_id,25,p_request_id);
 insert into public.expedition_currency_ledger
  (account_id,run_id,currency,amount,reason,idempotency_key)
 values(p_account_id,null,'expedition_mark',25,'coop_dungeon_weekly_quest',
   'coop-dungeon-weekly-v1:'||p_account_id::text||':'||p_week_key)
 returning id into v_reward_ledger_id;
 if v_reward_ledger_id is null then raise exception 'dungeon_weekly_ledger_failed';end if;
 insert into public.expedition_wallets(account_id) values(p_account_id) on conflict(account_id) do nothing;
 update public.expedition_wallets
 set expedition_marks=expedition_marks+25,updated_at=pg_catalog.transaction_timestamp()
 where account_id=p_account_id;
 return public.coop_dungeon_weekly_quest_snapshot_server_v1(p_account_id);
end;
$function$;
revoke all on function public.coop_dungeon_weekly_quest_claim_server_v1(uuid,text,text) from public,anon,authenticated;
grant execute on function public.coop_dungeon_weekly_quest_claim_server_v1(uuid,text,text) to service_role;
commit;
