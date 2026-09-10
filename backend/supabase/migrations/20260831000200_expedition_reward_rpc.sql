create table if not exists public.expedition_wallets (
  account_id uuid primary key references auth.users(id) on delete cascade,
  expedition_marks bigint not null default 0 check (expedition_marks >= 0),
  commendations bigint not null default 0 check (commendations >= 0),
  relic_fragments bigint not null default 0 check (relic_fragments >= 0),
  updated_at timestamptz not null default now()
);

alter table public.expedition_wallets enable row level security;
create policy expedition_wallets_read_self on public.expedition_wallets
for select using (account_id = auth.uid());

create or replace function public.expedition_failure_fraction(
  p_cleared boolean,
  p_progress numeric,
  p_reached_final_boss boolean,
  p_final_boss_hp_fraction numeric
) returns numeric
language sql immutable as $$
  select case
    when p_cleared then 1.00
    when p_reached_final_boss and coalesce(p_final_boss_hp_fraction, 1) <= 0.25 then 0.45
    when p_reached_final_boss then 0.35
    when p_progress >= 0.50 then 0.25
    when p_progress >= 0.25 then 0.15
    else 0.05
  end;
$$;

create or replace function public.expedition_tier_marks_multiplier(p_tier smallint)
returns numeric language sql immutable as $$
  select case p_tier
    when 1 then 1.00 when 2 then 1.10 when 3 then 1.25 when 4 then 1.45 when 5 then 1.70
    else null end;
$$;

-- Canonical week key is Monday UTC. Reset presentation can still be localized client-side.
create or replace function public.expedition_week_key(p_now timestamptz default now())
returns date language sql stable as $$
  select date_trunc('week', p_now at time zone 'UTC')::date;
$$;

create or replace function public.claim_expedition_reward(
  p_run_id uuid,
  p_character_id uuid,
  p_reward_stage text,
  p_map_base_marks integer,
  p_objective_multiplier numeric default 1.0,
  p_reached_final_boss boolean default false,
  p_final_boss_hp_fraction numeric default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_run public.expedition_runs%rowtype;
  v_daily public.expedition_daily_counters%rowtype;
  v_weekly public.expedition_weekly_counters%rowtype;
  v_today date := (now() at time zone 'UTC')::date;
  v_week date := public.expedition_week_key(now());
  v_enhanced boolean;
  v_fraction numeric;
  v_full_marks integer;
  v_marks integer;
  v_claim_id uuid;
  v_existing jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_map_base_marks < 0 or p_objective_multiplier < 0 then raise exception 'INVALID_REWARD_INPUT'; end if;

  select * into v_run from public.expedition_runs where id = p_run_id for update;
  if not found then raise exception 'RUN_NOT_FOUND'; end if;

  if not exists (
    select 1 from public.expedition_run_members
    where run_id = p_run_id and character_id = p_character_id and account_id = v_uid
  ) then raise exception 'NOT_RUN_MEMBER'; end if;

  select reward_json into v_existing
  from public.expedition_reward_claims
  where run_id = p_run_id and character_id = p_character_id and reward_stage = p_reward_stage;
  if found then return v_existing || jsonb_build_object('idempotent_replay', true); end if;

  insert into public.expedition_daily_counters(account_id, date_key)
  values(v_uid, v_today) on conflict do nothing;
  insert into public.expedition_weekly_counters(account_id, week_key)
  values(v_uid, v_week) on conflict do nothing;

  select * into v_daily from public.expedition_daily_counters
    where account_id=v_uid and date_key=v_today for update;
  select * into v_weekly from public.expedition_weekly_counters
    where account_id=v_uid and week_key=v_week for update;

  v_enhanced := v_daily.enhanced_claims < 3 and v_weekly.enhanced_claims < 12;
  v_fraction := public.expedition_failure_fraction(
    v_run.status = 'completed', v_run.route_progress, p_reached_final_boss, p_final_boss_hp_fraction
  );
  v_full_marks := round(p_map_base_marks * public.expedition_tier_marks_multiplier(v_run.tier) * p_objective_multiplier * v_fraction);
  v_marks := greatest(0, case when v_enhanced then v_full_marks else round(v_full_marks * 0.20) end);

  insert into public.expedition_wallets(account_id) values(v_uid) on conflict do nothing;
  update public.expedition_wallets
     set expedition_marks = expedition_marks + v_marks, updated_at = now()
   where account_id = v_uid;

  insert into public.expedition_currency_ledger(account_id, run_id, currency, amount, reason, idempotency_key)
  values(v_uid, p_run_id, 'expedition_mark', v_marks, 'expedition_reward:'||p_reward_stage,
         'exp-reward:'||p_run_id::text||':'||p_character_id::text||':'||p_reward_stage);

  if v_enhanced then
    update public.expedition_daily_counters set enhanced_claims = enhanced_claims + 1
      where account_id=v_uid and date_key=v_today;
    update public.expedition_weekly_counters set enhanced_claims = enhanced_claims + 1
      where account_id=v_uid and week_key=v_week;
  end if;

  insert into public.expedition_reward_claims(run_id, character_id, account_id, reward_stage, reward_json)
  values(p_run_id, p_character_id, v_uid, p_reward_stage,
    jsonb_build_object(
      'marks', v_marks,
      'enhanced', v_enhanced,
      'reward_fraction', v_fraction,
      'tier', v_run.tier,
      'daily_enhanced_used_after', v_daily.enhanced_claims + case when v_enhanced then 1 else 0 end,
      'weekly_enhanced_used_after', v_weekly.enhanced_claims + case when v_enhanced then 1 else 0 end,
      'idempotent_replay', false
    )
  ) returning id, reward_json into v_claim_id, v_existing;

  return v_existing || jsonb_build_object('claim_id', v_claim_id);
exception
  when unique_violation then
    select reward_json into v_existing from public.expedition_reward_claims
      where run_id=p_run_id and character_id=p_character_id and reward_stage=p_reward_stage;
    if found then return v_existing || jsonb_build_object('idempotent_replay', true); end if;
    raise;
end;
$$;

revoke all on function public.claim_expedition_reward(uuid,uuid,text,integer,numeric,boolean,numeric) from public;
grant execute on function public.claim_expedition_reward(uuid,uuid,text,integer,numeric,boolean,numeric) to authenticated;
