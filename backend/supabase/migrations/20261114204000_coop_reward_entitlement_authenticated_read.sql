-- Restore authenticated players' ability to read their own pending
-- dungeon/expedition reward entitlements.
--
-- This is intentionally read-only: claiming stays in claim_coop_reward.
-- The existing coop_entitlement_read_self RLS policy restricts SELECT
-- to recipient_account_id = auth.uid(). Anonymous table access is not granted.
--
-- Production was hotfixed on 2026-11-14 after an API "permission denied"
-- response. This migration makes the grant durable on subsequent deploys.
do $guard$
begin
  if to_regclass('public.coop_reward_entitlements') is null then
    raise exception 'coop_reward_entitlements_missing';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.coop_reward_entitlements'::regclass
      and relrowsecurity
  ) then
    raise exception 'coop_reward_entitlements_rls_required';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'coop_reward_entitlements'
      and policyname = 'coop_entitlement_read_self'
      and cmd = 'SELECT'
  ) then
    raise exception 'coop_reward_entitlements_owner_policy_missing';
  end if;
end
$guard$;

grant select on table public.coop_reward_entitlements to authenticated;
