begin;

create table if not exists public.event_expedition_daily_clears(
 account_id uuid not null references auth.users(id) on delete cascade,
 event_id text not null,
 clear_day date not null,
 clear_count integer not null default 0 check(clear_count>=0),
 primary key(account_id,event_id,clear_day)
);

create or replace function public.claim_event_expedition_clear_slot(p_account_id uuid,p_event_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
 insert into public.event_expedition_daily_clears(account_id,event_id,clear_day,clear_count)
 values(p_account_id,p_event_id,(clock_timestamp() at time zone 'utc')::date,1)
 on conflict(account_id,event_id,clear_day) do update
 set clear_count=public.event_expedition_daily_clears.clear_count+1
 returning clear_count into v_count;
 if v_count>2 then
  update public.event_expedition_daily_clears
  set clear_count=clear_count-1
  where account_id=p_account_id and event_id=p_event_id and clear_day=(clock_timestamp() at time zone 'utc')::date;
  raise exception 'event_daily_clear_limit';
 end if;
end $$;

create or replace function public.claim_online_event_expedition_server_v1(
 p_account_id uuid,p_run_id uuid,p_expected_version bigint,p_request_id text,p_request_hash text,p_marks integer,
 p_private_state jsonb,p_client_projection jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_prior jsonb;v_version bigint;v_old jsonb;r jsonb;g public.online_game_states;v_live_event_id text;v_progress integer;v_currency integer;v_state jsonb;v_count integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account_id::text,0));
 select state_version into v_version from public.expedition_runs where id=p_run_id and coop_mode='event' and controller_account_id=p_account_id for update;
 if not found then raise exception 'NOT_PARTICIPANT';end if;
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'event_claim_v1',p_run_id::text,p_request_id);
 if v_prior is not null then if v_prior->>'requestHash'<>p_request_hash then raise exception 'idempotency_key_conflict';end if;return v_prior->'response';end if;
 if v_version<>p_expected_version then raise exception 'STALE_STATE';end if;
 select state_json into v_old from public.coop_run_private_state where run_id=p_run_id;
 r:=p_private_state->'run';v_live_event_id:=v_old->>'liveEventId';
 if v_old#>>'{run,phase}' is distinct from 'completed' or v_old#>>'{run,settlement}' is distinct from 'pending'
  or r->>'phase' is distinct from 'completed' or r->>'settlement' is distinct from 'claimed'
  or r->>'eventId' is distinct from v_old#>>'{run,eventId}' or p_private_state->>'liveEventId' is distinct from v_live_event_id
  or p_marks is null or p_marks<=0 or p_marks is distinct from (v_old#>>'{run,rewardMarks}')::integer then raise exception 'event_reward_not_ready';end if;
 if not public.event_claim_open(v_live_event_id) then raise exception 'event_claim_closed';end if;
 perform public.claim_event_expedition_clear_slot(p_account_id,v_live_event_id);
 if p_client_projection->>'stateVersion' is distinct from (v_version+1)::text then raise exception 'invalid_event_projection';end if;

 select * into g from public.online_game_states where account_id=p_account_id for update;
 if not found or g.state is null then raise exception 'game_not_loaded';end if;
 v_progress:=greatest(0,coalesce((g.state#>>array['account','eventProgressById',v_live_event_id])::integer,0))+p_marks;
 v_currency:=greatest(0,coalesce((g.state#>>array['account','eventCurrencyBalanceById',v_live_event_id])::integer,0))+p_marks;
 v_state:=jsonb_set(g.state,'{account,eventProgressById}',coalesce(g.state#>'{account,eventProgressById}','{}'::jsonb)||jsonb_build_object(v_live_event_id,v_progress),true);
 v_state:=jsonb_set(v_state,'{account,eventCurrencyBalanceById}',coalesce(v_state#>'{account,eventCurrencyBalanceById}','{}'::jsonb)||jsonb_build_object(v_live_event_id,v_currency),true);
 update public.online_game_states set state=v_state,revision=revision+1,updated_at=clock_timestamp() where account_id=p_account_id;
 insert into public.event_progress(account_id,event_id,progress,currency_balance,prestige_balance)
 values(p_account_id,v_live_event_id,p_marks,p_marks,0)
 on conflict(account_id,event_id) do update set progress=public.event_progress.progress+excluded.progress,currency_balance=public.event_progress.currency_balance+excluded.currency_balance,updated_at=clock_timestamp();

 v_count:=(select count(*) from jsonb_array_elements_text(r#>'{persistentState,visitedNodeIds}') n where n<>r#>>'{graph,bossNodeId}');
 perform public.commit_coop_runtime_server_v1(p_run_id,p_account_id,p_expected_version,'completed',r->>'currentNodeId',v_count,p_private_state,p_client_projection,v_version+1,'event_reward_claimed',p_client_projection,'event:'||p_run_id||':claim');
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json)
 values(p_account_id,'event_claim_v1',p_run_id::text,p_request_id,p_request_hash,p_client_projection);
 return p_client_projection;
end $$;

revoke all on function public.claim_event_expedition_clear_slot(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_event_expedition_clear_slot(uuid,text) to service_role;
revoke all on function public.claim_online_event_expedition_server_v1(uuid,uuid,bigint,text,text,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.claim_online_event_expedition_server_v1(uuid,uuid,bigint,text,text,integer,jsonb,jsonb) to service_role;
commit;
