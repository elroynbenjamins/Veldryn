-- Unlimited co-op entry with slowly replenishing enhanced-reward charges.
create table if not exists public.coop_reward_charge_balances (
  account_id uuid primary key references auth.users(id) on delete cascade,
  charges smallint not null default 3 check(charges between 0 and 3),
  next_charge_at timestamptz,
  week_key date not null,
  weekly_used smallint not null default 0 check(weekly_used between 0 and 12),
  updated_at timestamptz not null default now()
);
alter table public.coop_reward_charge_balances enable row level security;
drop policy if exists coop_reward_charge_read_self on public.coop_reward_charge_balances;
create policy coop_reward_charge_read_self on public.coop_reward_charge_balances
  for select to authenticated using(account_id=auth.uid());
revoke insert,update,delete on public.coop_reward_charge_balances from anon,authenticated;

create or replace function public.claim_coop_reward(p_entitlement_id uuid,p_request_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid();
  v_ent public.coop_reward_entitlements%rowtype;
  v_budget public.coop_reward_charge_balances%rowtype;
  v_now timestamptz:=clock_timestamp();
  v_marks integer;
  v_full_marks integer;
  v_restored integer;
  v_enhanced boolean:=false;
  v_ledger_key text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  if char_length(p_request_id)<8 or char_length(p_request_id)>128 then raise exception 'INVALID_REQUEST_ID';end if;
  select * into v_ent from public.coop_reward_entitlements where id=p_entitlement_id for update;
  if not found then raise exception 'ENTITLEMENT_NOT_FOUND';end if;
  if v_ent.recipient_account_id<>v_uid then raise exception 'NOT_REWARD_RECIPIENT';end if;
  if v_ent.claimed_at is not null then return v_ent.reward_json||jsonb_build_object('idempotent_replay',true);end if;

  insert into public.coop_reward_charge_balances(account_id,week_key) values(v_uid,v_ent.period_week_key)
    on conflict(account_id) do nothing;
  select * into v_budget from public.coop_reward_charge_balances where account_id=v_uid for update;
  if v_budget.week_key<>v_ent.period_week_key then
    v_budget.week_key:=v_ent.period_week_key;
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
  else
    v_marks:=v_full_marks;
  end if;
  update public.coop_reward_charge_balances set charges=v_budget.charges,next_charge_at=v_budget.next_charge_at,week_key=v_budget.week_key,weekly_used=v_budget.weekly_used,updated_at=v_now where account_id=v_uid;

  v_ent.reward_json:=v_ent.reward_json||jsonb_build_object('marks',v_marks,'enhanced_reward',v_enhanced,'reward_charges_remaining',v_budget.charges,'next_reward_charge_at',v_budget.next_charge_at,'weekly_enhanced_remaining',greatest(0,12-v_budget.weekly_used));
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
