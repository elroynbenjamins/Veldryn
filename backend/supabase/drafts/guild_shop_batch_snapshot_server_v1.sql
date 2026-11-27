-- REVIEW ONLY: not a migration. Install and verify in isolation, then generate migration.
-- Eight production functions confirmed STABLE, jsonb-returning, service_role-only.
-- All reads share one statement snapshot. Do not expose this RPC to clients.
begin;
create or replace function public.guild_shop_batch_snapshot_server_v1(p_account_id uuid)
returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $function$
declare
  result jsonb;
  value jsonb;
begin
  if p_account_id is null or not exists (
    select 1 from public.guild_members where account_id=p_account_id
  ) then raise exception 'guild_membership_required'; end if;
  -- Required wallet projection: failures must fail the entire request.
  value := public.guild_shop_snapshot_server_v1(p_account_id);
  if value is null then raise exception 'guild_shop_wallet_snapshot_unavailable'; end if;
  result := jsonb_build_object('base',value);
  -- Independent optional projections preserve the existing degraded response contract.
  begin
    value := public.guild_construction_snapshot_server_v1(p_account_id);
    result := result || jsonb_build_object('construction',jsonb_build_object('ok',true,'value',value));
  exception when others then
    result := result || jsonb_build_object('construction',jsonb_build_object('ok',false));
  end;
  begin
    value := public.guild_shop_event_community_rewards_server_v1(p_account_id);
    result := result || jsonb_build_object('eventBonuses',jsonb_build_object('ok',true,'value',value));
  exception when others then
    result := result || jsonb_build_object('eventBonuses',jsonb_build_object('ok',false));
  end;
  begin
    value := public.guild_construction_enabled_server_v1(p_account_id);
    result := result || jsonb_build_object('constructionUnlocks',jsonb_build_object('ok',true,'value',value));
  exception when others then
    result := result || jsonb_build_object('constructionUnlocks',jsonb_build_object('ok',false));
  end;
  begin
    value := public.guild_shop_weekly_rewards_server_v1(p_account_id);
    result := result || jsonb_build_object('weeklyRewards',jsonb_build_object('ok',true,'value',value));
  exception when others then
    result := result || jsonb_build_object('weeklyRewards',jsonb_build_object('ok',false));
  end;
  begin
    value := public.guild_bank_snapshot_server_v1(p_account_id);
    result := result || jsonb_build_object('bank',jsonb_build_object('ok',true,'value',value));
  exception when others then
    result := result || jsonb_build_object('bank',jsonb_build_object('ok',false));
  end;
  begin
    value := public.guild_construction_benefits_server_v1(p_account_id);
    result := result || jsonb_build_object('constructionBenefits',jsonb_build_object('ok',true,'value',value));
  exception when others then
    result := result || jsonb_build_object('constructionBenefits',jsonb_build_object('ok',false));
  end;
  begin
    value := public.guild_construction_costs_server_v1(p_account_id);
    result := result || jsonb_build_object('constructionCosts',jsonb_build_object('ok',true,'value',value));
  exception when others then
    result := result || jsonb_build_object('constructionCosts',jsonb_build_object('ok',false));
  end;
  return result;
end;
$function$;
revoke all on function public.guild_shop_batch_snapshot_server_v1(uuid) from public, anon, authenticated;
grant execute on function public.guild_shop_batch_snapshot_server_v1(uuid) to service_role;
comment on function public.guild_shop_batch_snapshot_server_v1(uuid) is 'Service-only batch of eight existing Guild shop projections. Caller must authenticate and derive account id server-side. No settlement.';
rollback;
