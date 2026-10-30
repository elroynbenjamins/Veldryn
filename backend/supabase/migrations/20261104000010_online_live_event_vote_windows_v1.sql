-- Standard Live choices remain 8 seconds. Future Live event expeditions
-- (identified only by the SERVER-owned expedition ID) get 10 seconds.
-- Existing open votes keep their original window.
begin;
create or replace function public.ensure_online_live_decision_server_v1(
 p_run_id uuid,p_account_id uuid,p_revision bigint,p_option_ids text[],p_fallback_option_id text,p_opened_at_ms bigint
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 d public.coop_decisions;
 v_opened timestamptz;
 v_closes timestamptz;
 v_expedition text;
begin
 if not exists(select 1 from public.coop_run_access_memberships where run_id=p_run_id and account_id=p_account_id and active) then raise exception 'not_participant';end if;
 if p_revision is null or p_option_ids is null or cardinality(p_option_ids)<2 or p_fallback_option_id is null or not(p_fallback_option_id=any(p_option_ids)) then raise exception 'invalid_decision';end if;
 select expedition_id into v_expedition from public.expedition_runs where id=p_run_id and coop_mode='live';
 if v_expedition is null then raise exception 'not_live_run';end if;
 select * into d from public.coop_decisions where run_id=p_run_id and revision=p_revision for update;
 if found then
  if d.option_ids<>p_option_ids then raise exception 'stale_decision';end if;
 else
  v_opened:=to_timestamp(greatest(p_opened_at_ms,0)/1000.0);
  v_closes:=v_opened+case when v_expedition like 'EVENT_%' then interval '10 seconds' else interval '8 seconds' end;
  insert into public.coop_decisions(run_id,revision,kind,option_ids,eligible_account_ids,opened_at,closes_at,status,tie_key,selected_option_id)
  select p_run_id,p_revision,'route',p_option_ids,array_agg(account_id order by account_id),v_opened,v_closes,'open',p_run_id::text||':'||p_revision,null
  from public.coop_run_access_memberships where run_id=p_run_id and active returning * into d;
 end if;
 if d.status='open' and d.closes_at<=clock_timestamp() then
  update public.coop_decisions set status='resolved',
   selected_option_id=coalesce((select option_id from public.coop_decision_votes where decision_id=d.id group by option_id order by count(*) desc,option_id limit 1),p_fallback_option_id)
   where id=d.id returning * into d;
 end if;
 return jsonb_build_object('decisionId',d.id,'revision',d.revision,'status',d.status,'closesAtMs',floor(extract(epoch from d.closes_at)*1000),
  'selectedOptionId',d.selected_option_id,'votes',coalesce((select jsonb_object_agg(option_id,count) from (select option_id,count(*)::integer count from public.coop_decision_votes where decision_id=d.id group by option_id) counts),'{}'::jsonb));
end $$;

revoke all on function public.ensure_online_live_decision_server_v1(uuid,uuid,bigint,text[],text,bigint) from public,anon,authenticated;
grant execute on function public.ensure_online_live_decision_server_v1(uuid,uuid,bigint,text[],text,bigint) to service_role;
commit;
