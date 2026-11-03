-- Database-authoritative travel gate shared by current and legacy mobile clients.
-- A character must beat the Fallen Knight before entering Sunscar or later regions.
-- Only new region transitions are checked, so an existing legacy save is not trapped.
create or replace function public.guard_chapter_one_region_travel_v1()
returns trigger
language plpgsql
set search_path = ''
as $fn$
declare
  v_destination text := new.state->>'currentRegionId';
  v_prior text;
  v_defeated jsonb := coalesce(new.state->'defeatedBossIds','[]'::jsonb);
begin
  if v_destination is null or v_destination not in ('SUNSCAR','FROSTMARCH','ASHLANDS') then
    return new;
  end if;
  if tg_op='UPDATE' then
    v_prior:=old.state->>'currentRegionId';
    if v_prior is not distinct from v_destination then
      return new;
    end if;
  end if;
  if jsonb_typeof(v_defeated)<>'array' or not (v_defeated ? 'FALLEN_KNIGHT') then
    raise exception 'Defeat the Fallen Knight before travelling to %',v_destination using errcode='P0001';
  end if;
  return new;
end;
$fn$;

-- Idempotent against staging which already received the matching named guard
-- with its own remote migration version.
do $create_trigger$
begin
 if not exists(
    select 1 from pg_catalog.pg_trigger t
    where t.tgrelid='public.online_game_states'::regclass
      and t.tgname='online_game_states_chapter_one_travel_gate_v1'
 ) then
   create trigger online_game_states_chapter_one_travel_gate_v1
   before insert or update of state
   on public.online_game_states
   for each row
   execute function public.guard_chapter_one_region_travel_v1();
 end if;
end;
$create_trigger$;

revoke all on function public.guard_chapter_one_region_travel_v1() from public, anon, authenticated;
