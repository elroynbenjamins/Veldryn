-- VERIFIED ON STAGING ONLY (iqfmmpvwanvvmxcftfxw), 2026-11-24.
-- NON-EXECUTABLE DRAFT: do not move into migrations manually.
-- Create the official migration with: supabase migration new profile_cosmetic_grants_v1
-- then copy/review this SQL and run local/staging verification before production.

create table if not exists private.profile_cosmetic_grant_receipts_v1(
  account_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  sku text not null,
  source text not null,
  added_border_id text,
  added_effect_id text,
  revision_after bigint,
  created_at timestamptz not null default now(),
  primary key(account_id,idempotency_key),
  check (length(idempotency_key) between 8 and 160),
  check (source in ('verified_google_play','ops_comp')),
  check (sku in (
    'profile_cosmetic_gloamward_border_v1','profile_cosmetic_gloamward_effect_v1','profile_cosmetic_gloamward_bundle_v1',
    'profile_cosmetic_frostbound_border_v1','profile_cosmetic_frostbound_effect_v1','profile_cosmetic_frostbound_bundle_v1',
    'profile_cosmetic_amberglass_border_v1','profile_cosmetic_amberglass_effect_v1','profile_cosmetic_amberglass_bundle_v1',
    'profile_cosmetic_briarbound_border_v1','profile_cosmetic_briarbound_effect_v1','profile_cosmetic_briarbound_bundle_v1'
  ))
);
alter table private.profile_cosmetic_grant_receipts_v1 enable row level security;
revoke all on private.profile_cosmetic_grant_receipts_v1 from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert on private.profile_cosmetic_grant_receipts_v1 to service_role;

