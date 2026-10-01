-- Resolve shared route choices once every participant still inside the
-- reconnect grace window has voted. A stale participant cannot block the run.
begin;

create or replace function public.record_online_live_vote_server_v1(
 p_run_id uuid,p_account_id uuid,p_decision_id uuid,p_revision bigint,p_option_id text,p_request_id text,p_request_hash text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.coop_decisions;v_count integer;v_eligible integer;v_votes jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('online-live-vote:'||p_run_id::text,0));
 if not exists(select 1 from public.coop_run_access_memberships where run_id=p_run_id and account_id=p_account_id and active) then raise exception 'not_participant';end if;
 select * into d from public.coop_decisions where id=p_decision_id and run_id=p_run_id for update;
 if not found or d.revision<>p_revision then raise exception 'stale_decision';end if;
 if p_option_id is null or not(p_option_id=any(d.option_ids)) then raise exception 'invalid_option';end if;
 if d.status='open' and d.closes_at<=clock_timestamp() then
  update public.coop_decisions set status='resolved',selected_option_id=coalesce((select option_id from public.coop_decision_votes where decision_id=d.id group by option_id order by count(*) desc,option_id limit 1),d.option_ids[1]) where id=d.id returning * into d;
 elsif d.status='open' then
  insert into public.coop_decision_votes(decision_id,account_id,option_id,request_id) values(d.id,p_account_id,p_option_id,p_request_id)
   on conflict(decision_id,account_id) do update set option_id=excluded.option_id,request_id=excluded.request_id,updated_at=clock_timestamp();
  select count(*) into v_count from public.coop_decision_votes where decision_id=d.id;
  select count(*) into v_eligible from public.coop_run_access_memberships where run_id=p_run_id and active and last_seen_at>=clock_timestamp()-interval '60 seconds';
  if v_count>=greatest(1,v_eligible) then
   update public.coop_decisions set status='resolved',selected_option_id=(select option_id from public.coop_decision_votes where decision_id=d.id group by option_id order by count(*) desc,option_id limit 1) where id=d.id returning * into d;
  end if;
 end if;
 select coalesce(jsonb_object_agg(option_id,count),'{}'::jsonb) into v_votes from (select option_id,count(*)::integer count from public.coop_decision_votes where decision_id=d.id group by option_id) counts;
 return jsonb_build_object('decisionId',d.id,'revision',d.revision,'status',d.status,'closesAtMs',floor(extract(epoch from d.closes_at)*1000),'selectedOptionId',d.selected_option_id,'votes',v_votes);
end $$;

revoke all on function public.record_online_live_vote_server_v1(uuid,uuid,uuid,bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.record_online_live_vote_server_v1(uuid,uuid,uuid,bigint,text,text,text) to service_role;
commit;
