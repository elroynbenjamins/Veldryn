-- Transactional regression for the chapter-one travel trigger.
-- All test rows live in a temporary table; no player data is changed.
begin;
create temporary table roster_region_guard_probe (
  character_id uuid,
  state jsonb not null
) on commit drop;
create trigger roster_region_guard_probe_trigger
before insert or update of state on roster_region_guard_probe
for each row execute function public.guard_chapter_one_region_travel_v1();

do $test$
declare
  first_id uuid := '00000000-0000-4000-8000-000000000001';
  second_id uuid := '00000000-0000-4000-8000-000000000002';
  unknown_id uuid := '00000000-0000-4000-8000-000000000003';
  blocked boolean;
begin
  -- A new character in the starting region needs no boss clear.
  insert into roster_region_guard_probe(character_id, state) values (
    first_id,
    jsonb_build_object(
      'character', jsonb_build_object('id', first_id::text),
      'currentRegionId', 'GREENFIELDS',
      'defeatedBossIds', '[]'::jsonb,
      'otherCharacters', jsonb_build_array(jsonb_build_object(
        'character', jsonb_build_object('id', second_id::text),
        'currentRegionId', 'SUNSCAR'))
    )
  );

  -- Restoring an already parked Sunscar character is a roster switch,
  -- not travel; the account has not beaten the boss.
  update roster_region_guard_probe
     set character_id = second_id,
         state = jsonb_build_object(
           'character', jsonb_build_object('id', second_id::text),
           'currentRegionId', 'SUNSCAR',
           'defeatedBossIds', '[]'::jsonb,
           'otherCharacters', jsonb_build_array(jsonb_build_object(
             'character', jsonb_build_object('id', first_id::text),
             'currentRegionId', 'GREENFIELDS'))
         );
  if not exists (select 1 from roster_region_guard_probe
                 where character_id = second_id and state->>'currentRegionId' = 'SUNSCAR') then
    raise exception 'Saved roster switch was not allowed';
  end if;

  -- True travel from Sunscar to Frostmarch is still blocked.
  blocked := false;
  begin
    update roster_region_guard_probe
       set state = jsonb_set(state, '{currentRegionId}', '"FROSTMARCH"'::jsonb);
  exception when sqlstate 'P0001' then blocked := true;
  end;
  if not blocked then raise exception 'Fallen Knight gate bypassed on travel'; end if;

  -- Spoofing a new character ID and location cannot impersonate a switch.
  blocked := false;
  begin
    update roster_region_guard_probe
       set character_id = unknown_id,
           state = jsonb_build_object(
             'character', jsonb_build_object('id', unknown_id::text),
             'currentRegionId', 'FROSTMARCH',
             'defeatedBossIds', '[]'::jsonb,
             'otherCharacters', jsonb_build_array(jsonb_build_object(
               'character', jsonb_build_object('id', second_id::text),
               'currentRegionId', 'SUNSCAR'))
           );
  exception when sqlstate 'P0001' then blocked := true;
  end;
  if not blocked then raise exception 'Unowned identity bypassed travel gate'; end if;

  -- Actual travel after defeating the story boss remains permitted.
  update roster_region_guard_probe
     set state = jsonb_set(
       jsonb_set(state, '{currentRegionId}', '"FROSTMARCH"'::jsonb),
       '{defeatedBossIds}', '["FALLEN_KNIGHT"]'::jsonb);
  if not exists (select 1 from roster_region_guard_probe
                 where character_id = second_id
                   and state->>'currentRegionId' = 'FROSTMARCH') then
    raise exception 'Legitimate travel after boss clear was blocked';
  end if;
end;
$test$;

select 'roster_region_guard_passed' as result;
rollback;
