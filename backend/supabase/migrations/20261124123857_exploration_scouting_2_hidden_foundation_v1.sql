
create or replace function public.scouting_skill_level_from_xp_v1(p_xp bigint)
returns integer
language plpgsql
immutable
security invoker
set search_path=pg_catalog
as $$
declare
  v_level integer:=1;
  v_spent bigint:=0;
  v_need bigint;
begin
  if p_xp is null or p_xp<0 then raise exception 'INVALID_EXPLORATION_XP';end if;
  while v_level<100 loop
    v_need:=floor(floor(90*power(v_level::double precision,1.42)+v_level*35)*1.6)::bigint;
    if v_spent+v_need>p_xp then return v_level;end if;
    v_spent:=v_spent+v_need;
    v_level:=v_level+1;
  end loop;
  return 100;
end $$;

create table public.scouting_runtime_config_v1(
 singleton boolean primary key default true check(singleton),
 released boolean not null default false,
 policy_version text not null default 'exploration-2-review-v1',
 updated_at timestamptz not null default now()
);
insert into public.scouting_runtime_config_v1(singleton,released)
values(true,false) on conflict(singleton) do nothing;

create table public.account_exploration_v1(
 account_id uuid primary key references auth.users(id) on delete cascade,
 xp bigint not null check(xp>=0),
 level integer not null check(level between 1 and 100),
 credited_discovery_ids text[] not null default '{}',
 retained_slots integer not null check(retained_slots between 1 and 5),
 source_character_ids uuid[] not null default '{}',
 migrated_at timestamptz not null,
 updated_at timestamptz not null default now()
);

create table public.character_scouting_access_v1(
 account_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid not null,
 retained_region_ids text[] not null default '{}',
 retained_area_ids text[] not null default '{}',
 retained_regular_encounter_ids text[] not null default '{}',
 prerequisite_route_ids text[] not null default '{}',
 completed_route_ids text[] not null default '{}',
 migrated_at timestamptz not null,
 updated_at timestamptz not null default now(),
 primary key(account_id,character_id)
);
create index character_scouting_access_character_v1 on public.character_scouting_access_v1(character_id);

create table public.scouting_assignments_v1(
 account_id uuid not null references auth.users(id) on delete cascade,
 assignment_id text not null,
 request_id text not null,
 character_id uuid not null,
 kind text not null check(kind in('route','practice','survey','camp')),
 route_id text,
 mission_id text,
 companion_ids text[] not null default '{}',
 training_minutes integer,
 started_at timestamptz not null,
 ends_at timestamptz not null,
 status text not null check(status in('active','completed','claimed','cancelled')),
 exploration_xp bigint not null default 0 check(exploration_xp>=0),
 quote jsonb not null default '{}'::jsonb,
 reward_snapshot jsonb,
 reward_grade text,
 policy_version text not null,
 claimed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(account_id,assignment_id),
 unique(account_id,request_id),
 check(ends_at>started_at),
 check(training_minutes is null or training_minutes in(5,15,30,60,120,240,480)),
 check(cardinality(companion_ids)<=3)
);
create index scouting_assignments_character_v1 on public.scouting_assignments_v1(account_id,character_id,status);
create unique index scouting_assignments_one_xp_slot_v1
 on public.scouting_assignments_v1(account_id)
 where status in('active','completed') and exploration_xp>0;

create table public.scouting_claims_v1(
 account_id uuid not null references auth.users(id) on delete cascade,
 request_id text not null,
 assignment_id text not null,
 character_id uuid not null,
 exploration_xp_awarded bigint not null default 0 check(exploration_xp_awarded>=0),
 reward jsonb,
 created_at timestamptz not null default now(),
 primary key(account_id,request_id),
 unique(account_id,assignment_id),
 foreign key(account_id,assignment_id) references public.scouting_assignments_v1(account_id,assignment_id) on delete cascade
);

