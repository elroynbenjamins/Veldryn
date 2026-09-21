-- Server-only settlement for non-co-op regional gem sources.
-- Regional combat services submit only an already-verified encounter receipt and
-- canonical source ID. Rolls, pity, recipe discovery and inventory placement are
-- resolved here and cannot be authored by clients.
begin;

create table if not exists public.gem_regional_settlements_v1(
  account_id uuid not null references auth.users(id) on delete cascade,
  receipt_key text not null,
  source_id text not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key(account_id,receipt_key),
  check(length(receipt_key) between 8 and 160),
  check(source_id in ('ZONE_006','ZONE_007','ZONE_008','ZONE_009','ZONE_010'))
);
alter table public.gem_regional_settlements_v1 enable row level security;
revoke all on public.gem_regional_settlements_v1 from public,anon,authenticated;
grant all on public.gem_regional_settlements_v1 to service_role;

create or replace function public.settle_regional_gem_source_server_v1(
  p_account_id uuid,
  p_source_id text,
  p_receipt_key text
) returns jsonb
language plpgsql security definer set search_path='' as $
declare
  v_state jsonb;
  v_existing jsonb;
  v_families text[];
  v_effect_families text[];
  v_chance numeric;
  v_pity_at integer;
  v_grade integer;
  v_recipe_chance numeric:=0;
  v_catalyst_chance numeric:=0;
  v_pity integer:=0;
  v_pity_triggered boolean:=false;
  v_hit boolean:=false;
  v_index integer;
  v_family text;
  v_item_id text;
  v_recipe_family text;
  v_recipe_id text;
  v_recipe_unlocked text;
  v_duplicate_dust integer:=0;
  v_regional_catalysts integer:=0;
  v_knowledge jsonb;
  v_result jsonb;
  v_now_ms bigint:=floor(extract(epoch from clock_timestamp())*1000);
