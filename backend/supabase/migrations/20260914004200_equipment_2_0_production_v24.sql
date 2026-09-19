begin;
create table if not exists public.equipment_v24_item_instances(
 id uuid primary key,
 character_id uuid not null,
 piece_id text not null,
 upgrade_rank int not null default 0 check(upgrade_rank between 0 and 10),
 enchant_id text null,
 enchant_rank int null check(enchant_rank is null or enchant_rank between 1 and 5),
 stat_gem_id text null,
 stat_gem_rank int null check(stat_gem_rank is null or stat_gem_rank between 1 and 5),
 effect_gem_id text null,
 effect_gem_rank int null check(effect_gem_rank is null or effect_gem_rank between 1 and 5),
 acquire_source text not null check(acquire_source in('craft','legacy_conversion','admin_repair','quest_grant')),
 source_receipt_key text null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(character_id,source_receipt_key)
);
create index if not exists equipment_v24_items_character_idx on public.equipment_v24_item_instances(character_id,created_at desc);
create table if not exists public.equipment_v24_loadout_slots(
 character_id uuid not null,
 loadout_key text not null,
 slot text not null check(slot in('Helmet','Chest','Gloves','Legs','Boots','Weapon','Off-hand')),
 item_instance_id uuid not null references public.equipment_v24_item_instances(id) on delete restrict,
 updated_at timestamptz not null default now(),
 primary key(character_id,loadout_key,slot)
);
create table if not exists public.equipment_v24_legacy_conversion_claims(
 legacy_instance_id text primary key,
 character_id uuid not null,
 target_piece_id text not null,
 target_item_instance_id uuid not null references public.equipment_v24_item_instances(id) on delete restrict,
 path text not null check(path in('Foundation','Specialist','Alternate')),
 snapshot jsonb not null,
 created_at timestamptz not null default now()
);
create table if not exists public.equipment_v24_mutation_receipts(
 id uuid primary key,
 character_id uuid not null,
 item_instance_id uuid not null references public.equipment_v24_item_instances(id) on delete restrict,
 mutation_type text not null check(mutation_type in('craft_settle','upgrade','enchant','socket_stat_gem','socket_effect_gem','remove_gem','legacy_conversion','admin_repair')),
 idempotency_key text not null,
 before_snapshot jsonb null,
 after_snapshot jsonb not null,
 created_at timestamptz not null default now(),
 unique(character_id,idempotency_key)
);
do $$
declare v_table_name text;
begin
 for v_table_name in select unnest(array['equipment_v24_item_instances','equipment_v24_loadout_slots','equipment_v24_legacy_conversion_claims','equipment_v24_mutation_receipts']) loop
  execute format('alter table public.%I enable row level security',v_table_name);
  execute format('revoke all on public.%I from anon,authenticated',v_table_name);
 end loop;
end $$;
-- All writes and derived-stat calculations are trusted-server only. The client never submits base stats, recipe quantities, timers, upgrade multipliers or migration targets outside registered choices.
commit;
