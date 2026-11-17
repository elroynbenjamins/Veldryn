-- Realm deeds: compact, private, server-settled daily totals.
-- The reporting day is Europe/Amsterdam and offline rewards count on settlement day.
-- Nothing here is client writable or exposed through the public Data API.
create table if not exists private.realm_deeds_daily_v1 (
  activity_date date primary key,
  monsters_defeated bigint not null default 0 check (monsters_defeated >= 0),
  ore_mined bigint not null default 0 check (ore_mined >= 0),
  wood_cut bigint not null default 0 check (wood_cut >= 0),
  fish_caught bigint not null default 0 check (fish_caught >= 0),
  contributing_receipts bigint not null default 0 check (contributing_receipts >= 0),
  updated_at timestamptz not null default clock_timestamp()
);
alter table private.realm_deeds_daily_v1 enable row level security;
revoke all on table private.realm_deeds_daily_v1 from public, anon, authenticated;
comment on table private.realm_deeds_daily_v1 is
  'Aggregate realm deeds by Europe/Amsterdam settlement date. No account identifiers. Mining/wood/fishing count primary resource items; combat counts verified kills plus defeated enemies in successful coop combat and regional victories.';

create or replace function private.realm_deeds_extract_online_v1(p_action text, p_response jsonb)
returns table (monsters bigint, ore bigint, wood bigint, fish bigint)
language plpgsql immutable set search_path = '' as $$
declare
  v_result jsonb := p_response->'result';
  v_entry jsonb;
  v_reward jsonb;
  v_kind text;
  v_item jsonb;
  v_id text;
  v_raw text;
  v_n bigint;
begin
  monsters := 0; ore := 0; wood := 0; fish := 0;
  if p_action = 'claim_gathering' then
    v_id := p_response->>'item_id';
    v_raw := p_response->>'items';
    if v_raw ~ '^[0-9]{1,15}$' then
      v_n := least(v_raw::bigint, 1000000000000);
      if v_id ~ '_ORE$' then ore := ore + v_n;
      elsif v_id ~ '_LOG$' then wood := wood + v_n;
      elsif v_id in ('SILVERFIN','MEADOW_PERCH','RIVER_EEL','ROOTSTREAM_TROUT','OATHSCALE_PIKE') then fish := fish + v_n;
      end if;
    end if;
    return next;
    return;
  end if;
  if p_action <> 'online_game_v1' or jsonb_typeof(v_result) <> 'object' then
    return next;
    return;
  end if;
  for v_entry in
    select value from jsonb_array_elements(
      case when jsonb_typeof(v_result->'reward'->'activityResults')='array'
             and jsonb_array_length(v_result->'reward'->'activityResults')>0
        then v_result->'reward'->'activityResults'
        else jsonb_build_array(jsonb_build_object('activity',v_result->'activity','reward',v_result->'reward'))
      end
    )
  loop
    v_kind := coalesce(v_entry->'activity'->>'kind',v_result->'state'->'activity'->>'kind');
    v_reward := v_entry->'reward';
    if v_kind = 'combat' then
      v_raw := v_reward->>'kills';
      if v_raw ~ '^[0-9]{1,15}$' then
        monsters := monsters + least(v_raw::bigint, 1000000000000);
      end if;
    elsif v_kind in ('mining','woodcutting','fishing') then
      for v_item in select value from jsonb_array_elements(
        case when jsonb_typeof(v_reward->'items')='array' then v_reward->'items' else '[]'::jsonb end
      )
      loop
        v_id := v_item->>'itemId';
        v_raw := v_item->>'quantity';
        if v_raw is null or v_raw !~ '^[0-9]{1,15}
        v_n := least(v_raw::bigint, 1000000000000);
        if v_kind='mining' and v_id ~ '_ORE$' then ore := ore + v_n;
        elsif v_kind='woodcutting' and v_id ~ '_LOG$' then wood := wood + v_n;
        elsif v_kind='fishing' and v_id !~ '(ESSENCE|GEM|DUST|TOKEN|CURRENCY|COSMETIC)' then fish := fish + v_n;
        end if;
      end loop;
    end if;
  end loop;
  if v_result->>'won'='true' and v_result ? 'storyBossBattle' then
    monsters := monsters + 1;
  end if;
  return next;
end $$;