begin
  if p_account_id is null then raise exception 'account_required';end if;
  if p_receipt_key is null or p_receipt_key !~ '^[a-zA-Z0-9:_-]{8,160}$' then
    raise exception 'invalid_regional_gem_receipt';
  end if;

  case p_source_id
    when 'ZONE_006' then
      v_families:=array['stat_might','stat_vitality','effect_opening_strike','effect_sustenance'];
      v_effect_families:=array['effect_opening_strike','effect_sustenance'];
      v_grade:=1;v_chance:=0.0075;v_pity_at:=null;
    when 'ZONE_007' then
      v_families:=array['stat_iron','stat_piercing','effect_predator','effect_retaliation'];
      v_effect_families:=array['effect_predator','effect_retaliation'];
      v_grade:=2;v_chance:=0.015;v_pity_at:=60;
    when 'ZONE_008' then
      v_families:=array['stat_precision','stat_potent','effect_ruin','effect_mercy','effect_opportunist'];
      v_effect_families:=array['effect_ruin','effect_mercy','effect_opportunist'];
      v_grade:=2;v_chance:=0.015;v_pity_at:=60;
    when 'ZONE_009' then
      v_families:=array['stat_swift','stat_ward','effect_flow','effect_benediction','effect_aegis'];
      v_effect_families:=array['effect_flow','effect_benediction','effect_aegis'];
      v_grade:=2;v_chance:=0.015;v_pity_at:=60;
    when 'ZONE_010' then
      v_families:=array['effect_execution','effect_last_stand','effect_unyielding'];
      v_effect_families:=array['effect_execution','effect_last_stand','effect_unyielding'];
      v_grade:=3;v_chance:=0.03;v_pity_at:=25;v_recipe_chance:=0.02;v_catalyst_chance:=0.05;
    else raise exception 'unknown_regional_gem_source';
  end case;

  -- If Sunscar has an active version, reject stale/non-active zone IDs. This does
  -- not block initial deployment before an active pointer has been installed.
  if exists(select 1 from public.region_content_active_v21 where region_id='REG_002')
     and not exists(
       select 1 from public.active_region_content_records_v21
       where region_id='REG_002' and record_type='zone' and record_id=p_source_id
     ) then
    raise exception 'regional_gem_source_not_active';
  end if;

  -- Serialize against normal gameplay commands and all other regional settlements.
  perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account_id::text,0));

  select result into v_existing
  from public.gem_regional_settlements_v1
  where account_id=p_account_id and receipt_key=p_receipt_key;
  if found then return v_existing||jsonb_build_object('duplicate',true);end if;

  select state into v_state
  from public.online_game_states
  where account_id=p_account_id
  for update;
  if not found or v_state is null then raise exception 'ONLINE_GAME_STATE_REQUIRED_FOR_GEM_SETTLEMENT';end if;

  if v_pity_at is not null then
    v_state:=jsonb_set(v_state,'{account,gemPityBySource}',coalesce(v_state#>'{account,gemPityBySource}','{}'::jsonb),true);
    v_pity:=greatest(0,coalesce((v_state#>>array['account','gemPityBySource',p_source_id])::integer,0));
    v_pity_triggered:=v_pity+1>=v_pity_at;
  end if;

  v_hit:=v_pity_triggered or public.veldryn_hash_roll_v1(p_receipt_key||':'||p_source_id||':gem-drop')<v_chance;
  if v_pity_at is not null then
    v_state:=jsonb_set(v_state,array['account','gemPityBySource',p_source_id],to_jsonb(case when v_hit then 0 else v_pity+1 end),true);
  end if;

  if v_hit then
    v_index:=least(array_length(v_families,1),1+floor(public.veldryn_hash_roll_v1(p_receipt_key||':'||p_source_id||':gem-family')*array_length(v_families,1))::integer);
    v_family:=v_families[v_index];
    v_item_id:='gem:'||v_family||':g'||v_grade::text;
    v_state:=public.veldryn_game_state_add_stackable_v1(v_state,v_item_id,1,v_now_ms);
  end if;

  if v_recipe_chance>0 and array_length(v_effect_families,1)>0
     and public.veldryn_hash_roll_v1(p_receipt_key||':'||p_source_id||':recipe')<v_recipe_chance then
    v_index:=least(array_length(v_effect_families,1),1+floor(public.veldryn_hash_roll_v1(p_receipt_key||':'||p_source_id||':recipe-family')*array_length(v_effect_families,1))::integer);
    v_recipe_family:=v_effect_families[v_index];
    v_recipe_id:='recipe_gem_'||regexp_replace(v_recipe_family,'^effect_','');
    v_knowledge:=coalesce(v_state#>'{account,unlockedKnowledgeIds}','[]'::jsonb);
    if exists(select 1 from jsonb_array_elements_text(v_knowledge) as k(id) where id=v_recipe_id) then
      v_duplicate_dust:=25;
      v_state:=public.veldryn_game_state_add_stackable_v1(v_state,'GEM_DUST',v_duplicate_dust,v_now_ms);
    else
      v_recipe_unlocked:=v_recipe_id;
      v_state:=jsonb_set(v_state,'{account,unlockedKnowledgeIds}',v_knowledge||jsonb_build_array(v_recipe_id),true);
    end if;
  end if;

  if v_catalyst_chance>0 and public.veldryn_hash_roll_v1(p_receipt_key||':'||p_source_id||':regional-catalyst')<v_catalyst_chance then
    v_regional_catalysts:=1;
    v_state:=public.veldryn_game_state_add_stackable_v1(v_state,'REGIONAL_CATALYST',1,v_now_ms);
  end if;

  update public.online_game_states
  set state=v_state,revision=revision+1,updated_at=clock_timestamp()
  where account_id=p_account_id;

  v_result:=jsonb_build_object(
    'eligible',true,
    'duplicate',false,
    'sourceId',p_source_id,
    'gemItemId',v_item_id,
    'pityTriggered',v_pity_triggered,
    'recipeUnlockedId',v_recipe_unlocked,
    'duplicateRecipeDust',v_duplicate_dust,
    'regionalCatalysts',v_regional_catalysts
  );
  insert into public.gem_regional_settlements_v1(account_id,receipt_key,source_id,result)
  values(p_account_id,p_receipt_key,p_source_id,v_result);
  return v_result;
end $$;

revoke all on function public.settle_regional_gem_source_server_v1(uuid,text,text) from public,anon,authenticated;
grant execute on function public.settle_regional_gem_source_server_v1(uuid,text,text) to service_role;

commit;
