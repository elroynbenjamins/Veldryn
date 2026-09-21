begin;

do $$
declare
  funcs regprocedure[] := array[
    'public.claim_gathering_activity(uuid,text)'::regprocedure,
    'public.start_gathering_activity(uuid,text)'::regprocedure,
    'public.equip_item_instance(uuid,uuid,text)'::regprocedure,
    'public.transfer_storage_item(uuid,uuid,integer,text,text)'::regprocedure,
    'public.unequip_item_slot(uuid,text)'::regprocedure,
    'public.upgrade_storage_capacity(uuid,text,text)'::regprocedure
  ];
  f regprocedure;
begin
  foreach f in array funcs loop
    if has_function_privilege('anon',f,'EXECUTE') then
      raise exception 'anon must not execute legacy gameplay RPC %',f;
    end if;
    if has_function_privilege('authenticated',f,'EXECUTE') then
      raise exception 'authenticated must not execute legacy gameplay RPC %',f;
    end if;
    if not has_function_privilege('service_role',f,'EXECUTE') then
      raise exception 'service_role must retain trusted compatibility for %',f;
    end if;
  end loop;
end $$;

select 'PASS: legacy direct gameplay mutation RPCs are not client-callable' as result;
rollback;
