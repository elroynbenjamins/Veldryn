-- Weekly personal quest metrics from server-committed Endurance dungeon nodes.
-- No client supplied room counts, run outcomes or direct currency grants.
-- Existing seasonal weekly quest settlement handles reward choice and milestone points.
begin;

create or replace function public.coop_weekly_dungeon_metrics_server_v1(
 p_account_id uuid,
 p_character_id uuid
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $function$
declare
 v_week_start timestamptz :=
   (pg_catalog.date_trunc('week',pg_catalog.now() at time zone 'UTC') at time zone 'UTC');
 v_clears integer := 0;
 v_deep15 integer := 0;
 v_elite3 integer := 0;
begin
 if p_account_id is null or p_character_id is null or
   not exists(
    select 1 from public.characters as c
    where c.account_id=p_account_id and c.id=p_character_id
   ) then
   raise exception 'CHARACTER_NOT_OWNED';
 end if;

 with qualifying_nodes as (
   select n.run_id, n.node_id, node.value->>'kind' as kind,
     (node.value->>'depth')::integer as depth
   from public.expedition_run_members as member
   join public.expedition_runs as run on run.id=member.run_id
   join public.coop_node_results as n on n.run_id=run.id
   cross join lateral pg_catalog.jsonb_array_elements(
     case when pg_catalog.jsonb_typeof(run.route_graph_json->'nodes')='array'
       then run.route_graph_json->'nodes' else '[]'::jsonb end
   ) as node(value)
   where member.account_id=p_account_id
     and member.character_id=p_character_id
     and member.member_kind='human'
     and run.coop_mode in ('qmode','live')
     and run.route_graph_json->>'generatorVersion' like '%-endurance-v1'
     and n.node_id=node.value->>'nodeId'
     and n.success
     and n.committed_at>=v_week_start
     and n.committed_at<v_week_start+interval '7 days'
 ),
 per_run as (
   select run_id,
     max(depth) as deepest,
     count(*) filter(where kind='elite') as elite_wins,
     count(*) filter(where kind='boss') as boss_wins
   from qualifying_nodes
   group by run_id
 )
 select
   count(*) filter(where boss_wins>0)::integer,
   count(*) filter(where deepest>=15)::integer,
   count(*) filter(where elite_wins>=3)::integer
 into v_clears,v_deep15,v_elite3
 from per_run;

 return pg_catalog.jsonb_build_object(
  'clears',v_clears,
  'deep15',v_deep15,
  'elite3',v_elite3
 );
end;
$function$;

-- Privileged-only: the gameplay server already authenticates the account,
-- then supplies its current character from the server-owned saved game.
revoke all on function public.coop_weekly_dungeon_metrics_server_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.coop_weekly_dungeon_metrics_server_v1(uuid,uuid)
 to service_role;

commit;
