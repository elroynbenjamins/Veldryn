-- VELDRYN v25 Equipment 2.0 canonical resource bindings.
-- IMPORTANT: Resource IDs already exist in design/content. Do not duplicate them.
create table if not exists equipment_resource_bindings (
  canonical_key text primary key,
  region text not null check (region in ('Asterfall','Sunscar','Frostmarch')),
  resource_id text null,
  regional_resource_id text null,
  item_id text null,
  min_level integer not null check (min_level >= 1),
  source_label text not null,
  updated_at timestamptz not null default now(),
  check (resource_id is not null or regional_resource_id is not null or item_id is not null)
);
alter table equipment_resource_bindings enable row level security;
-- No direct player writes. Game-server/service role owns mutation.
-- Player recipe endpoints should return resolved display data, not permit binding edits.
create unique index if not exists equipment_resource_bindings_item_uq on equipment_resource_bindings(item_id) where item_id is not null;
