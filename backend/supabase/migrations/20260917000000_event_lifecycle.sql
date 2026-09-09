-- Event lifecycle: preview upcoming events and preserve a seven-day reward-claim window.
update public.live_events set config=jsonb_set(config,'{claimGraceDays}','7'::jsonb,true),updated_at=now()
where event_id='EVT_ANNUAL_009_2026';

create or replace function public.visible_live_events()
returns table(event_id text,name text,currency_id text,starts_at timestamptz,ends_at timestamptz,config jsonb,phase text,claim_ends_at timestamptz)
language sql stable security definer set search_path=public as $$
  select e.event_id,e.name,e.currency_id,e.starts_at,e.ends_at,e.config,
    case when e.starts_at is not null and e.starts_at>now() then 'upcoming'
         when e.ends_at is null or e.ends_at>now() then 'active'
         else 'claiming' end,
    case when e.ends_at is null then null else e.ends_at+make_interval(days=>coalesce((e.config->>'claimGraceDays')::integer,7)) end
  from public.live_events e
  where e.enabled
    and (e.starts_at is null or e.starts_at<=now()+interval '7 days')
    and (e.ends_at is null or e.ends_at+make_interval(days=>coalesce((e.config->>'claimGraceDays')::integer,7))>now())
  order by case when e.starts_at is null or e.starts_at<=now() then 0 else 1 end,e.starts_at asc nulls first;
$$;

revoke all on function public.visible_live_events() from public;
grant execute on function public.visible_live_events() to anon,authenticated;

create or replace function public.event_claim_open(p_event_id text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.live_events e where e.event_id=p_event_id and e.enabled
    and (e.starts_at is null or e.starts_at<=now())
    and (e.ends_at is null or e.ends_at+make_interval(days=>coalesce((e.config->>'claimGraceDays')::integer,7))>now()));
$$;

revoke all on function public.event_claim_open(text) from public;
grant execute on function public.event_claim_open(text) to authenticated;

