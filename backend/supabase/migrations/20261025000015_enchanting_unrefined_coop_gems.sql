-- Enchanting refinement follow-up: co-op gem rewards now land as unrefined family gems.
-- This intentionally redefines the existing settlement trigger without changing pity, recipes or catalyst rates.
-- Entitlements remain the earning authority; clients cannot submit gem rolls, pity,
-- recipe unlocks, Live-clear counts, or Resonance Cache rewards.
begin;

create or replace function public.veldryn_hash_roll_v1(p_key text)
returns numeric language sql immutable strict as $$
 select abs(hashtextextended(p_key,0)%1000000)::numeric/1000000::numeric;
$$;

create or replace function public.veldryn_game_state_add_stackable_v1(
 p_state jsonb,p_item_id text,p_quantity integer,p_now_ms bigint
) returns jsonb language plpgsql immutable as $$
declare
 v_state jsonb:=p_state;
 v_stacks jsonb;
 v_capacity integer;
 v_expiry bigint;
begin
 if p_quantity<=0 then return v_state;end if;

 v_stacks:=coalesce(v_state#>'{inventory,stacks}','[]'::jsonb);
 v_capacity:=coalesce((v_state#>>'{inventory,capacity}')::integer,0);
 if exists(select 1 from jsonb_array_elements(v_stacks) as e(entry) where entry->>'itemId'=p_item_id) then
  select coalesce(jsonb_agg(case when entry->>'itemId'=p_item_id then jsonb_set(entry,'{quantity}',to_jsonb(coalesce((entry->>'quantity')::integer,0)+p_quantity),true) else entry end order by ord),'[]'::jsonb)
   into v_stacks from jsonb_array_elements(v_stacks) with ordinality as e(entry,ord);
  return jsonb_set(v_state,'{inventory,stacks}',v_stacks,true);
 elsif jsonb_array_length(v_stacks)<v_capacity then
  return jsonb_set(v_state,'{inventory,stacks}',v_stacks||jsonb_build_array(jsonb_build_object('itemId',p_item_id,'quantity',p_quantity)),true);
 end if;

 v_stacks:=coalesce(v_state#>'{bank,stacks}','[]'::jsonb);
 v_capacity:=coalesce((v_state#>>'{bank,capacity}')::integer,0);
 if exists(select 1 from jsonb_array_elements(v_stacks) as e(entry) where entry->>'itemId'=p_item_id) then
  select coalesce(jsonb_agg(case when entry->>'itemId'=p_item_id then jsonb_set(entry,'{quantity}',to_jsonb(coalesce((entry->>'quantity')::integer,0)+p_quantity),true) else entry end order by ord),'[]'::jsonb)
   into v_stacks from jsonb_array_elements(v_stacks) with ordinality as e(entry,ord);
  return jsonb_set(v_state,'{bank,stacks}',v_stacks,true);
 elsif jsonb_array_length(v_stacks)<v_capacity then
  return jsonb_set(v_state,'{bank,stacks}',v_stacks||jsonb_build_array(jsonb_build_object('itemId',p_item_id,'quantity',p_quantity)),true);
 end if;

 v_stacks:=coalesce(v_state#>'{overflow,stacks}','[]'::jsonb);
 if exists(select 1 from jsonb_array_elements(v_stacks) as e(entry) where entry->>'itemId'=p_item_id) then
  select coalesce(jsonb_agg(case when entry->>'itemId'=p_item_id then jsonb_set(entry,'{quantity}',to_jsonb(coalesce((entry->>'quantity')::integer,0)+p_quantity),true) else entry end order by ord),'[]'::jsonb)
   into v_stacks from jsonb_array_elements(v_stacks) with ordinality as e(entry,ord);
 else
  v_stacks:=v_stacks||jsonb_build_array(jsonb_build_object('itemId',p_item_id,'quantity',p_quantity));
 end if;
 v_expiry:=greatest(coalesce((v_state#>>'{overflow,expiresAtMs}')::bigint,0),p_now_ms+259200000);
 v_state:=jsonb_set(v_state,'{overflow,stacks}',v_stacks,true);
 return jsonb_set(v_state,'{overflow,expiresAtMs}',to_jsonb(v_expiry),true);
end $$;

create table if not exists public.gem_resonance_cache_live_clears_v1(
 account_id uuid not null references auth.users(id) on delete cascade,
 week_key date not null,
 run_id uuid not null references public.expedition_runs(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp(),
 primary key(account_id,week_key,run_id)
);
alter table public.gem_resonance_cache_live_clears_v1 enable row level security;
revoke all on public.gem_resonance_cache_live_clears_v1 from public,anon,authenticated;
grant all on public.gem_resonance_cache_live_clears_v1 to service_role;

-- A completed run may expose more than one reward stage over its lifetime. Gem/pity
-- settlement is run-scoped so claiming a second stage can never roll the boss twice.
create table if not exists public.gem_coop_run_settlements_v1(
 account_id uuid not null references auth.users(id) on delete cascade,
 run_id uuid not null references public.expedition_runs(id) on delete cascade,
 source_id text not null,
 entitlement_id uuid not null references public.coop_reward_entitlements(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp(),
 primary key(account_id,run_id)
);
alter table public.gem_coop_run_settlements_v1 enable row level security;
revoke all on public.gem_coop_run_settlements_v1 from public,anon,authenticated;
grant all on public.gem_coop_run_settlements_v1 to service_role;

create or replace function public.settle_coop_gem_reward_v1()
returns trigger language plpgsql security definer set search_path=public as $$
declare
 v_source text;
 v_mode text;
 v_phase text;
 v_state jsonb;
 v_families text[];
 v_effect_families text[];
 v_all_effects text[]:=array[
  'effect_momentum','effect_execution','effect_opening_strike','effect_predator','effect_critical_surge',
  'effect_ruin','effect_bulwark','effect_aegis','effect_last_stand','effect_retaliation',
  'effect_unyielding','effect_mercy','effect_benediction','effect_guardians_gift','effect_renewal',
  'effect_shared_resolve','effect_sustenance','effect_battle_rhythm','effect_flow','effect_opportunist'
 ];
 v_pity integer:=0;
 v_hit boolean:=false;
 v_index integer;
 v_family text;
 v_recipe_family text;
 v_recipe_id text;
 v_knowledge jsonb;
 v_now timestamptz:=clock_timestamp();
 v_now_ms bigint:=floor(extract(epoch from clock_timestamp())*1000);
 v_current_week date:=(date_trunc('week',clock_timestamp() at time zone 'UTC'))::date;
 v_week_text text;
 v_cache jsonb;
 v_live_clears integer;
 v_choices text[];
 v_dust integer;
 v_radiant integer:=0;
 v_inserted integer:=0;
 v_gem_inserted integer:=0;
 v_changed boolean:=false;
begin
 if old.claimed_at is not null or new.claimed_at is null or new.entitlement_kind<>'participant' then return new;end if;

 select r.expedition_id,r.coop_mode,r.phase into v_source,v_mode,v_phase
 from public.expedition_runs r where r.id=new.run_id;
 if not found or v_phase<>'completed' then return new;end if;

 -- Serialize with normal online gameplay commits before mutating authoritative state.
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||new.recipient_account_id::text,0));
 select g.state into v_state from public.online_game_states g where g.account_id=new.recipient_account_id for update;
 if not found or v_state is null then raise exception 'ONLINE_GAME_STATE_REQUIRED_FOR_GEM_SETTLEMENT';end if;

 case v_source
  when 'COP_004' then v_families:=array['effect_bulwark','effect_retaliation','effect_predator','stat_iron'];v_effect_families:=array['effect_bulwark','effect_retaliation','effect_predator'];
  when 'COP_005' then v_families:=array['effect_mercy','effect_ruin','effect_opportunist','stat_precision','stat_potent'];v_effect_families:=array['effect_mercy','effect_ruin','effect_opportunist'];
  when 'COP_006' then v_families:=array['effect_flow','effect_benediction','effect_critical_surge','stat_swift','stat_ward'];v_effect_families:=array['effect_flow','effect_benediction','effect_critical_surge'];
  when 'COP_007' then v_families:=array['effect_momentum','effect_predator','effect_sustenance','stat_keen'];v_effect_families:=array['effect_momentum','effect_predator','effect_sustenance'];
  when 'COP_008' then v_families:=array['effect_aegis','effect_guardians_gift','effect_unyielding','stat_vitality','stat_resolute'];v_effect_families:=array['effect_aegis','effect_guardians_gift','effect_unyielding'];
  when 'COP_009' then v_families:=array['effect_execution','effect_shared_resolve','effect_battle_rhythm','effect_renewal','stat_savage'];v_effect_families:=array['effect_execution','effect_shared_resolve','effect_battle_rhythm','effect_renewal'];
  else v_families:=null;v_effect_families:=null;
 end case;

 -- Authored co-op boss rates: 18% Grade III, source pity at 8, 8% recipe, 15% Regional Catalyst.
 if v_families is not null and new.reward_stage in ('clear','final') then
  insert into public.gem_coop_run_settlements_v1(account_id,run_id,source_id,entitlement_id)
  values(new.recipient_account_id,new.run_id,v_source,new.id) on conflict do nothing;
  get diagnostics v_gem_inserted=row_count;
 end if;
 if v_gem_inserted=1 then
  v_state:=jsonb_set(v_state,'{account,gemPityBySource}',coalesce(v_state#>'{account,gemPityBySource}','{}'::jsonb),true);
  v_pity:=coalesce((v_state#>>array['account','gemPityBySource',v_source])::integer,0);
  v_hit:=(v_pity+1>=8) or public.veldryn_hash_roll_v1(new.id::text||':gem-drop')<0.18;
  v_state:=jsonb_set(v_state,array['account','gemPityBySource',v_source],to_jsonb(case when v_hit then 0 else v_pity+1 end),true);
  v_changed:=true;

  if v_hit then
   v_index:=least(array_length(v_families,1),1+floor(public.veldryn_hash_roll_v1(new.id::text||':gem-family')*array_length(v_families,1))::integer);
   v_family:=v_families[v_index];
   v_state:=public.veldryn_game_state_add_stackable_v1(v_state,'raw_gem:'||v_family||':g3',1,v_now_ms);
  end if;

  if array_length(v_effect_families,1)>0 and public.veldryn_hash_roll_v1(new.id::text||':recipe')<0.08 then
   v_index:=least(array_length(v_effect_families,1),1+floor(public.veldryn_hash_roll_v1(new.id::text||':recipe-family')*array_length(v_effect_families,1))::integer);
   v_recipe_family:=v_effect_families[v_index];
   v_recipe_id:='recipe_gem_'||regexp_replace(v_recipe_family,'^effect_','');
   v_knowledge:=coalesce(v_state#>'{account,unlockedKnowledgeIds}','[]'::jsonb);
   if exists(select 1 from jsonb_array_elements_text(v_knowledge) as k(id) where id=v_recipe_id) then
    v_state:=public.veldryn_game_state_add_stackable_v1(v_state,'GEM_DUST',25,v_now_ms);
   else
    v_state:=jsonb_set(v_state,'{account,unlockedKnowledgeIds}',v_knowledge||jsonb_build_array(v_recipe_id),true);
   end if;
  end if;

  if public.veldryn_hash_roll_v1(new.id::text||':regional-catalyst')<0.15 then
   v_state:=public.veldryn_game_state_add_stackable_v1(v_state,'REGIONAL_CATALYST',1,v_now_ms);
  end if;
 end if;

 -- Weekly cache only counts a successful Live clear in its current UTC earning week.
 -- Claiming an old entitlement later cannot migrate that clear into a newer week.
 if v_mode='live' and new.reward_stage in ('clear','final') and new.period_week_key=v_current_week then
  insert into public.gem_resonance_cache_live_clears_v1(account_id,week_key,run_id)
  values(new.recipient_account_id,v_current_week,new.run_id) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=1 then
   v_week_text:=to_char(v_current_week,'YYYY-MM-DD');
   v_cache:=coalesce(v_state#>'{account,resonanceCache}','{}'::jsonb);
   if v_cache->>'weekKey' is distinct from v_week_text then
    v_cache:=jsonb_build_object('weekKey',v_week_text,'liveClears',0,'claimed',false);
   end if;
   v_live_clears:=least(3,coalesce((v_cache->>'liveClears')::integer,0)+1);
   v_cache:=v_cache||jsonb_build_object('weekKey',v_week_text,'liveClears',v_live_clears,'claimed',coalesce((v_cache->>'claimed')::boolean,false));

   if v_live_clears>=3 and (jsonb_typeof(v_cache->'effectChoices') is distinct from 'array' or jsonb_array_length(v_cache->'effectChoices')<3) then
    select array_agg(family order by public.veldryn_hash_roll_v1(new.id::text||':cache-choice:'||family))
      into v_choices from unnest(v_all_effects) as f(family);
    v_choices:=v_choices[1:3];
    v_dust:=25+floor(public.veldryn_hash_roll_v1(new.id::text||':cache-dust')*16)::integer;
    -- Frost Wyrm / level 70 is the first authored late-game threshold for the optional 5% Radiant roll.
    if coalesce((v_state#>>'{character,level}')::integer,0)>=70 and public.veldryn_hash_roll_v1(new.id::text||':cache-radiant')<0.05 then v_radiant:=1;end if;
    v_cache:=v_cache||jsonb_build_object('effectChoices',to_jsonb(v_choices),'dustReward',v_dust,'regionalCatalysts',1,'radiantCatalysts',v_radiant);
   end if;

   v_state:=jsonb_set(v_state,'{account,resonanceCache}',v_cache,true);
   v_changed:=true;
  end if;
 end if;

 if v_changed then
  update public.online_game_states set state=v_state,revision=revision+1,updated_at=v_now
  where account_id=new.recipient_account_id;
 end if;
 return new;
end $$;

drop trigger if exists settle_coop_gem_reward_v1 on public.coop_reward_entitlements;
create trigger settle_coop_gem_reward_v1
 after update of claimed_at on public.coop_reward_entitlements
 for each row execute function public.settle_coop_gem_reward_v1();

revoke all on function public.veldryn_hash_roll_v1(text) from public,anon,authenticated;
revoke all on function public.veldryn_game_state_add_stackable_v1(jsonb,text,integer,bigint) from public,anon,authenticated;
revoke all on function public.settle_coop_gem_reward_v1() from public,anon,authenticated;
grant execute on function public.veldryn_hash_roll_v1(text),public.veldryn_game_state_add_stackable_v1(jsonb,text,integer,bigint),public.settle_coop_gem_reward_v1() to service_role;

commit;
