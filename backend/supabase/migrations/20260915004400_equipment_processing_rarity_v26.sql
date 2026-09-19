begin;
alter table public.equipment_v24_item_instances add column if not exists crafted_rarity text not null default 'Rare' check(crafted_rarity in('Common','Uncommon','Rare','Epic','Mythic'));
create table if not exists public.equipment_v26_processing_definitions(
 canonical_resource_key text primary key, processed_key text not null unique, processed_name text not null,
 profession text not null, skill_id text not null, unlock_level int not null check(unlock_level between 1 and 100),
 raw_quantity int not null check(raw_quantity>0), output_quantity int not null check(output_quantity>0), base_seconds int not null check(base_seconds>0),
 definition_json jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.equipment_v26_recipe_unlocks(
 character_id uuid not null, piece_id text not null, unlock_kind text not null, source_receipt_key text not null,
 unlocked_at timestamptz not null default now(), primary key(character_id,piece_id), unique(character_id,source_receipt_key)
);
create table if not exists public.equipment_v26_artisan_insight(
 character_id uuid not null, tier text not null check(tier in('T1','T2','T3','T4','T5','T6','T7','T8','T9')),
 profession_skill_id text not null, insight int not null default 0 check(insight between 0 and 15), updated_at timestamptz not null default now(),
 primary key(character_id,tier,profession_skill_id)
);
create table if not exists public.equipment_v26_chase_recipe_progress(
 character_id uuid not null, chase_recipe_id text not null, fragments int not null default 0 check(fragments>=0), unlocked boolean not null default false,
 updated_at timestamptz not null default now(), primary key(character_id,chase_recipe_id)
);
do $$
declare v_table_name text;
begin
 for v_table_name in select unnest(array['equipment_v26_processing_definitions','equipment_v26_recipe_unlocks','equipment_v26_artisan_insight','equipment_v26_chase_recipe_progress']) loop
  execute format('alter table public.%I enable row level security',v_table_name);
  execute format('revoke all on public.%I from anon,authenticated',v_table_name);
 end loop;
end $$;
-- Trusted server rolls rarity at craft settlement. Client cannot submit rarity, insight, recipe-unlock state or chase fragments.
commit;
