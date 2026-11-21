-- Veldryn 2.0: transactionally restore historical ATK gem investments.
-- Safe to install ahead of 2.0: feature gate defaults OFF. No user state is
-- changed by this migration. Never toggle the gate for the 1.0.x live client.
begin;

create table if not exists private.legacy_attack_gem_restoration_settings_v2(
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default clock_timestamp()
);
insert into private.legacy_attack_gem_restoration_settings_v2(singleton,enabled)
values(true,false) on conflict (singleton) do nothing;
alter table private.legacy_attack_gem_restoration_settings_v2 enable row level security;
revoke all on private.legacy_attack_gem_restoration_settings_v2 from public, anon, authenticated;
grant select on private.legacy_attack_gem_restoration_settings_v2 to service_role;

create table if not exists private.legacy_attack_gem_restoration_receipts_v2(
  account_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  legacy_id text not null,
  quantity integer not null check (quantity between 1 and 1000),
  consumed_id text not null,
  consumed_quantity integer not null check (consumed_quantity > 0),
  granted_id text not null,
  granted_quantity integer not null check (granted_quantity > 0),
  revision_before bigint not null check (revision_before >= 0),
  revision_after bigint not null check (revision_after > revision_before),
  response jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key(account_id,request_id),
  check (
    (legacy_id='EMBER_SHARD' and consumed_id='gem:stat_might:g1' and consumed_quantity=quantity*3
      and granted_id='gem:stat_might:g3' and granted_quantity=quantity)
    or
    (legacy_id='EMBERHEART_GEM' and consumed_id='gem:stat_might:g3' and consumed_quantity=quantity*4
      and granted_id='LEGACY_EMBERHEART_GEM_V2' and granted_quantity=quantity)
  )
);
create index if not exists legacy_attack_gem_receipts_account_kind_v2
  on private.legacy_attack_gem_restoration_receipts_v2(account_id,legacy_id);
alter table private.legacy_attack_gem_restoration_receipts_v2 enable row level security;
revoke all on private.legacy_attack_gem_restoration_receipts_v2 from public,anon,authenticated;
grant select on private.legacy_attack_gem_restoration_receipts_v2 to service_role;

-- Only genuine, unlocked stackable copies are eligible for opt-in exchanges.
-- Invalid/instance-owned/locked stacks are not spendable. Each compartment is
-- checked independently and item identity is never derived from client input.
create or replace function private.v2_legacy_attack_gem_spendable_v2(p_stack jsonb,p_item_id text)
returns boolean language sql immutable set search_path=pg_catalog as $$
select jsonb_typeof(p_stack)='object'
  and p_stack->>'itemId'=p_item_id
  and not (p_stack ? 'instanceId')
  and coalesce(p_stack->>'bound','false')='false'
  and coalesce(p_stack->>'locked','false')='false'
  and coalesce(p_stack->>'favorite','false')='false'
  and coalesce(p_stack->>'quantity','') ~ '^[1-9][0-9]{0,8}$';
$$;

