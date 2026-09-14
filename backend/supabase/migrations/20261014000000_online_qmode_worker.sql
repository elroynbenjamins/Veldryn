-- Complete precomputed, server-owned room outcomes while the controller is offline.
-- One transaction retains row locks through settlement; there is no unfenced
-- network worker or client-supplied completion payload.
begin;
create or replace function public.process_online_qmode_jobs_server_v1(p_limit integer default 16)
returns integer language plpgsql security definer set search_path=public as $$
declare r record;j public.coop_due_jobs;s jsonb;p jsonb;f jsonb;v_completed integer:=0;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'invalid_worker_limit';end if;
 -- Lock runs before jobs, matching interactive finalization's lock order.
 for r in select x.id,x.controller_account_id,x.state_version from public.expedition_runs x
  where x.coop_mode='qmode' and exists(select 1 from public.coop_due_jobs d where d.resource_id=x.id::text and d.job_kind='qmode_node'
   and d.due_at<=clock_timestamp() and (d.status='pending' or (d.status='leased' and d.lease_until<=clock_timestamp())))
  order by x.id for update of x skip locked limit p_limit
 loop
  select * into j from public.coop_due_jobs where resource_id=r.id::text and job_kind='qmode_node' and due_at<=clock_timestamp()
   and (status='pending' or (status='leased' and lease_until<=clock_timestamp())) order by due_at,id for update skip locked limit 1;
  if not found then continue;end if;
  begin
   select state_json into s from public.coop_run_private_state where run_id=r.id;
   p:=s->'pending';f:=p->'settlement';
   if p is null then update public.coop_due_jobs set status='complete',lease_until=null where id=j.id;continue;end if;
   if p#>>'{run,currentNodeId}' is distinct from j.payload->>'nodeId' then raise exception 'worker_node_mismatch';end if;
   if (p->>'resolvesAtMs')::numeric>extract(epoch from clock_timestamp())*1000 then continue;end if;
   if f is null or f#>>'{projection,stateVersion}' is distinct from (r.state_version+1)::text then raise exception 'worker_settlement_missing';end if;
   update public.coop_due_jobs set status='leased',lease_owner='postgres-qmode',lease_until=clock_timestamp()+interval '30 seconds',fencing_generation=fencing_generation+1,attempt=attempt+1 where id=j.id;
   perform public.finalize_online_qmode_node_server_v1(r.controller_account_id,r.id,r.state_version,
    jsonb_build_object('run',p->'run','seed',s->'seed'),f->'projection',p#>>'{run,currentNodeId}',p#>'{run,lastResolution,result}',p->>'startStateHash',(f->>'enhancedMarks')::integer,(f->>'assistanceMarks')::integer);
   v_completed:=v_completed+1;
  exception when others then
   -- One malformed job cannot prevent other runs from progressing. Retain it for
   -- bounded retries and expose terminal failure through the existing job table.
   update public.coop_due_jobs set attempt=attempt+1,status=case when attempt>=4 then 'failed' else 'pending' end,
    due_at=clock_timestamp()+interval '30 seconds',lease_until=null,lease_owner=null where id=j.id;
  end;
 end loop;
 return v_completed;
end $$;
revoke all on function public.process_online_qmode_jobs_server_v1(integer) from public,anon,authenticated;
grant execute on function public.process_online_qmode_jobs_server_v1(integer) to service_role;
-- Supabase supports pg_cron; environments without it can call the same protected
-- RPC from their scheduler. No service key is stored in a scheduled SQL command.
do $$ begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then
  create extension if not exists pg_cron;
  perform cron.schedule('veldryn-online-qmode','10 seconds','select public.process_online_qmode_jobs_server_v1(16);');
 end if;
end $$;
commit;
