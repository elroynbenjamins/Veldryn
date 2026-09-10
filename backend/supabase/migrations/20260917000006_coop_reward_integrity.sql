create table if not exists public.coop_reward_entitlements (
 id uuid primary key default gen_random_uuid(),
 run_id uuid not null references public.expedition_runs(id) on delete cascade,
 recipient_account_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid,
 entitlement_kind text not null check (entitlement_kind in ('participant','echo_assistance')),
 reward_stage text not null,
 period_date_key date not null,
 period_week_key date not null,
 reward_json jsonb not null,
 claimed_at timestamptz,
 claim_request_id text,
 unique(run_id,recipient_account_id,entitlement_kind,reward_stage)
);
alter table public.coop_reward_entitlements enable row level security;
create policy coop_entitlement_read_self on public.coop_reward_entitlements for select using(recipient_account_id=auth.uid());
revoke insert,update,delete on public.coop_reward_entitlements from anon,authenticated;

create or replace function public.claim_coop_reward(p_entitlement_id uuid,p_request_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_ent public.coop_reward_entitlements%rowtype;v_marks integer;v_ledger_key text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if char_length(p_request_id)<8 or char_length(p_request_id)>128 then raise exception 'INVALID_REQUEST_ID';end if;
 select * into v_ent from public.coop_reward_entitlements where id=p_entitlement_id for update;
 if not found then raise exception 'ENTITLEMENT_NOT_FOUND';end if;
 if v_ent.recipient_account_id<>v_uid then raise exception 'NOT_REWARD_RECIPIENT';end if;
 if v_ent.claimed_at is not null then return v_ent.reward_json||jsonb_build_object('idempotent_replay',true);end if;
 v_marks:=greatest(0,coalesce((v_ent.reward_json->>'marks')::integer,0));v_ledger_key:='coop-entitlement:'||v_ent.id::text;
 insert into public.expedition_wallets(account_id)values(v_uid)on conflict do nothing;
 update public.expedition_wallets set expedition_marks=expedition_marks+v_marks,updated_at=clock_timestamp() where account_id=v_uid;
 insert into public.expedition_currency_ledger(account_id,run_id,currency,amount,reason,idempotency_key)values(v_uid,v_ent.run_id,'expedition_mark',v_marks,'coop_'||v_ent.entitlement_kind,v_ledger_key);
 update public.coop_reward_entitlements set claimed_at=clock_timestamp(),claim_request_id=p_request_id where id=v_ent.id;
 return v_ent.reward_json||jsonb_build_object('idempotent_replay',false);
exception when unique_violation then
 select * into v_ent from public.coop_reward_entitlements where id=p_entitlement_id;
 return v_ent.reward_json||jsonb_build_object('idempotent_replay',true);
end;$$;
revoke all on function public.claim_coop_reward(uuid,text) from public,anon;
grant execute on function public.claim_coop_reward(uuid,text) to authenticated;
