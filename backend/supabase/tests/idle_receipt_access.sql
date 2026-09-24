begin;
do $$
begin
 if not (select relrowsecurity from pg_class where oid='public.idle_claim_receipts'::regclass) then
  raise exception 'idle receipts must enforce RLS';
 end if;
 if has_table_privilege('anon','public.idle_claim_receipts','SELECT')
    or has_table_privilege('authenticated','public.idle_claim_receipts','INSERT')
    or has_table_privilege('authenticated','public.idle_claim_receipts','UPDATE') then
  raise exception 'clients must not access the server receipt ledger';
 end if;
 if has_function_privilege('authenticated','public.claim_idle_progress_atomic(uuid,text,text,integer,text,bigint,bigint)','EXECUTE')
    or has_function_privilege('anon','public.claim_idle_progress_atomic(uuid,text,text,integer,text,bigint,bigint)','EXECUTE') then
  raise exception 'clients must not supply authoritative idle reward amounts';
 end if;
 if not has_function_privilege('service_role','public.claim_idle_progress_atomic(uuid,text,text,integer,text,bigint,bigint)','EXECUTE') then
  raise exception 'trusted server must retain idle claim access';
 end if;
end $$;
select 'PASS: idle ledger RLS, client denial and trusted server access' as result;
rollback;
