-- Checkpoint bosses are terminal encounters, not cleared normal rooms.
-- Count only non-boss route nodes from the frozen server-generated graph.
CREATE OR REPLACE FUNCTION public.finalize_online_qmode_node_server_v1(p_account_id uuid, p_run_id uuid, p_expected_version bigint, p_private_state jsonb, p_client_projection jsonb, p_node_id text, p_result jsonb, p_start_state_hash text, p_enhanced_marks integer, p_assistance_marks integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_version bigint;v_state jsonb;r jsonb;v_count integer;v_now timestamptz:=clock_timestamp();v_date date;v_week date;m record;v_daily integer;v_weekly integer;
begin
 select state_version into v_version from public.expedition_runs where id=p_run_id and coop_mode='qmode' and controller_account_id=p_account_id for update;
 if not found then raise exception 'NOT_PARTICIPANT';end if;
 select state_json into v_state from public.coop_run_private_state where run_id=p_run_id;
 if not (v_state ? 'pending') then return (select projection_json from public.coop_run_client_snapshots where run_id=p_run_id);end if;
 if v_version<>p_expected_version then raise exception 'STALE_STATE';end if;
 if (v_state#>>'{pending,resolvesAtMs}')::numeric>extract(epoch from v_now)*1000 then raise exception 'node_not_due';end if;
 r:=v_state#>'{pending,run}';
 if r is distinct from p_private_state->'run' or v_state->'seed' is distinct from p_private_state->'seed'
  or r->>'currentNodeId' is distinct from p_node_id or r#>'{lastResolution,result}' is distinct from p_result
  or v_state#>>'{pending,startStateHash}' is distinct from p_start_state_hash then raise exception 'invalid_node_result';end if;
 v_count:=(
   select count(*) from jsonb_array_elements_text(r#>'{persistentState,visitedNodeIds}') AS visited(node_id)
   where visited.node_id is distinct from r#>>'{graph,bossNodeId}'
     and not exists (
       select 1 from jsonb_array_elements(coalesce(r#>'{graph,nodes}','[]'::jsonb)) AS graph_node(node)
       where graph_node.node->>'nodeId'=visited.node_id
         and graph_node.node->>'kind'='boss'
     )
 );
 insert into public.coop_node_results(run_id,node_id,fencing_generation,success,start_state_hash,result_json,end_state_json,event_cursor_from,event_cursor_to)
 values(p_run_id,p_node_id,v_version,(p_result->>'success')::boolean,p_start_state_hash,p_result->'summary',p_result->'state',v_version,v_version+1);
 perform public.commit_coop_runtime_server_v1(p_run_id,p_account_id,p_expected_version,r->>'phase',p_node_id,v_count,p_private_state,p_client_projection,v_version+1,'node_resolved',p_client_projection,'qmode:'||p_run_id||':node:'||p_node_id||':resolved');
 update public.coop_due_jobs set status='complete',lease_until=null where semantic_key='qmode:'||p_run_id||':node:'||p_node_id;
 if r->>'phase' in ('completed','failed') then
  if p_enhanced_marks is null or p_enhanced_marks<0 or p_enhanced_marks>1000 or p_assistance_marks is null or p_assistance_marks<0 or p_assistance_marks>100 then raise exception 'invalid_reward';end if;
  v_date:=(v_now at time zone 'UTC')::date;v_week:=date_trunc('week',v_now at time zone 'UTC')::date;
  insert into public.coop_reward_entitlements(run_id,recipient_account_id,character_id,entitlement_kind,reward_stage,period_date_key,period_week_key,reward_json)
  select p_run_id,p_account_id,character_id,'participant','final',v_date,v_week,jsonb_build_object('enhanced_marks',p_enhanced_marks) from public.expedition_run_members where run_id=p_run_id and member_kind='human';
  -- Reserve assistance budgets at earning time under per-owner locks. Delayed
  -- claims cannot create additional daily/weekly assistance entitlements.
  for m in select account_id,character_id from public.expedition_run_members where run_id=p_run_id and member_kind='echo' order by account_id loop
   perform pg_advisory_xact_lock(hashtextextended('online-coop-assistance:'||m.account_id::text,0));
   select count(*) filter(where period_date_key=v_date),count(*) filter(where period_week_key=v_week) into v_daily,v_weekly from public.coop_reward_entitlements where recipient_account_id=m.account_id and entitlement_kind='echo_assistance' and period_week_key=v_week and coalesce((reward_json->>'marks')::integer,0)>0;
   insert into public.coop_reward_entitlements(run_id,recipient_account_id,character_id,entitlement_kind,reward_stage,period_date_key,period_week_key,reward_json)
   values(p_run_id,m.account_id,m.character_id,'echo_assistance','final',v_date,v_week,jsonb_build_object('marks',case when v_daily<5 and v_weekly<25 then p_assistance_marks else 0 end));
  end loop;
  delete from public.coop_account_reservations where account_id=p_account_id and run_id=p_run_id;
 end if;
 return p_client_projection;
end $function$;

revoke all on function public.finalize_online_qmode_node_server_v1(uuid,uuid,bigint,jsonb,jsonb,text,jsonb,text,integer,integer) from public,anon,authenticated;
grant execute on function public.finalize_online_qmode_node_server_v1(uuid,uuid,bigint,jsonb,jsonb,text,jsonb,text,integer,integer) to service_role;
