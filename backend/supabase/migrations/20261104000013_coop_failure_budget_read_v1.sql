-- Add non-farmable weekly failure consolation allowance to read-only co-op reward budget.
-- Must be deployed BEFORE the new backend; grants only to service_role.
begin;
create or replace function public.online_coop_reward_budget_server_v1(p_account_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
 v_now timestamptz:=now();
 v_week date:=(date_trunc('week', now() at time zone 'UTC'))::date;
 v_charges integer:=3;
 v_weekly integer:=0;
 v_next timestamptz;
 v_stored_week date;
 v_restored integer;
 v_failed_weekly integer:=0;
begin
 if p_account_id is null then raise exception 'account_required';end if;
 select charges,weekly_used,next_charge_at,week_key
 into v_charges,v_weekly,v_next,v_stored_week
 from public.coop_reward_charge_balances where account_id=p_account_id;
 if not found then
  v_charges:=3;v_weekly:=0;v_next:=null;
 else
  if v_stored_week is distinct from v_week then v_weekly:=0;end if;
  if v_next is not null and v_now>=v_next and v_charges<3 then
   v_restored:=floor(extract(epoch from(v_now-v_next))/28800)::integer+1;
   v_charges:=least(3,v_charges+v_restored);
   v_next:=case when v_charges>=3 then null else v_next+v_restored*interval '8 hours' end;
  end if;
 end if;
 select used into v_failed_weekly from public.coop_failure_consolation_weekly where account_id=p_account_id and week_key=v_week;
 v_failed_weekly:=coalesce(v_failed_weekly,0);
 return jsonb_build_object(
  'charges',v_charges,'chargeCapacity',3,'weeklyRemaining',greatest(0,12-v_weekly),
  'weeklyCapacity',12,'failureConsolationRemaining',greatest(0,12-v_failed_weekly),'failureConsolationCapacity',12,'nextChargeAtMs',case when v_next is null then null else floor(extract(epoch from v_next)*1000)::bigint end
 );
end $$;
revoke all on function public.online_coop_reward_budget_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.online_coop_reward_budget_server_v1(uuid) to service_role;
commit;