create or replace function public.profile_cosmetic_grant_server_v1(
  p_account_id uuid,
  p_sku text,
  p_idempotency_key text,
  p_source text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  g public.online_game_states;
  v_existing private.profile_cosmetic_grant_receipts_v1;
  v_border_id text;
  v_effect_id text;
  v_borders jsonb;
  v_effects jsonb;
  v_state jsonb;
  v_added_border text;
  v_added_effect text;
  v_revision bigint;
begin
  if p_account_id is null or nullif(trim(p_idempotency_key),'') is null
     or length(p_idempotency_key) not between 8 and 160 then
    raise exception 'INVALID_PROFILE_COSMETIC_RECEIPT';
  end if;
  if p_source not in ('verified_google_play','ops_comp') then
    raise exception 'INVALID_PROFILE_COSMETIC_SOURCE';
  end if;

  case p_sku
    when 'profile_cosmetic_gloamward_border_v1' then v_border_id:='cosmetic:gloamward:arcane-frame';
    when 'profile_cosmetic_gloamward_effect_v1' then v_effect_id:='effect_gloamward_wisps';
    when 'profile_cosmetic_gloamward_bundle_v1' then v_border_id:='cosmetic:gloamward:arcane-frame';v_effect_id:='effect_gloamward_wisps';
    when 'profile_cosmetic_frostbound_border_v1' then v_border_id:='cosmetic:frostbound:chime-frame';
    when 'profile_cosmetic_frostbound_effect_v1' then v_effect_id:='effect_frostbound_winter_veil';
    when 'profile_cosmetic_frostbound_bundle_v1' then v_border_id:='cosmetic:frostbound:chime-frame';v_effect_id:='effect_frostbound_winter_veil';
    when 'profile_cosmetic_amberglass_border_v1' then v_border_id:='cosmetic:amberglass:loop-frame';
    when 'profile_cosmetic_amberglass_effect_v1' then v_effect_id:='effect_amberglass_ember_motes';
    when 'profile_cosmetic_amberglass_bundle_v1' then v_border_id:='cosmetic:amberglass:loop-frame';v_effect_id:='effect_amberglass_ember_motes';
    when 'profile_cosmetic_briarbound_border_v1' then v_border_id:='cosmetic:briarbound:verdant-frame';
    when 'profile_cosmetic_briarbound_effect_v1' then v_effect_id:='effect_briarbound_verdant_whispers';
    when 'profile_cosmetic_briarbound_bundle_v1' then v_border_id:='cosmetic:briarbound:verdant-frame';v_effect_id:='effect_briarbound_verdant_whispers';
    else raise exception 'UNKNOWN_PROFILE_COSMETIC_SKU';
  end case;

  if v_border_id in (
    'frame_gloamward',
    'dungeon:frostmarch:frostbound-chime',
    'dungeon:sunscar:amberglass-loop',
    'dungeon:asterfall:briarbound-frame'
  ) then
    raise exception 'EXCLUSIVE_REWARD_COMMERCE_GRANT_FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('profile-cosmetic-account:'||p_account_id::text,0));

  select * into v_existing
  from private.profile_cosmetic_grant_receipts_v1
  where account_id=p_account_id and idempotency_key=p_idempotency_key;

  if found then
    if v_existing.sku<>p_sku or v_existing.source<>p_source then
      raise exception 'PROFILE_COSMETIC_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object(
      'applied',false,'replayed',true,'sku',v_existing.sku,
      'addedBorderId',v_existing.added_border_id,'addedEffectId',v_existing.added_effect_id,
      'revision',v_existing.revision_after
    );
  end if;

  select * into g
  from public.online_game_states
  where account_id=p_account_id
  for update;
  if not found or g.state is null then raise exception 'game_not_loaded'; end if;
  if jsonb_typeof(g.state#>'{account}')<>'object' then raise exception 'invalid_server_state'; end if;

  v_state:=g.state;
  v_borders:=coalesce(v_state#>'{account,unlockedProfileBorderIds}','[]'::jsonb);
  v_effects:=coalesce(v_state#>'{account,unlockedProfileEffectIds}','[]'::jsonb);
  if jsonb_typeof(v_borders)<>'array' or jsonb_typeof(v_effects)<>'array' then
    raise exception 'invalid_profile_cosmetic_ownership_state';
  end if;

  if v_border_id is not null and not (v_borders @> jsonb_build_array(v_border_id)) then
    v_borders:=v_borders||jsonb_build_array(v_border_id);v_added_border:=v_border_id;
  end if;
  if v_effect_id is not null and not (v_effects @> jsonb_build_array(v_effect_id)) then
    v_effects:=v_effects||jsonb_build_array(v_effect_id);v_added_effect:=v_effect_id;
  end if;

  if v_added_border is not null or v_added_effect is not null then
    v_state:=jsonb_set(v_state,'{account,unlockedProfileBorderIds}',v_borders,true);
    v_state:=jsonb_set(v_state,'{account,unlockedProfileEffectIds}',v_effects,true);
    update public.online_game_states
    set state=v_state,revision=revision+1,updated_at=now()
    where account_id=p_account_id
    returning revision into v_revision;
  else
    v_revision:=g.revision;
  end if;

  insert into private.profile_cosmetic_grant_receipts_v1(
    account_id,idempotency_key,sku,source,added_border_id,added_effect_id,revision_after
  ) values (
    p_account_id,p_idempotency_key,p_sku,p_source,v_added_border,v_added_effect,v_revision
  );

  return jsonb_build_object(
    'applied',(v_added_border is not null or v_added_effect is not null),
    'replayed',false,'sku',p_sku,
    'addedBorderId',v_added_border,'addedEffectId',v_added_effect,'revision',v_revision
  );
end
$function$;

revoke all on function public.profile_cosmetic_grant_server_v1(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.profile_cosmetic_grant_server_v1(uuid,text,text,text) to service_role;

comment on table private.profile_cosmetic_grant_receipts_v1 is
  'Service-only idempotency ledger for account-wide profile cosmetic commerce/ops grants.';
comment on function public.profile_cosmetic_grant_server_v1(uuid,text,text,text) is
  'Service-role-only exact SKU grant. Atomically updates account cosmetic arrays and never grants exclusive fallback reward IDs.';