-- Market purchases remain possible during grace. Rotation is frozen to the final event day.
create or replace function public.purchase_event_offer(p_event_id text,p_offer_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_offer jsonb;v_currency text;v_cost bigint;v_kind text;v_reward_id text;v_balance bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.event_claim_open(p_event_id) then raise exception 'EVENT_MARKET_CLOSED'; end if;
  select offer into v_offer from public.live_events e cross join lateral jsonb_array_elements(e.config->'shop') offer
    where e.event_id=p_event_id and offer->>'offerId'=p_offer_id;
  if v_offer is null then raise exception 'OFFER_NOT_AVAILABLE'; end if;
  v_currency:=v_offer->>'currency';v_cost:=(v_offer->>'cost')::bigint;v_kind:=v_offer->>'kind';v_reward_id:=v_offer->>'rewardId';
  if exists(select 1 from public.event_shop_purchases where account_id=v_uid and event_id=p_event_id and offer_id=p_offer_id) then raise exception 'PURCHASE_LIMIT_REACHED'; end if;
  select case when v_currency='prestige' then prestige_balance else currency_balance end into v_balance from public.event_progress where account_id=v_uid and event_id=p_event_id for update;
  if coalesce(v_balance,0)<v_cost then raise exception 'INSUFFICIENT_EVENT_CURRENCY'; end if;
  if v_currency='prestige' then update public.event_progress set prestige_balance=prestige_balance-v_cost,updated_at=now() where account_id=v_uid and event_id=p_event_id;else update public.event_progress set currency_balance=currency_balance-v_cost,updated_at=now() where account_id=v_uid and event_id=p_event_id;end if;
  insert into public.event_shop_purchases(account_id,event_id,offer_id) values(v_uid,p_event_id,p_offer_id);
  insert into public.event_cosmetic_unlocks(account_id,event_id,reward_id,reward_type) values(v_uid,p_event_id,v_reward_id,v_kind) on conflict do nothing;
end $$;

revoke all on function public.purchase_event_offer(text,text) from public;
grant execute on function public.purchase_event_offer(text,text) to authenticated;

-- Completed final-day contracts remain claimable, but new contracts still use the active-only function from the prior migration.
create or replace function public.claim_event_contract(p_event_id text,p_objective_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_anchor timestamptz;v_day date;v_source text;v_required bigint;v_common bigint;v_prestige bigint;v_baseline bigint;v_total bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.event_claim_open(p_event_id) then raise exception 'EVENT_CLAIMS_CLOSED'; end if;
  select case when e.ends_at is not null and e.ends_at<=now() then e.ends_at-interval '1 millisecond' else now() end into v_anchor from public.live_events e where e.event_id=p_event_id;
  v_day:=(v_anchor at time zone 'utc')::date;
  select objective->>'source',(objective->>'required')::bigint,(objective->>'rewardCurrency')::bigint,(objective->>'rewardPrestige')::bigint
    into v_source,v_required,v_common,v_prestige from public.live_events e cross join lateral jsonb_array_elements(e.config->'objectives') objective
    where e.event_id=p_event_id and objective->>'id'=p_objective_id;
  select progress_baseline into v_baseline from public.event_contract_acceptances where account_id=v_uid and event_id=p_event_id and contract_day=v_day and objective_id=p_objective_id;
  if v_source is null or v_baseline is null then raise exception 'CONTRACT_NOT_ACCEPTED'; end if;
  select coalesce((activity_totals->>v_source)::bigint,0) into v_total from public.event_progress where account_id=v_uid and event_id=p_event_id for update;
  if coalesce(v_total,0)-v_baseline<v_required then raise exception 'CONTRACT_INCOMPLETE'; end if;
  insert into public.event_objective_claims(account_id,event_id,contract_day,objective_id) values(v_uid,p_event_id,v_day,p_objective_id) on conflict do nothing;
  if not found then raise exception 'CONTRACT_ALREADY_CLAIMED'; end if;
  update public.event_progress set progress=progress+v_common,currency_balance=currency_balance+v_common,prestige_balance=prestige_balance+v_prestige,updated_at=now() where account_id=v_uid and event_id=p_event_id;
end $$;

create or replace function public.claim_event_weekly(p_event_id text,p_objective_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_anchor timestamptz;v_week date;v_source text;v_required bigint;v_common bigint;v_prestige bigint;v_total bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.event_claim_open(p_event_id) then raise exception 'EVENT_CLAIMS_CLOSED'; end if;
  select case when e.ends_at is not null and e.ends_at<=now() then e.ends_at-interval '1 millisecond' else now() end into v_anchor from public.live_events e where e.event_id=p_event_id;
  v_week:=date_trunc('week',v_anchor at time zone 'utc')::date;
  select objective->>'source',(objective->>'required')::bigint,(objective->>'rewardCurrency')::bigint,(objective->>'rewardPrestige')::bigint
    into v_source,v_required,v_common,v_prestige from public.live_events e cross join lateral jsonb_array_elements(e.config->'weeklyObjectives') objective
    where e.event_id=p_event_id and objective->>'id'=p_objective_id;
  if v_source is null then raise exception 'WEEKLY_NOT_AVAILABLE'; end if;
  select coalesce(sum(activity_units),0) into v_total from public.event_drop_receipts where account_id=v_uid and event_id=p_event_id and source=v_source and created_at>=v_week::timestamptz and created_at<(v_week+7)::timestamptz;
  if v_total<v_required then raise exception 'WEEKLY_INCOMPLETE'; end if;
  insert into public.event_weekly_claims(account_id,event_id,week_start,objective_id) values(v_uid,p_event_id,v_week,p_objective_id) on conflict do nothing;
  if not found then raise exception 'WEEKLY_ALREADY_CLAIMED'; end if;
  update public.event_progress set progress=progress+v_common,currency_balance=currency_balance+v_common,prestige_balance=prestige_balance+v_prestige,updated_at=now() where account_id=v_uid and event_id=p_event_id;
end $$;

revoke all on function public.claim_event_contract(text,text),public.claim_event_weekly(text,text) from public;
grant execute on function public.claim_event_contract(text,text),public.claim_event_weekly(text,text) to authenticated;

create or replace function public.claim_event_community_reward(p_event_id text,p_percent integer)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_goal bigint;v_total bigint;v_stage integer;v_common bigint;v_prestige bigint;v_kind text;v_reward_id text;v_inserted integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.event_claim_open(p_event_id) then raise exception 'EVENT_CLAIMS_CLOSED'; end if;
  select (e.config->>'communityGoal')::bigint,(milestone->>'rewardCurrency')::bigint,(milestone->>'rewardPrestige')::bigint,milestone->>'kind',milestone->>'rewardId'
  into v_goal,v_common,v_prestige,v_kind,v_reward_id from public.live_events e cross join lateral jsonb_array_elements(e.config->'communityMilestones') milestone
  where e.event_id=p_event_id and (milestone->>'percent')::integer=p_percent;
  if v_goal is null then raise exception 'COMMUNITY_REWARD_NOT_AVAILABLE'; end if;
  select coalesce(sum(quantity),0) into v_total from public.event_contributions where event_id=p_event_id;
  v_stage:=least(100,floor(v_total::numeric*100/greatest(1,v_goal))::integer);
  if v_stage<p_percent then raise exception 'COMMUNITY_MILESTONE_INCOMPLETE'; end if;
  insert into public.event_community_claims(account_id,event_id,milestone_percent) values(v_uid,p_event_id,p_percent) on conflict do nothing;
  get diagnostics v_inserted=row_count;if v_inserted=0 then raise exception 'COMMUNITY_REWARD_ALREADY_CLAIMED'; end if;
  insert into public.event_progress(account_id,event_id,progress,currency_balance,prestige_balance) values(v_uid,p_event_id,v_common,v_common,v_prestige)
  on conflict(account_id,event_id) do update set progress=event_progress.progress+excluded.progress,currency_balance=event_progress.currency_balance+excluded.currency_balance,prestige_balance=event_progress.prestige_balance+excluded.prestige_balance,updated_at=now();
  if v_reward_id is not null then insert into public.event_cosmetic_unlocks(account_id,event_id,reward_id,reward_type) values(v_uid,p_event_id,v_reward_id,v_kind) on conflict do nothing; end if;
end $$;

revoke all on function public.claim_event_community_reward(text,integer) from public;
grant execute on function public.claim_event_community_reward(text,integer) to authenticated;
