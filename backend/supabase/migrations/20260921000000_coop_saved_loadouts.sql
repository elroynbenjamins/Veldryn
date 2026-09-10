-- Versioned authoritative co-op loadouts. Client-owned character JSON is never
-- consumed directly at queue/run commitment boundaries.
create unique index if not exists characters_id_account_unique on public.characters(id,account_id);
create table if not exists public.coop_saved_loadouts (
  account_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  loadout_id text not null check (char_length(loadout_id) between 1 and 128),
  revision bigint not null check (revision >= 1),
  display_name text not null check (char_length(display_name) between 1 and 80),
  content_version text not null,
  appearance_id text,
  class_id text not null,
  character_level integer not null check (character_level between 1 and 100),
  dungeon_unlocked boolean not null default false,
  legal_equipment boolean not null default false,
  stat_snapshot jsonb not null,
  ability_snapshot jsonb not null default '[]'::jsonb,
  capability_tags text[] not null default '{}',
  readiness_json jsonb not null default '{}',
  snapshot_hash text not null,
  verified_at timestamptz not null default clock_timestamp(),
  active boolean not null default true,
  primary key (account_id, character_id, loadout_id),
  unique (account_id, snapshot_hash),
  foreign key (character_id, account_id) references public.characters(id, account_id) on delete cascade
);
create index if not exists coop_saved_loadouts_character_idx on public.coop_saved_loadouts(character_id,active);
alter table public.coop_saved_loadouts enable row level security;
revoke all on public.coop_saved_loadouts from public,anon,authenticated;
grant select on public.coop_saved_loadouts to authenticated;
create policy coop_saved_loadouts_read_own on public.coop_saved_loadouts for select using(account_id=auth.uid());

create or replace function public.load_coop_saved_loadout_server_v1(
  p_account_id uuid,p_character_id uuid,p_loadout_id text
) returns jsonb language sql stable security definer set search_path=public as $$
  select to_jsonb(l) from public.coop_saved_loadouts l
  where l.account_id=p_account_id and l.character_id=p_character_id
    and l.loadout_id=p_loadout_id and l.active;
$$;
revoke all on function public.load_coop_saved_loadout_server_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.load_coop_saved_loadout_server_v1(uuid,uuid,text) to service_role;
