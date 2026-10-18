-- Safety regression checks for the Guild Shop schema.
-- Run in a disposable database after applying all guild_shop migrations.
begin;
do $$
declare v_can_grant boolean; v_can_purchase boolean; v_can_redeem boolean;
begin
 select has_function_privilege('service_role',
 'public.guild_shop_grant_tokens_server_v1(uuid,text,bigint,boolean)','EXECUTE')
 into v_can_grant;
 select has_function_privilege('service_role',
 'public.guild_shop_purchase_server_v1(uuid,text,bigint)','EXECUTE')
 into v_can_purchase;
 select has_function_privilege('service_role',
 'public.guild_shop_redeem_verified_claim_server_v2(uuid,text)','EXECUTE')
 into v_can_redeem;
 if v_can_grant or v_can_purchase or not v_can_redeem then
  raise exception 'guild_shop_privilege_regression';
 end if;
 if has_function_privilege('authenticated',
 'public.guild_shop_redeem_verified_claim_server_v2(uuid,text)','EXECUTE')
 then raise exception 'guild_shop_client_execution_exposed'; end if;
end $$;
rollback;
