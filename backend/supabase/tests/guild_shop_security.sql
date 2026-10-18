-- Guild Shop privilege regression checks.
-- Execute ONLY in a disposable database with all Guild Shop migrations applied.
-- The event and normal token grant entrypoints are trusted-service only;
-- permanent purchases/construction spends remain deliberately unreleased.
begin;
do $$
declare v_can_grant boolean; v_can_legacy_buy boolean;
begin
 select has_function_privilege('service_role',
  'public.guild_shop_grant_tokens_server_v1(uuid,text,bigint,boolean)','EXECUTE') into v_can_grant;
 select has_function_privilege('service_role',
  'public.guild_shop_purchase_server_v1(uuid,text,bigint)','EXECUTE') into v_can_legacy_buy;
 if v_can_grant or v_can_legacy_buy then
  raise exception 'guild_unsafe_legacy_rpc_exposed';
 end if;
 if has_function_privilege('service_role',
  'public.guild_shop_purchase_server_v4(uuid,text)','EXECUTE')
  or has_function_privilege('service_role',
  'public.guild_construction_donate_server_v2(uuid,text,text,integer,text)','EXECUTE')
 then raise exception 'guild_unreleased_spend_rpc_exposed';end if;

 if not has_function_privilege('service_role',
  'public.guild_shop_redeem_verified_claim_server_v2(uuid,text)','EXECUTE')
  or not has_function_privilege('service_role',
  'public.guild_shop_claim_daily_server_v1(uuid,text)','EXECUTE')
  or not has_function_privilege('service_role',
  'public.guild_shop_claim_weekly_server_v1(uuid,text)','EXECUTE')
  or not has_function_privilege('service_role',
  'public.guild_shop_claim_event_community_server_v1(uuid,text,integer)','EXECUTE')
 then raise exception 'guild_verified_claim_rpc_missing';end if;

 if has_function_privilege('authenticated',
  'public.guild_shop_redeem_verified_claim_server_v2(uuid,text)','EXECUTE')
  or has_function_privilege('authenticated',
  'public.guild_shop_claim_daily_server_v1(uuid,text)','EXECUTE')
  or has_function_privilege('authenticated',
  'public.guild_shop_claim_weekly_server_v1(uuid,text)','EXECUTE')
  or has_function_privilege('authenticated',
  'public.guild_shop_claim_event_community_server_v1(uuid,text,integer)','EXECUTE')
  or has_function_privilege('authenticated',
  'public.guild_shop_purchase_server_v4(uuid,text)','EXECUTE')
  or has_function_privilege('authenticated',
  'public.guild_construction_donate_server_v2(uuid,text,text,integer,text)','EXECUTE')
 then raise exception 'guild_client_exec_exposed';end if;
end $$;
rollback;