create table public.achievement_catalog(
 achievement_id text primary key,
 category text not null,
 name text not null,
 description text not null,
 required integer not null check(required>0),
 points integer not null check(points>=0),
 reward jsonb not null default '{}'::jsonb,
 enabled boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.achievement_claims(
 account_id uuid not null references auth.users(id) on delete cascade,
 achievement_id text not null references public.achievement_catalog(achievement_id),
 request_id text not null,
 credited_character_id uuid,
 payout jsonb not null,
 claimed_at timestamptz not null,
 primary key(account_id,achievement_id),
 unique(account_id,request_id)
);
create table public.achievement_showcase(
 account_id uuid primary key references auth.users(id) on delete cascade,
 achievement_ids text[] not null default '{}',
 updated_at timestamptz not null default now(),
 check(cardinality(achievement_ids)<=3)
);

insert into public.achievement_catalog(achievement_id,category,name,description,required,points,reward)
values
 ('exploration2_first_report','Progression','First Report','Collect your first scouting report.',1,10,'{"gold":100}'::jsonb),
 ('exploration2_asterfall_cartographer','Collection','Asterfall Cartographer','Map every released Asterfall scouting route.',5,25,'{"gold":500,"titleId":"asterfall_trailblazer","titleName":"Asterfall Trailblazer"}'::jsonb),
 ('exploration2_sunscar_cartographer','Collection','Sunscar Cartographer','Map every released Sunscar scouting route.',4,25,'{"gold":750,"titleId":"sunscar_cartographer","titleName":"Sunscar Cartographer"}'::jsonb),
 ('exploration2_frostmarch_cartographer','Collection','Frostmarch Cartographer','Map every released Frostmarch scouting route.',4,25,'{"gold":1000,"titleId":"frostmarch_pathfinder","titleName":"Frostmarch Pathfinder"}'::jsonb),
 ('exploration2_known_realm','Meta','Cartographer of the Known Realm','Complete every released regional scouting collection.',3,50,'{"gold":2500,"titleId":"known_realm_cartographer","titleName":"Cartographer of the Known Realm"}'::jsonb)
on conflict(achievement_id) do nothing;

alter table public.scouting_runtime_config_v1 enable row level security;
alter table public.account_exploration_v1 enable row level security;
alter table public.character_scouting_access_v1 enable row level security;
alter table public.scouting_assignments_v1 enable row level security;
alter table public.scouting_claims_v1 enable row level security;
alter table public.achievement_catalog enable row level security;
alter table public.achievement_claims enable row level security;
alter table public.achievement_showcase enable row level security;

revoke all on public.scouting_runtime_config_v1,public.account_exploration_v1,public.character_scouting_access_v1,
 public.scouting_assignments_v1,public.scouting_claims_v1,public.achievement_catalog,public.achievement_claims,public.achievement_showcase
 from public,anon,authenticated;
grant select,insert,update,delete on public.scouting_runtime_config_v1,public.account_exploration_v1,public.character_scouting_access_v1,
 public.scouting_assignments_v1,public.scouting_claims_v1,public.achievement_catalog,public.achievement_claims,public.achievement_showcase
 to service_role;

create or replace function public.scouting_migrate_account_server_v1(p_account_id uuid,p_now timestamptz)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
 v_state jsonb;
 v_main jsonb;
 v_chars jsonb;
 v_char jsonb;
 v_skill jsonb;
 v_char_id uuid;
 v_level integer;
 v_total_xp bigint:=0;
 v_xp bigint;
 v_slots integer;
 v_routes text[];
 v_discoveries text[]:='{}';
 v_sources uuid[]:='{}';
 v_regions text[];
 v_areas text[];
 v_evidence text[];
 v_prereq text[];
 v_bosses text[];
 v_current text;
 v_mastery jsonb;
 v_sun_retained boolean;
 v_frost_retained boolean;
 v_count integer:=0;
 v_existing public.account_exploration_v1%rowtype;
begin
 if p_account_id is null or p_now is null then raise exception 'INVALID_MIGRATION_REQUEST';end if;
 perform pg_advisory_xact_lock(hashtextextended('scouting-migrate:'||p_account_id::text,0));
 select * into v_existing from public.account_exploration_v1 where account_id=p_account_id;
 if found then
  return jsonb_build_object('accountId',p_account_id,'alreadyMigrated',true,'xp',v_existing.xp,'level',v_existing.level,'retainedSlots',v_existing.retained_slots,'characters',cardinality(v_existing.source_character_ids));
 end if;
 select state into strict v_state from public.online_game_states where account_id=p_account_id for update;
 v_main:=jsonb_build_object(
  'character',coalesce(v_state->'character','{}'::jsonb),
  'skills',coalesce(v_state->'skills','[]'::jsonb),
  'currentRegionId',v_state->'currentRegionId',
  'defeatedBossIds',coalesce(v_state->'defeatedBossIds','[]'::jsonb),
  'exploredRouteIds',coalesce(v_state->'exploredRouteIds','[]'::jsonb),
  'unlockedMonsterIds',coalesce(v_state->'unlockedMonsterIds','[]'::jsonb),
  'activity',coalesce(v_state->'activity','null'::jsonb)
 );
 v_chars:=jsonb_build_array(v_main)||case when jsonb_typeof(v_state->'otherCharacters')='array' then v_state->'otherCharacters' else '[]'::jsonb end;
 for v_char in select value from jsonb_array_elements(v_chars) loop
  v_char_id:=(v_char#>>'{character,id}')::uuid;
  if v_char_id is null or v_char_id=any(v_sources) then raise exception 'INVALID_CHARACTER_SNAPSHOT';end if;
  v_sources:=array_append(v_sources,v_char_id);v_count:=v_count+1;
  v_xp:=0;
  for v_skill in select value from jsonb_array_elements(coalesce(v_char->'skills','[]'::jsonb)) loop
   if v_skill->>'skillId'='exploration' then
    v_xp:=coalesce((v_skill->>'xp')::bigint,0);
    exit;
   end if;
  end loop;
  if v_xp<0 or v_total_xp>9223372036854775807-v_xp then raise exception 'INVALID_EXPLORATION_XP';end if;
  v_total_xp:=v_total_xp+v_xp;
  select coalesce(array_agg(distinct x order by x),'{}'::text[]) into v_routes
   from jsonb_array_elements_text(case when jsonb_typeof(v_char->'exploredRouteIds')='array' then v_char->'exploredRouteIds' else '[]'::jsonb end) x;
  select coalesce(array_agg(distinct x order by x),'{}'::text[]) into v_discoveries
   from unnest(v_discoveries||v_routes) x;
 end loop;
 v_slots:=greatest(1,least(5,coalesce((v_state#>>'{account,unlockedCharacterSlots}')::integer,1)));
 insert into public.account_exploration_v1(account_id,xp,level,credited_discovery_ids,retained_slots,source_character_ids,migrated_at)
 values(p_account_id,v_total_xp,public.scouting_skill_level_from_xp_v1(v_total_xp),v_discoveries,v_slots,v_sources,p_now);

 for v_char in select value from jsonb_array_elements(v_chars) loop
  v_char_id:=(v_char#>>'{character,id}')::uuid;
  v_level:=greatest(1,coalesce((v_char#>>'{character,level}')::integer,1));
  v_current:=coalesce(v_char->>'currentRegionId','GREENFIELDS');
  select coalesce(array_agg(distinct x order by x),'{}'::text[]) into v_routes
   from jsonb_array_elements_text(case when jsonb_typeof(v_char->'exploredRouteIds')='array' then v_char->'exploredRouteIds' else '[]'::jsonb end) x;
  select coalesce(array_agg(distinct x order by x),'{}'::text[]) into v_bosses
   from jsonb_array_elements_text(case when jsonb_typeof(v_char->'defeatedBossIds')='array' then v_char->'defeatedBossIds' else '[]'::jsonb end) x;
  v_mastery:=coalesce(v_char#>'{character,monsterMasteryPoints}','{}'::jsonb);
  v_sun_retained:=v_current='SUNSCAR' or exists(
   select 1 from jsonb_each_text(v_mastery) m
   where m.key=any(array['SUNSCAR_SCORPION','DUNE_ORACLE','GLASSBOUND_SENTINEL','SAFFRON_MARAUDER','GLASS_DUNE_STRIDER','MIRAGE_SHADE','OBSERVATORY_KEEPER','ROYAL_SANDGUARD','DUSTVEIL_RUNNER','SANDPLATE_JUGGERNAUT','PRISM_HEXER','CROWN_EXECUTIONER'])
     and case when m.value~'^-?[0-9]+([.][0-9]+)?$' then m.value::numeric else 0 end>0);
  v_frost_retained:=v_current in('FROSTMARCH','ASHLANDS') or exists(
   select 1 from jsonb_each_text(v_mastery) m
   where m.key=any(array['FROSTWOLF','BELLWRAITH','CHOIR_HUNTER','ICEBOUND_RAIDER','SNOW_TREANT','RIME_STALKER','LAKEBOUND_SPECTER','WYRMSPINE_GUARDIAN','RIME_BERSERKER','FROSTNEEDLE_BROOD','CHOIR_DEFILER','STORMGLASS_COLOSSUS'])
     and case when m.value~'^-?[0-9]+([.][0-9]+)?$' then m.value::numeric else 0 end>0);
  v_regions:='{}';
  if v_level>=1 then v_regions:=array_append(v_regions,'GREENFIELDS');end if;
  if v_level>=4 then v_regions:=array_append(v_regions,'SILVERBROOK');end if;
  if v_level>=6 then v_regions:=array_append(v_regions,'IRONWOOD');end if;
  if v_level>=13 and 'SCOUT_IRONWOOD'=any(v_routes) then v_regions:=array_append(v_regions,'OLD_MINES');end if;
  if v_level>=16 and 'SCOUT_OLD_MINES'=any(v_routes) then v_regions:=array_append(v_regions,'KINGS_ROAD');end if;
  if v_sun_retained or (v_level>=26 and 'FALLEN_KNIGHT'=any(v_bosses) and 'SCOUT_KINGS_ROAD'=any(v_routes)) then v_regions:=array_append(v_regions,'SUNSCAR');end if;
  if v_frost_retained or (v_level>=51 and 'FALLEN_KNIGHT'=any(v_bosses) and 'SCOUT_SUNSCAR'=any(v_routes)) then v_regions:=array_append(v_regions,'FROSTMARCH');end if;

  v_areas:='{}';
  if 'SUNSCAR'=any(v_regions) then
   if v_level>=26 then v_areas:=array_append(v_areas,'ZONE_006');end if;
   if v_level>=32 then v_areas:=array_append(v_areas,'ZONE_007');end if;
   if v_level>=38 then v_areas:=array_append(v_areas,'ZONE_008');end if;
   if v_level>=44 then v_areas:=array_append(v_areas,'ZONE_010');end if;
  end if;
  if 'FROSTMARCH'=any(v_regions) then
   if v_level>=51 then v_areas:=array_append(v_areas,'ZONE_011');end if;
   if v_level>=57 then v_areas:=array_append(v_areas,'ZONE_012');end if;
   if v_level>=63 then v_areas:=array_append(v_areas,'ZONE_013');end if;
   if v_level>=69 then v_areas:=array_append(v_areas,'ZONE_015');end if;
  end if;

  select coalesce(array_agg(distinct x order by x),'{}'::text[]) into v_evidence from(
   select value x from jsonb_array_elements_text(case when jsonb_typeof(v_char->'unlockedMonsterIds')='array' then v_char->'unlockedMonsterIds' else '[]'::jsonb end)
   union all
   select key from jsonb_each_text(v_mastery) where case when value~'^-?[0-9]+([.][0-9]+)?$' then value::numeric else 0 end>0
  ) evidence;

  v_prereq:='{}';
  if 'OLD_MINES'=any(v_regions) then v_prereq:=array_append(v_prereq,'SCOUT_IRONWOOD');end if;
  if 'KINGS_ROAD'=any(v_regions) then v_prereq:=v_prereq||array['SCOUT_IRONWOOD','SCOUT_OLD_MINES'];end if;
  if 'SUNSCAR'=any(v_regions) then v_prereq:=v_prereq||array['SCOUT_IRONWOOD','SCOUT_OLD_MINES','SCOUT_KINGS_ROAD'];end if;
  if 'FROSTMARCH'=any(v_regions) then v_prereq:=v_prereq||array['SCOUT_IRONWOOD','SCOUT_OLD_MINES','SCOUT_KINGS_ROAD','SCOUT_SUNSCAR'];end if;
  select coalesce(array_agg(distinct x order by x),'{}'::text[]) into v_prereq from unnest(v_prereq) x;

  insert into public.character_scouting_access_v1(account_id,character_id,retained_region_ids,retained_area_ids,retained_regular_encounter_ids,prerequisite_route_ids,completed_route_ids,migrated_at)
  values(p_account_id,v_char_id,v_regions,v_areas,v_evidence,v_prereq,v_routes,p_now);
 end loop;
 return jsonb_build_object('accountId',p_account_id,'alreadyMigrated',false,'xp',v_total_xp,'level',public.scouting_skill_level_from_xp_v1(v_total_xp),'retainedSlots',v_slots,'characters',v_count);
end $$;

create or replace function public.scouting_snapshot_server_v1(p_account_id uuid,p_character_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
 v_account public.account_exploration_v1%rowtype;
 v_access public.character_scouting_access_v1%rowtype;
 v_state jsonb;
 v_camp_level integer:=0;
 v_active integer:=0;
 v_legacy integer:=0;
 v_assignments jsonb:='[]'::jsonb;
begin
 select * into strict v_account from public.account_exploration_v1 where account_id=p_account_id;
 select * into strict v_access from public.character_scouting_access_v1 where account_id=p_account_id and character_id=p_character_id;
 select state into v_state from public.online_game_states where account_id=p_account_id;
 v_camp_level:=greatest(0,least(3,coalesce((v_state#>>'{account,companionSanctuary,expeditionPensLevel}')::integer,0)));
 select count(*) into v_active from public.scouting_assignments_v1 where account_id=p_account_id and kind='camp' and status='active' and ends_at>clock_timestamp();
 select count(*) into v_legacy
 from jsonb_array_elements(case when jsonb_typeof(v_state#>'{account,companionAssignments}')='array' then v_state#>'{account,companionAssignments}' else '[]'::jsonb end) a
 where coalesce(a->>'status','') in('active','completed');
 select coalesce(jsonb_agg(jsonb_build_object(
  'assignmentId',assignment_id,'characterId',character_id,'kind',kind,'status',status,'endsAt',ends_at,
  'companionIds',companion_ids,'explorationXp',exploration_xp) order by created_at),'[]'::jsonb)
 into v_assignments from public.scouting_assignments_v1 where account_id=p_account_id and status<>'cancelled';
 return jsonb_build_object(
  'account',jsonb_build_object('accountId',v_account.account_id,'xp',v_account.xp,'level',v_account.level,'creditedDiscoveryIds',v_account.credited_discovery_ids,'retainedSlots',v_account.retained_slots),
  'character',jsonb_build_object('characterId',v_access.character_id,'retainedRegionIds',v_access.retained_region_ids,'retainedAreaIds',v_access.retained_area_ids,'discoveredRouteIds',v_access.completed_route_ids),
  'assignments',v_assignments,
  'camp',jsonb_build_object('level',v_camp_level,'capacity',v_camp_level,'active',v_active),
  'legacyReports',v_legacy);
end $$;

create or replace function public.scouting_dispatch_server_v1(p_account_id uuid,p_character_id uuid,p_command jsonb,p_request_id text,p_now timestamptz)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
begin
 if not coalesce((select released from public.scouting_runtime_config_v1 where singleton),false) then raise exception 'SCOUTING_2_NOT_RELEASED';end if;
 raise exception 'SCOUTING_DISPATCH_SETTLEMENT_NOT_READY';
end $$;

create or replace function public.scouting_claim_server_v1(p_account_id uuid,p_character_id uuid,p_assignment_id text,p_request_id text,p_now timestamptz)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
begin
 if not coalesce((select released from public.scouting_runtime_config_v1 where singleton),false) then raise exception 'SCOUTING_2_NOT_RELEASED';end if;
 raise exception 'SCOUTING_CLAIM_SETTLEMENT_NOT_READY';
end $$;

create or replace function public.achievement_snapshot_server_v1(p_account_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
 v_routes text[]:=coalesce((select credited_discovery_ids from public.account_exploration_v1 where account_id=p_account_id),'{}');
 v_reports integer:=coalesce((select count(*) from public.scouting_claims_v1 where account_id=p_account_id),0);
 v_a integer;v_s integer;v_f integer;v_regions integer;
 v_entries jsonb;v_showcase text[]:=coalesce((select achievement_ids from public.achievement_showcase where account_id=p_account_id),'{}');
begin
 if not exists(select 1 from auth.users where id=p_account_id) then raise exception 'ACCOUNT_NOT_FOUND';end if;
 select count(*) into v_a from unnest(array['SCOUT_GREENFIELDS','SCOUT_SILVERBROOK','SCOUT_IRONWOOD','SCOUT_OLD_MINES','SCOUT_KINGS_ROAD']) x where x=any(v_routes);
 select count(*) into v_s from unnest(array['SCOUT_SUNSCAR','SCOUT_SUNSCAR_SCORCHWIND','SCOUT_SUNSCAR_MIRAGE','SCOUT_SUNSCAR_CROWN']) x where x=any(v_routes);
 select count(*) into v_f from unnest(array['SCOUT_FROSTMARCH','SCOUT2_FROST_WHITEPINE','SCOUT2_FROST_SHIVERLAKE','SCOUT2_FROST_WYRMSPINE']) x where x=any(v_routes);
 v_regions:=(case when v_a=5 then 1 else 0 end)+(case when v_s=4 then 1 else 0 end)+(case when v_f=4 then 1 else 0 end);
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',c.achievement_id,'category',c.category,'name',c.name,'description',c.description,
   'progress',least(c.required,case c.achievement_id
     when 'exploration2_first_report' then least(1,v_reports)
     when 'exploration2_asterfall_cartographer' then v_a
     when 'exploration2_sunscar_cartographer' then v_s
     when 'exploration2_frostmarch_cartographer' then v_f
     when 'exploration2_known_realm' then v_regions else 0 end),
   'required',c.required,'points',c.points,
   'completed',(case c.achievement_id
     when 'exploration2_first_report' then v_reports>=1
     when 'exploration2_asterfall_cartographer' then v_a>=5
     when 'exploration2_sunscar_cartographer' then v_s>=4
     when 'exploration2_frostmarch_cartographer' then v_f>=4
     when 'exploration2_known_realm' then v_regions>=3 else false end),
   'claimed',cl.achievement_id is not null,'reward',c.reward,
   'claimedAtMs',case when cl.claimed_at is null then null else floor(extract(epoch from cl.claimed_at)*1000)::bigint end
 ) order by c.achievement_id),'[]'::jsonb) into v_entries
 from public.achievement_catalog c left join public.achievement_claims cl on cl.account_id=p_account_id and cl.achievement_id=c.achievement_id
 where c.enabled;
 return jsonb_build_object('entries',v_entries,
  'score',coalesce((select sum((e->>'points')::integer) from jsonb_array_elements(v_entries)e where (e->>'completed')::boolean),0),
  'claimedCount',(select count(*) from public.achievement_claims where account_id=p_account_id),
  'showcaseIds',v_showcase);
end $$;

create or replace function public.achievement_claim_server_v1(p_account_id uuid,p_achievement_id text,p_request_id text,p_now timestamptz)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
begin
 if p_achievement_id like 'exploration2_%' and not coalesce((select released from public.scouting_runtime_config_v1 where singleton),false)
 then raise exception 'SCOUTING_2_NOT_RELEASED';end if;
 raise exception 'ACHIEVEMENT_REWARD_SETTLEMENT_NOT_READY';
end $$;

create or replace function public.achievement_showcase_update_server_v1(p_account_id uuid,p_achievement_ids text[],p_request_id text,p_now timestamptz)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
begin
 if p_account_id is null or p_request_id is null or length(p_request_id)<8 or cardinality(p_achievement_ids)>3 or cardinality(p_achievement_ids)<>cardinality(array(select distinct x from unnest(p_achievement_ids)x))
 then raise exception 'ACHIEVEMENT_SHOWCASE_INVALID';end if;
 if exists(select 1 from unnest(p_achievement_ids)x where not exists(select 1 from public.achievement_claims c where c.account_id=p_account_id and c.achievement_id=x))
 then raise exception 'ACHIEVEMENT_NOT_CLAIMED';end if;
 insert into public.achievement_showcase(account_id,achievement_ids,updated_at) values(p_account_id,p_achievement_ids,p_now)
 on conflict(account_id) do update set achievement_ids=excluded.achievement_ids,updated_at=excluded.updated_at;
 return jsonb_build_object('showcaseIds',p_achievement_ids,'snapshot',public.achievement_snapshot_server_v1(p_account_id));
end $$;

revoke all on function public.scouting_skill_level_from_xp_v1(bigint) from public,anon,authenticated;
revoke all on function public.scouting_migrate_account_server_v1(uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.scouting_snapshot_server_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.scouting_dispatch_server_v1(uuid,uuid,jsonb,text,timestamptz) from public,anon,authenticated;
revoke all on function public.scouting_claim_server_v1(uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.achievement_snapshot_server_v1(uuid) from public,anon,authenticated;
revoke all on function public.achievement_claim_server_v1(uuid,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.achievement_showcase_update_server_v1(uuid,text[],text,timestamptz) from public,anon,authenticated;
grant execute on function public.scouting_skill_level_from_xp_v1(bigint) to service_role;
grant execute on function public.scouting_migrate_account_server_v1(uuid,timestamptz) to service_role;
grant execute on function public.scouting_snapshot_server_v1(uuid,uuid) to service_role;
grant execute on function public.scouting_dispatch_server_v1(uuid,uuid,jsonb,text,timestamptz) to service_role;
grant execute on function public.scouting_claim_server_v1(uuid,uuid,text,text,timestamptz) to service_role;
grant execute on function public.achievement_snapshot_server_v1(uuid) to service_role;
grant execute on function public.achievement_claim_server_v1(uuid,text,text,timestamptz) to service_role;
grant execute on function public.achievement_showcase_update_server_v1(uuid,text[],text,timestamptz) to service_role;
