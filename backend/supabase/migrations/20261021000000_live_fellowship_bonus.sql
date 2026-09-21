-- Limited weekly incentive for successful human Live co-op clears.
-- Eligibility is earned-time scoped by entitlement.period_week_key, so delayed claims
-- cannot move old Live clears into a newer week's three-clear allowance.
begin;

create table if not exists public.coop_live_fellowship_weekly(
  account_id uuid not null references auth.users(id) on delete cascade,
  week_key date not null,
  used smallint not null default 0 check(used between 0 and 3),
  updated_at timestamptz not null default clock_timestamp(),
  primary key(account_id,week_key)
);
alter table public.coop_live_fellowship_weekly enable row level security;
revoke all on public.coop_live_fellowship_weekly from public,anon,authenticated;
grant all on public.coop_live_fellowship_weekly to service_role;

create or replace function public.claim_coop_reward(p_entitlement_id uuid,p_request_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid();
  v_ent public.coop_reward_entitlements%rowtype;
  v_budget public.coop_reward_charge_balances%rowtype;
  v_now timestamptz:=clock_timestamp();
  v_week_key date:=(date_trunc('week',v_now at time zone 'UTC'))::date;
  v_marks integer;
  v_full_marks integer;
  v_restored integer;
  v_enhanced boolean:=false;
  v_ledger_key text;
  v_mode text;
  v_phase text;
  v_fellowship_used smallint:=0;
  v_fellowship_bonus integer:=0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  if char_length(p_request_id)<8 or char_length(p_request_id)>128 then raise exception 'INVALID_REQUEST_ID';end if;
  select * into v_ent from public.coop_reward_entitlements where id=p_entitlement_id for update;
  if not found then raise exception 'ENTITLEMENT_NOT_FOUND';end if;
  if v_ent.recipient_account_id<>v_uid then raise exception 'NOT_REWARD_RECIPIENT';end if;
  if v_ent.claimed_at is not null then return v_ent.reward_json||jsonb_build_object('idempotent_replay',true);end if;
  select coop_mode,phase into v_mode,v_phase from public.expedition_runs where id=v_ent.run_id;

  insert into public.coop_reward_charge_balances(account_id,week_key) values(v_uid,v_week_key)
    on conflict(account_id) do nothing;
  select * into v_budget from public.coop_reward_charge_balances where account_id=v_uid for update;
  if v_budget.week_key<>v_week_key then
    v_budget.week_key:=v_week_key;
    v_budget.weekly_used:=0;
  end if;
  if v_budget.next_charge_at is not null and v_now>=v_budget.next_charge_at and v_budget.charges<3 then
    v_restored:=floor(extract(epoch from (v_now-v_budget.next_charge_at))/28800)::integer+1;
    v_budget.charges:=least(3,v_budget.charges+v_restored);
    v_budget.next_charge_at:=case when v_budget.charges>=3 then null else v_budget.next_charge_at+(v_restored*interval '8 hours') end;
  end if;

  v_full_marks:=greatest(0,coalesce((v_ent.reward_json->>'enhanced_marks')::integer,(v_ent.reward_json->>'marks')::integer,0));
  if v_ent.entitlement_kind='participant' then
    v_enhanced:=v_budget.charges>0 and v_budget.weekly_used<12;
    if v_enhanced then
      v_budget.charges:=v_budget.charges-1;
      v_budget.weekly_used:=v_budget.weekly_used+1;
      if v_budget.next_charge_at is null then v_budget.next_charge_at:=v_now+interval '8 hours';end if;
      v_marks:=v_full_marks;
    else
      v_marks:=round(v_full_marks*0.20);
    end if;

    if v_mode='live' and v_phase='completed' and v_ent.reward_stage in ('clear','final') and v_full_marks>0 then
      insert into public.coop_live_fellowship_weekly(account_id,week_key,used)
      values(v_uid,v_ent.period_week_key,0) on conflict(account_id,week_key) do nothing;
      select used into v_fellowship_used from public.coop_live_fellowship_weekly
       where account_id=v_uid and week_key=v_ent.period_week_key for update;
      if v_fellowship_used<3 then
        v_fellowship_bonus:=greatest(1,round(v_full_marks*0.25));
        v_marks:=v_marks+v_fellowship_bonus;
        v_fellowship_used:=v_fellowship_used+1;
        update public.coop_live_fellowship_weekly set used=v_fellowship_used,updated_at=v_now
         where account_id=v_uid and week_key=v_ent.period_week_key;
      end if;
    end if;
  else
    v_marks:=v_full_marks;
  end if;
  update public.coop_reward_charge_balances set charges=v_budget.charges,next_charge_at=v_budget.next_charge_at,week_key=v_budget.week_key,weekly_used=v_budget.weekly_used,updated_at=v_now where account_id=v_uid;

  v_ent.reward_json:=v_ent.reward_json||jsonb_build_object(
    'marks',v_marks,
    'enhanced_reward',v_enhanced,
    'reward_charges_remaining',v_budget.charges,
    'next_reward_charge_at',v_budget.next_charge_at,
    'weekly_enhanced_remaining',greatest(0,12-v_budget.weekly_used),
    'live_fellowship_bonus',v_fellowship_bonus,
    'live_fellowship_applied',v_fellowship_bonus>0
  );
  v_ledger_key:='coop-entitlement:'||v_ent.id::text;
  insert into public.expedition_wallets(account_id)values(v_uid)on conflict do nothing;
  update public.expedition_wallets set expedition_marks=expedition_marks+v_marks,updated_at=v_now where account_id=v_uid;
  insert into public.expedition_currency_ledger(account_id,run_id,currency,amount,reason,idempotency_key)values(v_uid,v_ent.run_id,'expedition_mark',v_marks,'coop_'||v_ent.entitlement_kind,v_ledger_key);
  update public.coop_reward_entitlements set reward_json=v_ent.reward_json,claimed_at=v_now,claim_request_id=p_request_id where id=v_ent.id;
  return v_ent.reward_json||jsonb_build_object('idempotent_replay',false);
exception when unique_violation then
  select * into v_ent from public.coop_reward_entitlements where id=p_entitlement_id;
  return v_ent.reward_json||jsonb_build_object('idempotent_replay',true);
end;$$;
revoke all on function public.claim_coop_reward(uuid,text) from public,anon;
grant execute on function public.claim_coop_reward(uuid,text) to authenticated;

create or replace function public.online_coop_entry_state_server_v1(p_account_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
  'activeRunProjection',(
   select s.projection_json
   from public.coop_run_access_memberships a
   join public.expedition_runs r on r.id=a.run_id
   join public.coop_run_client_snapshots s on s.run_id=r.id
   where a.account_id=p_account_id and a.active and r.coop_mode in ('live','qmode')
    and (r.status='active' or exists(select 1 from public.coop_reward_entitlements e where e.run_id=r.id and e.recipient_account_id=p_account_id and e.claimed_at is null))
   order by r.created_at desc limit 1
  ),
  'activeEventRunProjection',(
   select s.projection_json
   from public.coop_run_access_memberships a
   join public.expedition_runs r on r.id=a.run_id
   join public.coop_run_client_snapshots s on s.run_id=r.id
   join public.coop_run_private_state p on p.run_id=r.id
   where a.account_id=p_account_id and a.active and r.coop_mode='event'
    and (r.status='active' or (r.status='completed' and p.state_json#>>'{run,settlement}'='pending'))
   order by r.created_at desc limit 1
  ),
  'echoSharing',exists(
   select 1 from public.echo_profiles e join public.characters c on c.id=e.character_id
   where c.account_id=p_account_id and e.opted_in and e.expires_at>now() and e.preferences->>'pipeline'='online_coop_v1'
  ),
  'liveFellowshipRemaining',coalesce((
   select greatest(0,3-f.used)
   from public.coop_live_fellowship_weekly f
   where f.account_id=p_account_id and f.week_key=(date_trunc('week',now() at time zone 'UTC'))::date
  ),3)
 );
$$;
revoke all on function public.online_coop_entry_state_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.online_coop_entry_state_server_v1(uuid) to service_role;

commit;
