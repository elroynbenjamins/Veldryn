-- Regression smoke: Q-mode offline worker finalizes Endurance room 8 and
-- excludes checkpoint bosses from normal-room progress. Run on staging.
-- Writes are rolled back by an expected sentinel exception. Requires at least
-- one existing staging auth user, solely to satisfy foreign keys.
DO $test$
DECLARE
 actor uuid; rid uuid; chosen text; kind text; cleared integer;
 processed integer; actual_count integer; job_status text; run_phase text; run_node text; run_version bigint;
 visited jsonb; candidate jsonb;
BEGIN
 SELECT id INTO actor FROM auth.users ORDER BY created_at LIMIT 1;
 IF actor IS NULL THEN RAISE EXCEPTION 'regression_no_staging_user'; END IF;
 BEGIN
  FOREACH kind IN ARRAY ARRAY['battle','boss'] LOOP
   rid:=gen_random_uuid();
   chosen:=CASE WHEN kind='boss' THEN 'd8-c2' ELSE 'd8-c0' END;
   cleared:=CASE WHEN kind='boss' THEN 7 ELSE 8 END;
   visited:='["d1-c0","d2-c0","d3-c0","d4-c0","d5-c0","d6-c0","d7-c0"]'::jsonb
     || jsonb_build_array(chosen);
   candidate:=jsonb_build_object(
     'phase','awaiting_choice','currentNodeId',chosen,
     'graph',jsonb_build_object('bossNodeId','boss','nodes',jsonb_build_array(
       jsonb_build_object('nodeId',chosen,'kind',kind))),
     'persistentState',jsonb_build_object('visitedNodeIds',visited),
     'lastResolution',jsonb_build_object('nodeId',chosen,
       'result',jsonb_build_object('success',true,'summary','{}'::jsonb,'state','{}'::jsonb))
   );
   INSERT INTO public.expedition_runs
     (id,expedition_id,tier,content_version,seed_hash,created_by,coop_mode,
      controller_account_id,route_graph_json,phase,current_node_id,cleared_pre_boss_count,state_version)
   VALUES(rid,'EXP_001',1,'test','test-seed',actor,'qmode',actor,'{"preBossNodeCount":42}'::jsonb,
          'resolving_node','d7-c0',7,16);
   INSERT INTO public.coop_run_access_memberships(run_id,account_id,membership_kind)
   VALUES(rid,actor,'controller');
   INSERT INTO public.coop_run_private_state(run_id,state_json) VALUES(
     rid,jsonb_build_object('seed','test-seed','run',jsonb_build_object('phase','awaiting_choice','currentNodeId','d7-c0'),
       'pending',jsonb_build_object('run',candidate,'resolvesAtMs',0,'startStateHash','test-hash',
       'settlement',jsonb_build_object('projection',jsonb_build_object('stateVersion',17,'currentNodeId',chosen),
          'enhancedMarks',null,'assistanceMarks',null)))
   );
   INSERT INTO public.coop_run_client_snapshots(run_id,state_version,event_cursor,projection_json)
   VALUES(rid,16,16,'{"phase":"resolving_node"}'::jsonb);
   INSERT INTO public.coop_due_jobs(semantic_key,job_kind,resource_id,due_at,payload)
   VALUES('qmode:'||rid||':node:'||chosen,'qmode_node',rid::text,clock_timestamp()-interval '2 seconds',
       jsonb_build_object('nodeId',chosen,'controllerAccountId',actor));
   SELECT public.process_online_qmode_jobs_server_v1(1) INTO processed;
   SELECT cleared_pre_boss_count,phase,current_node_id,state_version
     INTO actual_count,run_phase,run_node,run_version
     FROM public.expedition_runs WHERE id=rid;
   SELECT status INTO job_status FROM public.coop_due_jobs
     WHERE semantic_key='qmode:'||rid||':node:'||chosen;
   IF processed<>1 OR actual_count<>cleared OR run_phase<>'awaiting_choice'
     OR run_node<>chosen OR run_version<>17 OR job_status<>'complete'
     OR (SELECT count(*) FROM public.coop_node_results WHERE run_id=rid AND node_id=chosen AND success)<>1
   THEN RAISE EXCEPTION 'regression_failed kind %, count %, phase %, job %, processed %',
       kind,actual_count,run_phase,job_status,processed;
   END IF;
  END LOOP;
  RAISE EXCEPTION 'regression_rollback_sentinel';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'regression_rollback_sentinel' THEN RAISE; END IF;
 END;
END $test$;