create or replace function private.realm_deeds_increment_v1(
  p_day date, p_monsters bigint, p_ore bigint, p_wood bigint, p_fish bigint
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_day is null or (p_monsters=0 and p_ore=0 and p_wood=0 and p_fish=0) then return; end if;
  insert into private.realm_deeds_daily_v1
    (activity_date,monsters_defeated,ore_mined,wood_cut,fish_caught,contributing_receipts)
  values (p_day,p_monsters,p_ore,p_wood,p_fish,1)
  on conflict (activity_date) do update set
    monsters_defeated=private.realm_deeds_daily_v1.monsters_defeated+excluded.monsters_defeated,
    ore_mined=private.realm_deeds_daily_v1.ore_mined+excluded.ore_mined,
    wood_cut=private.realm_deeds_daily_v1.wood_cut+excluded.wood_cut,
    fish_caught=private.realm_deeds_daily_v1.fish_caught+excluded.fish_caught,
    contributing_receipts=private.realm_deeds_daily_v1.contributing_receipts+1,
    updated_at=clock_timestamp();
end $$;

create or replace function private.realm_deeds_online_receipt_trigger_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  if new.action not in ('online_game_v1','claim_gathering') then return new; end if;
  select * into v from private.realm_deeds_extract_online_v1(new.action,new.response);
  perform private.realm_deeds_increment_v1(
    (new.created_at at time zone 'Europe/Amsterdam')::date,
    v.monsters,v.ore,v.wood,v.fish
  );
  return new;
exception when others then
  raise warning 'realm_deeds_online_receipt_trigger_v1: %', sqlerrm;
  return new;
end $$;

create or replace function private.realm_deeds_coop_combat_trigger_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_enemies bigint := 0;
begin
  if new.success is not true or new.result_json->>'kind' <> 'combat' then return new; end if;
  select count(*) into v_enemies from jsonb_array_elements(
    case when jsonb_typeof(new.result_json->'replayCombatants')='array'
      then new.result_json->'replayCombatants' else '[]'::jsonb end
  ) as combatant where combatant->>'team'='enemies';
  perform private.realm_deeds_increment_v1(
    (new.committed_at at time zone 'Europe/Amsterdam')::date,
    v_enemies,0,0,0
  );
  return new;
exception when others then
  raise warning 'realm_deeds_coop_combat_trigger_v1: %', sqlerrm;
  return new;
end $$;

create or replace function private.realm_deeds_regional_combat_trigger_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.result is null and new.result is not null
     and new.result->>'victory' = 'true' then
    perform private.realm_deeds_increment_v1(
      (new.completed_at at time zone 'Europe/Amsterdam')::date,1,0,0,0
    );
  end if;
  return new;
exception when others then
  raise warning 'realm_deeds_regional_combat_trigger_v1: %', sqlerrm;
  return new;
end $$;

revoke all on function private.realm_deeds_extract_online_v1(text,jsonb),
  private.realm_deeds_increment_v1(date,bigint,bigint,bigint,bigint),
  private.realm_deeds_online_receipt_trigger_v1(),
  private.realm_deeds_coop_combat_trigger_v1(),
  private.realm_deeds_regional_combat_trigger_v1()
from public, anon, authenticated;

-- Hold writes briefly while backfilling so no receipt can land between
-- the historical snapshot and activation of the INSERT/UPDATE triggers.
lock table public.server_action_receipts, public.coop_node_results,
  public.regional_combat_receipts_v1 in share row exclusive mode;

with events as (
  select (r.created_at at time zone 'Europe/Amsterdam')::date activity_date,
    d.monsters, d.ore, d.wood, d.fish
  from public.server_action_receipts r
  cross join lateral private.realm_deeds_extract_online_v1(r.action,r.response) d
  where r.action in ('online_game_v1','claim_gathering')
  union all
  select (r.committed_at at time zone 'Europe/Amsterdam')::date,
    (select count(*) from jsonb_array_elements(
      case when jsonb_typeof(r.result_json->'replayCombatants')='array'
        then r.result_json->'replayCombatants' else '[]'::jsonb end
    ) c where c->>'team'='enemies')::bigint,0::bigint,0::bigint,0::bigint
  from public.coop_node_results r
  where r.success=true and r.result_json->>'kind'='combat'
  union all
  select (r.completed_at at time zone 'Europe/Amsterdam')::date,
    1::bigint,0::bigint,0::bigint,0::bigint
  from public.regional_combat_receipts_v1 r
  where r.result->>'victory'='true' and r.completed_at is not null
), filtered as (
  select * from events where monsters>0 or ore>0 or wood>0 or fish>0
)
insert into private.realm_deeds_daily_v1
  (activity_date,monsters_defeated,ore_mined,wood_cut,fish_caught,contributing_receipts)
select activity_date,sum(monsters),sum(ore),sum(wood),sum(fish),count(*)
from filtered where activity_date is not null group by activity_date
on conflict (activity_date) do update set
  monsters_defeated=excluded.monsters_defeated,
  ore_mined=excluded.ore_mined,
  wood_cut=excluded.wood_cut,
  fish_caught=excluded.fish_caught,
  contributing_receipts=excluded.contributing_receipts,
  updated_at=clock_timestamp();

create trigger realm_deeds_online_receipt_insert_v1
  after insert on public.server_action_receipts for each row
  execute function private.realm_deeds_online_receipt_trigger_v1();
create trigger realm_deeds_coop_combat_insert_v1
  after insert on public.coop_node_results for each row
  execute function private.realm_deeds_coop_combat_trigger_v1();
create trigger realm_deeds_regional_combat_commit_v1
  after update of result on public.regional_combat_receipts_v1 for each row
  execute function private.realm_deeds_regional_combat_trigger_v1();
