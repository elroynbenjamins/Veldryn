-- Match shared gameplay storage prices and character level requirements.
create or replace function public.upgrade_storage_capacity(p_character_id uuid,p_location text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid(); v_level integer; v_required_level integer; v_current integer; v_next integer; v_cost bigint; v_receipt jsonb; v_result jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_location not in ('inventory','bank') or char_length(p_idempotency_key)<8 then raise exception 'INVALID_REQUEST'; end if;
  if not exists(select 1 from public.characters where id=p_character_id and account_id=v_uid) then raise exception 'CHARACTER_NOT_OWNED'; end if;
  select response_json into v_receipt from public.storage_operation_receipts where account_id=v_uid and idempotency_key=p_idempotency_key;
  if found then return v_receipt||jsonb_build_object('replayed',true); end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
  insert into public.account_storage(account_id) values(v_uid) on conflict(account_id) do nothing;
  if p_location='inventory' then select inventory_capacity into v_current from public.characters where id=p_character_id for update;
  else select bank_capacity into v_current from public.account_storage where account_id=v_uid for update; end if;
  if p_location='inventory' then
    select capacity,cost,required_level into v_next,v_cost,v_required_level from (values(40,5000::bigint,10),(50,15000,20),(60,40000,35),(75,100000,50),(100,250000,70)) as tiers(capacity,cost,required_level) where capacity>v_current order by capacity limit 1;
  else select capacity,cost,required_level into v_next,v_cost,v_required_level from (values(160,10000::bigint,10),(220,30000,20),(300,80000,35),(400,200000,50),(500,500000,70)) as tiers(capacity,cost,required_level) where capacity>v_current order by capacity limit 1; end if;
  select level into v_level from public.characters where id=p_character_id and account_id=v_uid;
  if v_next is null then raise exception 'STORAGE_MAXED'; end if;
  if v_level<v_required_level then raise exception 'REQUIRES_LEVEL_%',v_required_level; end if;
  update public.character_wallets set gold=gold-v_cost,updated_at=now() where character_id=p_character_id and gold>=v_cost;
  if not found then raise exception 'INSUFFICIENT_GOLD'; end if;
  if p_location='inventory' then update public.characters set inventory_capacity=v_next,updated_at=now() where id=p_character_id;
  else update public.account_storage set bank_capacity=v_next,updated_at=now() where account_id=v_uid; end if;
  v_result=jsonb_build_object('replayed',false,'location',p_location,'capacity',v_next,'goldSpent',v_cost);
  insert into public.storage_operation_receipts(account_id,idempotency_key,operation,response_json) values(v_uid,p_idempotency_key,'upgrade_'||p_location,v_result);
  return v_result;
end $$;
