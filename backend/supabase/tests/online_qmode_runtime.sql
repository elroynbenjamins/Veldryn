begin;
do $$
declare f regprocedure;role_name text;
begin
 for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in (
  'read_online_coop_receipt_server_v1','load_online_qmode_server_v1','online_coop_entry_state_server_v1',
  'start_online_qmode_server_v1','queue_online_qmode_node_server_v1','finalize_online_qmode_node_server_v1','process_online_qmode_jobs_server_v1')
 loop
  foreach role_name in array array['anon','authenticated'] loop
   if has_function_privilege(role_name,f,'execute') then raise exception 'Client can execute private RPC %',f;end if;
  end loop;
  if not has_function_privilege('service_role',f,'execute') then raise exception 'Service cannot execute %',f;end if;
 end loop;
 if (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname in ('read_online_coop_receipt_server_v1','load_online_qmode_server_v1','online_coop_entry_state_server_v1','start_online_qmode_server_v1','queue_online_qmode_node_server_v1','finalize_online_qmode_node_server_v1','process_online_qmode_jobs_server_v1'))<>7 then raise exception 'Missing runtime RPC';end if;
 begin perform public.process_online_qmode_jobs_server_v1(0);raise exception 'Unbounded worker accepted';exception when raise_exception then if sqlerrm<>'invalid_worker_limit' then raise;end if;end;
 begin perform public.process_online_qmode_jobs_server_v1(null);raise exception 'Null worker limit accepted';exception when raise_exception then if sqlerrm<>'invalid_worker_limit' then raise;end if;end;
 if exists(select 1 from pg_extension where extname='pg_cron') then
  if (select count(*) from cron.job where jobname='veldryn-online-qmode' and active and schedule='10 seconds')<>1 then raise exception 'Missing or duplicate QMode scheduler';end if;
 end if;
end $$;
select 'PASS: private runtime grants, bounded worker and unique scheduler' as result;
rollback;
