-- Roster selection restores the saved location of an existing character;
-- it is not a new region transition. Keep the Fallen Knight travel gate
-- for actual travel, new accounts and unverified roster changes.
create or replace function public.guard_chapter_one_region_travel_v1()
returns trigger
language plpgsql
set search_path = ''
as $fn$
declare
  v_destination text := new.state->>'currentRegionId';
  v_prior text;
  v_defeated jsonb := coalesce(new.state->'defeatedBossIds', '[]'::jsonb);
begin
  if v_destination is null
     or v_destination not in ('SUNSCAR', 'FROSTMARCH', 'ASHLANDS') then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_prior := old.state->>'currentRegionId';
    if v_prior is not distinct from v_destination then
      return new;
    end if;

    -- The existing character must already have been saved in the destination,
    -- and the outgoing character must be saved at its previous location.
    -- Both identities must match the authoritative relational projection.
    -- Changing a character ID plus a region alone must never bypass the gate.
    if new.character_id is distinct from old.character_id
       and new.character_id is not null
       and old.character_id is not null
       and new.state #>> '{character,id}' = new.character_id::text
       and old.state #>> '{character,id}' = old.character_id::text
       and coalesce(old.state->'otherCharacters', '[]'::jsonb) @>
         jsonb_build_array(jsonb_build_object(
           'character', jsonb_build_object('id', new.character_id::text),
           'currentRegionId', v_destination))
       and coalesce(new.state->'otherCharacters', '[]'::jsonb) @>
         jsonb_build_array(jsonb_build_object(
           'character', jsonb_build_object('id', old.character_id::text),
           'currentRegionId', v_prior)) then
      return new;
    end if;
  end if;

  if jsonb_typeof(v_defeated) <> 'array'
     or not (v_defeated ? 'FALLEN_KNIGHT') then
    raise exception 'Defeat the Fallen Knight before travelling to %', v_destination
      using errcode = 'P0001';
  end if;
  return new;
end;
$fn$;

revoke all on function public.guard_chapter_one_region_travel_v1()
  from public, anon, authenticated;
