-- Weekly dungeon quest hotfix.
-- The Endurance route generator was upgraded to v2, but the weekly metrics
-- function still filtered for v1. This excluded legitimate boss/elite/depth
-- completions from all three rotating weekly objectives.
-- Keep the server-verified co-op modes, human membership, successful node
-- result, graph node identity, and UTC week boundaries unchanged.
begin;

create or replace function public.coop_dungeon_weekly_metrics_server_v1(
 p_account_id uuid,p_week_start timestamptz
) returns jsonb
language sql stable security definer set search_path=''
as $function$
 with eligible_runs as (
   select r.id,r.route_graph_json
   from public.expedition_runs as r
   where r.coop_mode in ('qmode','live')
     -- Accept v1, v2 and subsequent numeric Endurance route generations.
     -- Never treat unrelated/legacy route generators as weekly progress.
     and (r.route_graph_json->>'generatorVersion') ~ '-endurance-v[0-9]+$'
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

commit;