create or replace function private.v2_legacy_attack_gem_quantity_v2(
  p_state jsonb,p_item_id text,p_only_spendable boolean default false
) returns integer language plpgsql immutable
set search_path=pg_catalog,private as $$
declare
  v_path text[];
  v_stacks jsonb;
  v_entry jsonb;
  v_total bigint:=0;
  v_locked jsonb:=coalesce(p_state#>'{settings,lockedItemIds}','[]'::jsonb);
  v_favorite jsonb:=coalesce(p_state#>'{settings,favoriteItemIds}','[]'::jsonb);
begin
  if p_only_spendable and (
    v_locked @> jsonb_build_array(p_item_id) or v_favorite @> jsonb_build_array(p_item_id)
  ) then return 0; end if;
  for v_path in
    select p.path from (values
      (array['account','gemPouch','stacks']::text[]),
      (array['inventory','stacks']::text[]),
      (array['bank','stacks']::text[]),
      (array['overflow','stacks']::text[])
    ) p(path)
  loop
    v_stacks:=p_state#>v_path;
    if jsonb_typeof(v_stacks)<>'array' then continue; end if;
    for v_entry in select value from jsonb_array_elements(v_stacks)
    loop
      if v_entry->>'itemId'=p_item_id
        and (
          (p_only_spendable and private.v2_legacy_attack_gem_spendable_v2(v_entry,p_item_id))
          or (not p_only_spendable and coalesce(v_entry->>'quantity','') ~ '^[1-9][0-9]{0,8}$')
        )
      then
        v_total:=v_total+(v_entry->>'quantity')::integer;
        if v_total>2147483647 then raise exception 'v2_restoration_quantity_overflow'; end if;
      end if;
    end loop;
  end loop;
  return v_total::integer;
end;
$$;

create or replace function private.v2_legacy_attack_gem_original_count_v2(
  p_account_id uuid,p_legacy_id text
) returns integer language plpgsql stable
set search_path=pg_catalog,private as $$
declare
  v_state jsonb;
  v_rows integer;
begin
  if p_legacy_id not in ('EMBER_SHARD','EMBERHEART_GEM') then
    raise exception 'v2_restoration_unsupported_legacy_gem';
  end if;
  select count(*),min(original_state::text)::jsonb
    into v_rows,v_state
    from private.legacy_gem_conversion_backup_v1
   where account_id=p_account_id;
  if v_rows=0 then return 0; end if;
  if v_rows<>1 then raise exception 'v2_restoration_backup_requires_review'; end if;
  return private.v2_legacy_attack_gem_quantity_v2(v_state,p_legacy_id,false);
end;
$$;

create or replace function private.v2_legacy_attack_gem_remove_v2(
  p_state jsonb,p_item_id text,p_quantity integer
) returns jsonb language plpgsql immutable
set search_path=pg_catalog,private as $$
declare
  v_state jsonb:=p_state;
  v_path text[];
  v_stacks jsonb;
  v_updated jsonb;
  v_entry jsonb;
  v_remaining integer:=p_quantity;
  v_take integer;
  v_quantity integer;
begin
  if p_quantity<1 or
     private.v2_legacy_attack_gem_quantity_v2(v_state,p_item_id,true)<p_quantity then
     raise exception 'v2_restoration_insufficient_gems';
  end if;
  for v_path in
    select p.path from (values
      (array['account','gemPouch','stacks']::text[]),
      (array['inventory','stacks']::text[]),
      (array['bank','stacks']::text[]),
      (array['overflow','stacks']::text[])
    ) p(path)
  loop
    if v_remaining=0 then exit; end if;
    v_stacks:=v_state#>v_path;
    if jsonb_typeof(v_stacks)<>'array' then continue; end if;
    v_updated:='[]'::jsonb;
    for v_entry in select value from jsonb_array_elements(v_stacks)
    loop
      if v_remaining>0 and private.v2_legacy_attack_gem_spendable_v2(v_entry,p_item_id) then
        v_quantity:=(v_entry->>'quantity')::integer;
        v_take:=least(v_remaining,v_quantity);
        v_quantity:=v_quantity-v_take;
        v_remaining:=v_remaining-v_take;
        if v_quantity>0 then
          v_updated:=v_updated||jsonb_build_array(
            jsonb_set(v_entry,'{quantity}',to_jsonb(v_quantity),true)
          );
        end if;
      else
        v_updated:=v_updated||jsonb_build_array(v_entry);
      end if;
    end loop;
    v_state:=jsonb_set(v_state,v_path,v_updated,false);
  end loop;
  if v_remaining<>0 then raise exception 'v2_restoration_insufficient_gems'; end if;
  return v_state;
end;
$$;

-- Prefer the existing account Gem Pouch, then the already trusted item
-- distribution helper (Inventory / Bank / Overflow with 72h claim window).
create or replace function private.v2_legacy_attack_gem_grant_v2(
  p_state jsonb,p_item_id text,p_quantity integer,p_now_ms bigint
) returns jsonb language plpgsql volatile
set search_path=pg_catalog,private,public as $$
declare
  v_stacks jsonb;
  v_result jsonb;
  v_entry jsonb;
  v_capacity integer;
  v_exists boolean:=false;
begin
  if p_quantity<1 then raise exception 'v2_restoration_invalid_grant_quantity'; end if;
  v_stacks:=p_state#>'{account,gemPouch,stacks}';
  if jsonb_typeof(v_stacks)='array' then
    v_result:='[]'::jsonb;
    for v_entry in select value from jsonb_array_elements(v_stacks)
    loop
      if v_entry->>'itemId'=p_item_id then
        if v_exists then raise exception 'v2_restoration_duplicate_target_stack'; end if;
        if coalesce(v_entry->>'quantity','') !~ '^[1-9][0-9]{0,8}$' then
          raise exception 'v2_restoration_invalid_target_stack';
        end if;
        v_entry:=jsonb_set(v_entry,'{quantity}',to_jsonb((v_entry->>'quantity')::integer+p_quantity),true);
        v_exists:=true;
      end if;
      v_result:=v_result||jsonb_build_array(v_entry);
    end loop;
    if v_exists then
      return jsonb_set(p_state,'{account,gemPouch,stacks}',v_result,false);
    end if;
    v_capacity:=greatest(0,coalesce((p_state#>>'{account,gemPouch,capacity}')::integer,0));
    if jsonb_array_length(v_stacks)<v_capacity then
      return jsonb_set(p_state,'{account,gemPouch,stacks}',v_stacks||
        jsonb_build_array(jsonb_build_object('itemId',p_item_id,'quantity',p_quantity)),false);
    end if;
  end if;
  return public.veldryn_game_state_add_stackable_v1(p_state,p_item_id,p_quantity,p_now_ms);
end;
$$;

create or replace function private.v2_legacy_attack_gem_plan_v2(
  p_account_id uuid,p_state jsonb
) returns jsonb language plpgsql stable
set search_path=pg_catalog,private as $$
declare
  v_id text;
  v_old_count integer;
  v_restored integer;
  v_remaining integer;
  v_copies integer;
  v_input text;
  v_output text;
  v_available integer;
  v_ready integer;
  v_rows jsonb:='[]'::jsonb;
begin
  foreach v_id in array array['EMBER_SHARD','EMBERHEART_GEM'] loop
    if v_id='EMBER_SHARD' then
      v_input:='gem:stat_might:g1';v_output:='gem:stat_might:g3';v_copies:=3;
    else
      v_input:='gem:stat_might:g3';v_output:='LEGACY_EMBERHEART_GEM_V2';v_copies:=4;
    end if;
    v_old_count:=private.v2_legacy_attack_gem_original_count_v2(p_account_id,v_id);
    select coalesce(sum(quantity),0)::integer into v_restored
      from private.legacy_attack_gem_restoration_receipts_v2
     where account_id=p_account_id and legacy_id=v_id;
    if v_restored>v_old_count then raise exception 'v2_restoration_invalid_receipts'; end if;
    v_remaining:=v_old_count-v_restored;
    v_available:=private.v2_legacy_attack_gem_quantity_v2(p_state,v_input,true);
    v_ready:=least(v_remaining,v_available/v_copies);
    v_rows:=v_rows||jsonb_build_array(jsonb_build_object(
      'legacyId',v_id,'originalCount',v_old_count,'restoredCount',v_restored,
      'remainingEligible',v_remaining,'canRestoreNow',v_ready,
      'needsReview',v_remaining-v_ready,
      'status',case when v_old_count=0 then 'not_eligible'
                    when v_remaining=0 then 'already_restored'
                    when v_ready>0 then 'ready' else 'manual_review' end,
      'consume',jsonb_build_object('itemId',v_input,'quantity',v_ready*v_copies),
      'grant',jsonb_build_object('itemId',v_output,'quantity',v_ready)
    ));
  end loop;
  return v_rows;
end;
$$;

-- Read-only authenticated preview. Only the caller's verified account is used;
-- the backup snapshot and private receipts are never returned as raw JSON.
create or replace function public.preview_legacy_attack_gem_restoration_v2()
returns jsonb language plpgsql stable security definer
set search_path=pg_catalog,private,public as $$
declare
  v_account uuid:=auth.uid();
  v_state jsonb;
  v_revision bigint;
  v_enabled boolean;
begin
  if v_account is null then raise exception 'authentication_required'; end if;
  select enabled into v_enabled
    from private.legacy_attack_gem_restoration_settings_v2 where singleton=true;
  select state,revision into v_state,v_revision
    from public.online_game_states where account_id=v_account;
  if not found then raise exception 'game_not_loaded'; end if;
  return jsonb_build_object('enabled',coalesce(v_enabled,false),'revision',v_revision,
    'restorations',private.v2_legacy_attack_gem_plan_v2(v_account,v_state));
end;
$$;

-- Every claim is one DB transaction: same advisory lock as the authoritative
-- online-game commit, then FOR UPDATE on the account's canonical state row.
-- The optimistic revision forces the client to reload after a successful claim.
-- A stable request UUID makes retries idempotent even if the client times out.
create or replace function public.claim_legacy_attack_gem_restoration_v2(
  p_legacy_id text,p_quantity integer,p_request_id uuid,p_expected_revision bigint
) returns jsonb language plpgsql volatile security definer
set search_path=pg_catalog,private,public as $$
declare
  v_account uuid:=auth.uid();
  v_enabled boolean;
  v_state jsonb;
  v_revision bigint;
  v_existing private.legacy_attack_gem_restoration_receipts_v2%rowtype;
  v_original integer;
  v_restored integer;
  v_multiplier integer;
  v_input text;
  v_output text;
  v_after jsonb;
  v_response jsonb;
  v_now_ms bigint;
begin
  if v_account is null then raise exception 'authentication_required'; end if;
  if p_request_id is null or p_expected_revision is null or
     p_quantity is null or p_quantity<1 or p_quantity>1000 then
    raise exception 'v2_restoration_invalid_request';
  end if;
  if p_legacy_id='EMBER_SHARD' then
    v_input:='gem:stat_might:g1';v_output:='gem:stat_might:g3';v_multiplier:=3;
  elsif p_legacy_id='EMBERHEART_GEM' then
    v_input:='gem:stat_might:g3';v_output:='LEGACY_EMBERHEART_GEM_V2';v_multiplier:=4;
  else
    raise exception 'v2_restoration_unsupported_legacy_gem';
  end if;
  select enabled into v_enabled
    from private.legacy_attack_gem_restoration_settings_v2 where singleton=true;
  if v_enabled is distinct from true then
    raise exception 'v2_restoration_not_enabled';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('party-account:'||v_account::text,0));
  select state,revision into v_state,v_revision
    from public.online_game_states where account_id=v_account for update;
  if not found then raise exception 'game_not_loaded'; end if;

  select * into v_existing
    from private.legacy_attack_gem_restoration_receipts_v2
   where account_id=v_account and request_id=p_request_id;
  if found then
    if v_existing.legacy_id<>p_legacy_id or v_existing.quantity<>p_quantity then
      raise exception 'v2_restoration_idempotency_conflict';
    end if;
    return v_existing.response;
  end if;

  if v_revision<>p_expected_revision then raise exception 'stale_state'; end if;
  v_original:=private.v2_legacy_attack_gem_original_count_v2(v_account,p_legacy_id);
  if v_original<=0 then raise exception 'v2_restoration_not_eligible'; end if;
  select coalesce(sum(quantity),0)::integer into v_restored
    from private.legacy_attack_gem_restoration_receipts_v2
   where account_id=v_account and legacy_id=p_legacy_id;
  if p_quantity>v_original-v_restored then
    raise exception 'v2_restoration_exceeds_historical_balance';
  end if;
  if private.v2_legacy_attack_gem_quantity_v2(v_state,v_input,true)<p_quantity*v_multiplier then
    raise exception 'v2_restoration_insufficient_gems';
  end if;

  v_after:=private.v2_legacy_attack_gem_remove_v2(v_state,v_input,p_quantity*v_multiplier);
  v_now_ms:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
  v_after:=private.v2_legacy_attack_gem_grant_v2(v_after,v_output,p_quantity,v_now_ms);

  update public.online_game_states
     set state=v_after,revision=revision+1,updated_at=clock_timestamp()
   where account_id=v_account;
  v_response:=jsonb_build_object(
    'requestId',p_request_id,'legacyId',p_legacy_id,'restored',p_quantity,
    'consumed',jsonb_build_object('itemId',v_input,'quantity',p_quantity*v_multiplier),
    'granted',jsonb_build_object('itemId',v_output,'quantity',p_quantity),
    'revision',v_revision+1,'status','restored'
  );
  insert into private.legacy_attack_gem_restoration_receipts_v2(
    account_id,request_id,legacy_id,quantity,consumed_id,consumed_quantity,
    granted_id,granted_quantity,revision_before,revision_after,response
  ) values(
    v_account,p_request_id,p_legacy_id,p_quantity,v_input,p_quantity*v_multiplier,
    v_output,p_quantity,v_revision,v_revision+1,v_response
  );
  return v_response;
end;
$$;

-- SECURITY DEFINER wrappers authenticate via auth.uid() and cannot accept
-- an account ID from the caller. All helper functions stay private.
revoke all on function public.preview_legacy_attack_gem_restoration_v2() from public,anon,authenticated;
revoke all on function public.claim_legacy_attack_gem_restoration_v2(text,integer,uuid,bigint) from public,anon,authenticated;
grant execute on function public.preview_legacy_attack_gem_restoration_v2() to authenticated;
grant execute on function public.claim_legacy_attack_gem_restoration_v2(text,integer,uuid,bigint) to authenticated;
revoke all on function private.v2_legacy_attack_gem_spendable_v2(jsonb,text) from public,anon,authenticated;
revoke all on function private.v2_legacy_attack_gem_quantity_v2(jsonb,text,boolean) from public,anon,authenticated;
revoke all on function private.v2_legacy_attack_gem_original_count_v2(uuid,text) from public,anon,authenticated;
revoke all on function private.v2_legacy_attack_gem_remove_v2(jsonb,text,integer) from public,anon,authenticated;
revoke all on function private.v2_legacy_attack_gem_grant_v2(jsonb,text,integer,bigint) from public,anon,authenticated;
revoke all on function private.v2_legacy_attack_gem_plan_v2(uuid,jsonb) from public,anon,authenticated;

comment on function public.claim_legacy_attack_gem_restoration_v2(text,integer,uuid,bigint)
is '2.0-only opt-in historical ATK gem restoration; gated off until 2.0 release validation';
commit;
