-- Release the 17 approved Guild Construction upgrades.
-- Run only after the Guild Bank active-requirements trigger is installed.
-- No player inventory, wallet, progression or cosmetic entitlements are changed.
do $$
declare v_templates integer; v_requirements integer;
begin
  select count(*) into v_templates
  from public.guild_construction_templates
  where template_id in (
    'construction_hall_1','construction_hall_2','construction_hall_3','construction_hall_4',
    'construction_forge_1','construction_forge_2','construction_forge_3',
    'construction_library_1','construction_library_2','construction_library_3',
    'construction_treasury_1','construction_treasury_2',
    'construction_war_room_1','construction_war_room_2','construction_war_room_3',
    'construction_expedition_1','construction_expedition_2'
  );
  if v_templates <> 17 then
    raise exception 'guild_construction_release_templates_missing';
  end if;

  select count(*) into v_requirements
  from public.guild_construction_templates t
  where t.template_id like 'construction_%'
    and exists(select 1 from public.guild_construction_requirements r
      where r.template_id=t.template_id and r.required_amount > 0);
  if v_requirements <> 17 then
    raise exception 'guild_construction_release_requirements_missing';
  end if;

  if not exists(select 1 from pg_trigger where tgname='guild_bank_required_resources_guard'
    and tgrelid='public.guild_bank_deposits'::regclass and not tgisinternal) then
    raise exception 'guild_construction_release_bank_guard_missing';
  end if;
end $$;

update public.guild_construction_templates
set enabled=true
where template_id in (
 'construction_hall_1','construction_hall_2','construction_hall_3','construction_hall_4',
 'construction_forge_1','construction_forge_2','construction_forge_3',
 'construction_library_1','construction_library_2','construction_library_3',
 'construction_treasury_1','construction_treasury_2',
 'construction_war_room_1','construction_war_room_2','construction_war_room_3',
 'construction_expedition_1','construction_expedition_2'
);
