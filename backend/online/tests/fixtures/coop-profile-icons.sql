-- Disposable offline fixture: run through backend/online/tests/coop-profile-icons-db.mjs.
-- The runner supplies the existing schema scaffold and real profile/RPC bodies.
-- Never run this fixture against a hosted or shared database. All data rolls back.
begin;

create function pg_temp.assert_coop_icon(value boolean,message text) returns void
language plpgsql as $$
begin
  if value is distinct from true then raise exception 'COOP ICON FAIL: %',message;end if;
end $$;

create function pg_temp.expect_coop_icon_error(scope text,ids uuid[],expected_code text,expected_message text)
returns void language plpgsql as $$
declare rejected boolean:=false;
begin
  begin
    perform * from public.coop_profile_icons_v1(scope,ids);
  exception when others then
    if sqlstate<>expected_code or sqlerrm<>expected_message then
      raise exception 'COOP ICON FAIL: expected %/% but received %/%',expected_code,expected_message,sqlstate,sqlerrm;
    end if;
    rejected:=true;
  end;
  perform pg_temp.assert_coop_icon(rejected,'request should have been rejected: '||coalesce(scope,'NULL'));
end $$;

-- Fictional identities: 101 is the controller; 102-104 are Echo donors.
insert into public.characters(id,account_id,name,class_id,level,body_presentation) values
 ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101','Controller','IRONWARDEN',25,'male'),
 ('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000102','Frozen Bastion','BASTION',25,'male'),
 ('00000000-0000-0000-0000-000000000203','00000000-0000-0000-0000-000000000103','Wayfinder','WAYFINDER',25,'female'),
 ('00000000-0000-0000-0000-000000000204','00000000-0000-0000-0000-000000000104','Legacy Dawnkeeper','DAWNKEEPER',25,'female'),
 ('00000000-0000-0000-0000-000000000212','00000000-0000-0000-0000-000000000102','Public Stonecaller','STONECALLER',30,'female');
insert into public.online_game_states(account_id,state)
select c.account_id,jsonb_build_object('character',jsonb_build_object(
 'id',c.id,'name',c.name,'classId',c.class_id,'level',c.level,'profileIconId','starter:hooded-ranger'))
from public.characters c where c.id in
 ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000203');
update public.online_game_states set state=state||jsonb_build_object('otherCharacters',jsonb_build_array(
 jsonb_build_object('character',jsonb_build_object('id','00000000-0000-0000-0000-000000000212',
 'name','Public Stonecaller','classId','STONECALLER','level',30,'profileIconId','starter:traveling-alchemist'))))
where account_id='00000000-0000-0000-0000-000000000102';
insert into public.player_profile_extensions(account_id,visibility,selected_character_id) values
 ('00000000-0000-0000-0000-000000000101','private',null),
 ('00000000-0000-0000-0000-000000000102','public','00000000-0000-0000-0000-000000000212');

insert into public.expedition_runs(id,coop_mode,status) values
 ('00000000-0000-0000-0000-000000000301','qmode','active'),
 ('00000000-0000-0000-0000-000000000302','live','active'),
 ('00000000-0000-0000-0000-000000000303','event','active'),
 ('00000000-0000-0000-0000-000000000304',null,'active'),
 ('00000000-0000-0000-0000-000000000305','unknown_mode','active'),
 ('00000000-0000-0000-0000-000000000306','live','completed');
insert into public.expedition_run_members(run_id,character_id,account_id,source_account_id,
 active_participant_account_id,member_kind,slot_id,loadout_snapshot,stat_snapshot,snapshot_hash)
select r.id,c.id,c.account_id,
 case when c.id='00000000-0000-0000-0000-000000000203' then null else c.account_id end,
 case when r.coop_mode='live' or c.account_id='00000000-0000-0000-0000-000000000101' then c.account_id else null end,
 case when r.coop_mode='live' or c.account_id='00000000-0000-0000-0000-000000000101' then 'human' else 'echo' end,
 (row_number() over(partition by r.id order by c.id)-1)::text,
 jsonb_build_object('revision',7,'private','frozen-loadout','characterId',c.id,'accountId',c.account_id),
 jsonb_build_object('classId',c.class_id,'maxHp',1111,'attackPower',222),repeat('a',64)
from public.expedition_runs r cross join public.characters c
where c.id in('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000202',
 '00000000-0000-0000-0000-000000000203','00000000-0000-0000-0000-000000000204');
insert into public.coop_run_access_memberships(run_id,account_id,active,membership_kind)
select r.id,'00000000-0000-0000-0000-000000000101',true,'controller' from public.expedition_runs r;
insert into public.coop_run_access_memberships(run_id,account_id,active,membership_kind)
select '00000000-0000-0000-0000-000000000302',c.account_id,true,'live_participant'
from public.characters c where c.id in('00000000-0000-0000-0000-000000000202',
 '00000000-0000-0000-0000-000000000203','00000000-0000-0000-0000-000000000204');
insert into public.coop_run_private_state
select id,jsonb_build_object('seed','private-seed','pending',jsonb_build_object('durationMs',9876)) from public.expedition_runs;
insert into public.coop_run_client_snapshots
select id,7,9,jsonb_build_object('phase','awaiting_choice','combatHash','unchanged') from public.expedition_runs;
insert into public.coop_ready_checks(id,roster_json,frozen_roster_json,status,roster_revision)
select '00000000-0000-0000-0000-000000000401',
 jsonb_agg(jsonb_build_object('characterId',m.character_id,'accountId',m.account_id,'role','damage') order by m.slot_id),
 jsonb_agg(m.loadout_snapshot order by m.slot_id),'open',3
from public.expedition_run_members m where run_id='00000000-0000-0000-0000-000000000301';
insert into public.coop_ready_checks values('00000000-0000-0000-0000-000000000402',
 '[{"characterId":"00000000-0000-0000-0000-000000000299","accountId":"00000000-0000-0000-0000-000000000199"}]',
 '[]','open',1);

-- Fifty-one active posts, with one missing game state inside the first fifty.
-- The absent state must not cause post 51 to become discoverable by icon lookup.
insert into public.online_coop_lfg_posts(id,owner_account_id,character_id,created_at,expires_at)
select md5('icon-post-'||n)::uuid,md5('icon-owner-'||n)::uuid,md5('icon-character-'||n)::uuid,
 now()-interval '10 minutes'+n*interval '1 second',now()+interval '10 minutes'+n*interval '1 second'
from generate_series(1,51) n;
insert into public.online_game_states(account_id,state)
select md5('icon-owner-'||n)::uuid,jsonb_build_object('character',jsonb_build_object(
 'id',md5('icon-character-'||n)::uuid,'name','Recruit '||n,'classId','RAVAGER','level',25,
 'profileIconId','starter:masked-spellcaster'))
from generate_series(1,51) n where n<>10;
insert into public.online_coop_lfg_posts values
 (md5('icon-expired-post')::uuid,md5('icon-expired-owner')::uuid,md5('icon-expired-character')::uuid,now()-interval '1 hour',now()-interval '1 second',null),
 (md5('icon-closed-post')::uuid,md5('icon-closed-owner')::uuid,md5('icon-closed-character')::uuid,now()-interval '1 hour',now()+interval '1 minute',now());
insert into public.online_game_states values
 (md5('icon-expired-owner')::uuid,'{"character":{"id":"00000000-0000-0000-0000-000000000290","classId":"BASTION","level":25,"profileIconId":"class:BASTION"}}'),
 (md5('icon-closed-owner')::uuid,'{"character":{"id":"00000000-0000-0000-0000-000000000291","classId":"BASTION","level":25,"profileIconId":"class:BASTION"}}');

create temp table coop_icon_frozen_before as
select jsonb_build_object(
 'members',(select jsonb_agg(to_jsonb(m) order by run_id,character_id) from public.expedition_run_members m),
 'runs',(select jsonb_agg(to_jsonb(r) order by id) from public.expedition_runs r),
 'private',(select jsonb_agg(to_jsonb(s) order by run_id) from public.coop_run_private_state s),
 'client',(select jsonb_agg(to_jsonb(s) order by run_id) from public.coop_run_client_snapshots s),
 'ready',(select jsonb_agg(to_jsonb(c) order by id) from public.coop_ready_checks c),
 'posts',(select jsonb_agg(to_jsonb(p) order by id) from public.online_coop_lfg_posts p)) as snapshot;

do $$
begin
 perform pg_temp.assert_coop_icon(not has_function_privilege('anon','public.coop_profile_icons_v1(text,uuid[])','EXECUTE'),'anon cannot call public RPC');
 perform pg_temp.assert_coop_icon(not has_function_privilege('service_role','public.coop_profile_icons_v1(text,uuid[])','EXECUTE'),'server role cannot skip viewer context');
 perform pg_temp.assert_coop_icon(has_function_privilege('authenticated','public.coop_profile_icons_v1(text,uuid[])','EXECUTE'),'authenticated can call public RPC');
 perform pg_temp.assert_coop_icon(has_function_privilege('authenticated','private.coop_profile_icons_v1(text,uuid[])','EXECUTE'),'bound helper remains executable');
 perform pg_temp.assert_coop_icon(not has_schema_privilege('authenticated','private','USAGE'),'fixture grants no private schema usage');
 perform pg_temp.assert_coop_icon((select not prosecdef and provolatile='v' from pg_proc where oid='public.coop_profile_icons_v1(text,uuid[])'::regprocedure),'public wrapper is an invoker and matches the profile resolver volatility');
 perform pg_temp.assert_coop_icon((select prosecdef and provolatile='v' and 'search_path=""'=any(proconfig) from pg_proc where oid='private.coop_profile_icons_v1(text,uuid[])'::regprocedure),'private helper matches the profile resolver volatility and has an empty search path');
 perform pg_temp.assert_coop_icon(not has_table_privilege('authenticated','public.online_coop_lfg_posts','SELECT'),'RPC adds no raw LFG table access');
 perform pg_temp.assert_coop_icon(not has_table_privilege('authenticated','public.coop_run_private_state','SELECT'),'private combat state stays inaccessible');
 begin
  insert into public.expedition_run_members(run_id,character_id)
  values('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000201');
  raise exception 'duplicate run member accepted';
 exception when unique_violation then null;end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.expect_coop_icon_error('run',array['00000000-0000-0000-0000-000000000301']::uuid[],'42501','auth_required');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
do $$
declare rows jsonb;keys text[];r record;
begin
 select jsonb_agg(to_jsonb(i) order by subject_id) into rows from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000301']::uuid[]) i;
 perform pg_temp.assert_coop_icon(jsonb_array_length(rows)=4,'authorized Q-mode returns four existing members');
 select array_agg(key order by key) into keys from jsonb_object_keys(rows->0) key;
 perform pg_temp.assert_coop_icon(keys=array['icon_class_id','profile_icon_id','subject_id'],'response exposes only three approved fields');
 perform pg_temp.assert_coop_icon(position('00000000-0000-0000-0000-000000000102' in rows::text)=0,'Echo source account absent from response');
 perform pg_temp.assert_coop_icon(position('private-seed' in rows::text)=0 and position('attackPower' in rows::text)=0,'no combat internals in icon response');
 select * into r from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000301']::uuid[]) where subject_id='00000000-0000-0000-0000-000000000202';
 perform pg_temp.assert_coop_icon(r.profile_icon_id='starter:traveling-alchemist' and r.icon_class_id='STONECALLER','current showcased profile is separate from frozen Bastion combat class');
 select * into r from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000301']::uuid[]) where subject_id='00000000-0000-0000-0000-000000000201';
 perform pg_temp.assert_coop_icon(r.profile_icon_id='starter:hooded-ranger','controller can see own private profile');
 select * into r from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000301']::uuid[]) where subject_id='00000000-0000-0000-0000-000000000204';
 perform pg_temp.assert_coop_icon(r.profile_icon_id='class:DAWNKEEPER','actual profile resolver retains legacy class fallback');
 perform pg_temp.assert_coop_icon((select count(*)=4 from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000302']::uuid[])),'Live run shares approved icon contract');
 perform pg_temp.assert_coop_icon((select count(*)=4 from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000303']::uuid[])),'authorized event run shares membership contract');
 perform pg_temp.assert_coop_icon((select count(*)=4 from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000306']::uuid[])),'completed run with active access still shows results');
 perform pg_temp.assert_coop_icon((select count(*)=4 from public.coop_profile_icons_v1('run','[7:7]={00000000-0000-0000-0000-000000000301}'::uuid[])),'non-default array lower bound is supported');
 perform pg_temp.assert_coop_icon((select count(*)=4 from public.coop_profile_icons_v1('ready',array['00000000-0000-0000-0000-000000000401']::uuid[])),'ready scope uses roster character IDs');
 perform pg_temp.assert_coop_icon((select count(*)=0 from public.expedition_run_members),'icon access does not grant raw Echo ownership rows');
 perform pg_temp.expect_coop_icon_error('run',array['00000000-0000-0000-0000-000000000304']::uuid[],'42501','NOT_PARTICIPANT');
 perform pg_temp.expect_coop_icon_error('run',array['00000000-0000-0000-0000-000000000305']::uuid[],'42501','NOT_PARTICIPANT');
 perform pg_temp.expect_coop_icon_error('run',array['00000000-0000-0000-0000-000000000999']::uuid[],'42501','NOT_PARTICIPANT');
 perform pg_temp.expect_coop_icon_error('ready',array['00000000-0000-0000-0000-000000000402']::uuid[],'42501','NOT_PARTICIPANT');
 perform pg_temp.expect_coop_icon_error('ready',array['00000000-0000-0000-0000-000000000999']::uuid[],'42501','NOT_PARTICIPANT');
end $$;
select 'PASS co-op icons: actual authenticated wrapper, memberships, event/completed runs, privacy-safe subjects and class separation' as result;

do $$
declare id uuid:='00000000-0000-0000-0000-000000000301';
begin
 perform pg_temp.expect_coop_icon_error(null,array[id],'22023','invalid_request');
 perform pg_temp.expect_coop_icon_error('echo',array[id],'22023','invalid_request');
 perform pg_temp.expect_coop_icon_error('run',null,'22023','invalid_request');
 perform pg_temp.expect_coop_icon_error('run',array[]::uuid[],'22023','invalid_request');
 perform pg_temp.expect_coop_icon_error('ready',array[id,id],'22023','invalid_request');
 perform pg_temp.expect_coop_icon_error('lfg',array[null]::uuid[],'22023','invalid_request');
 perform pg_temp.expect_coop_icon_error('lfg',array_fill(id,array[101]),'22023','invalid_request');
 perform pg_temp.expect_coop_icon_error('run',array[[id]],'22023','invalid_request');
 perform pg_temp.assert_coop_icon((select count(*)=0 from public.coop_profile_icons_v1('lfg',array[]::uuid[])),'empty LFG selection returns empty set');
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000199',true);
select pg_temp.expect_coop_icon_error('run',array['00000000-0000-0000-0000-000000000301']::uuid[],'42501','NOT_PARTICIPANT');
select pg_temp.expect_coop_icon_error('ready',array['00000000-0000-0000-0000-000000000401']::uuid[],'42501','NOT_PARTICIPANT');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
select pg_temp.expect_coop_icon_error('run',array['00000000-0000-0000-0000-000000000301']::uuid[],'42501','NOT_PARTICIPANT');
select pg_temp.assert_coop_icon((select count(*)=4 from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000302']::uuid[])),'same donor can read a different run as a real Live participant');
reset role;
update public.coop_run_access_memberships set active=false where run_id='00000000-0000-0000-0000-000000000301' and account_id='00000000-0000-0000-0000-000000000101';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
select pg_temp.expect_coop_icon_error('run',array['00000000-0000-0000-0000-000000000301']::uuid[],'42501','NOT_PARTICIPANT');
reset role;
update public.coop_run_access_memberships set active=true where run_id='00000000-0000-0000-0000-000000000301' and account_id='00000000-0000-0000-0000-000000000101';
select 'PASS co-op icons: invalid-input bounds, outsiders, inactive participants and Echo-donor non-access' as result;

-- Privacy decisions retain the subject row with NULL metadata so caches can clear.
update public.player_profile_extensions set visibility='private' where account_id='00000000-0000-0000-0000-000000000102';
set local role authenticated;
select pg_temp.assert_coop_icon((select profile_icon_id is null and icon_class_id is null from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000301']::uuid[]) where subject_id='00000000-0000-0000-0000-000000000202'),'private donor has retained subject and NULL icon/class');
select pg_temp.assert_coop_icon((select profile_icon_id is null and icon_class_id is null from public.coop_profile_icons_v1('ready',array['00000000-0000-0000-0000-000000000401']::uuid[]) where subject_id='00000000-0000-0000-0000-000000000202'),'ready roster respects same private-profile rule');
reset role;
update public.player_profile_extensions set visibility='guild' where account_id='00000000-0000-0000-0000-000000000102';
insert into public.guild_members values('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000601');
set local role authenticated;
select pg_temp.assert_coop_icon((select profile_icon_id is null from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000301']::uuid[]) where subject_id='00000000-0000-0000-0000-000000000202'),'guild-only profile hidden from different guild');
reset role;
insert into public.guild_members values('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000601');
set local role authenticated;
select pg_temp.assert_coop_icon((select profile_icon_id='starter:traveling-alchemist' from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000301']::uuid[]) where subject_id='00000000-0000-0000-0000-000000000202'),'same guild can see guild-only public profile');
reset role;
update public.player_profile_extensions set visibility='public' where account_id='00000000-0000-0000-0000-000000000102';
insert into public.player_blocks values('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000102');
set local role authenticated;
select pg_temp.assert_coop_icon((select profile_icon_id is null and icon_class_id is null from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000301']::uuid[]) where subject_id='00000000-0000-0000-0000-000000000202'),'viewer-to-donor block clears icon/class');
reset role;
delete from public.player_blocks;
insert into public.player_blocks values('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000101');
set local role authenticated;
select pg_temp.assert_coop_icon((select profile_icon_id is null and icon_class_id is null from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000301']::uuid[]) where subject_id='00000000-0000-0000-0000-000000000202'),'donor-to-viewer block clears icon/class');
reset role;
delete from public.player_blocks;
update public.online_game_states set state=jsonb_set(state,'{otherCharacters,0,character,profileIconId}','"starter:dawn-priestess"') where account_id='00000000-0000-0000-0000-000000000102';
set local role authenticated;
select pg_temp.assert_coop_icon((select profile_icon_id='starter:dawn-priestess' from public.coop_profile_icons_v1('run',array['00000000-0000-0000-0000-000000000301']::uuid[]) where subject_id='00000000-0000-0000-0000-000000000202'),'current icon refresh works for an already-persisted run');
reset role;
select 'PASS co-op icons: real profile resolver enforces private/guild/self/both-direction blocks and current-icon refresh' as result;

set local role authenticated;
do $$
declare ids uuid[];actual uuid[];
begin
 ids:=array[md5('icon-post-1')::uuid,md5('icon-post-10')::uuid,md5('icon-post-50')::uuid,md5('icon-post-51')::uuid,
  md5('icon-expired-post')::uuid,md5('icon-closed-post')::uuid,md5('icon-missing-post')::uuid,md5('icon-post-1')::uuid];
 select array_agg(subject_id order by subject_id) into actual from public.coop_profile_icons_v1('lfg',ids);
 perform pg_temp.assert_coop_icon(actual=(select array_agg(x order by x) from unnest(array[md5('icon-post-1')::uuid,md5('icon-post-50')::uuid]) x),'LFG uses current browse top50 before requested-ID filtering, no missing-game backfill, duplicates, expired or closed posts');
 select array_agg(md5('icon-post-'||n)::uuid) into ids from generate_series(1,51) n;
 perform pg_temp.assert_coop_icon((select count(*)=49 from public.coop_profile_icons_v1('lfg',ids)),'only 49 of first50 have game state; post51 stays undiscoverable');
end $$;
reset role;
insert into public.player_profile_extensions(account_id,visibility) values(md5('icon-owner-1')::uuid,'private');
set local role authenticated;
select pg_temp.assert_coop_icon((select profile_icon_id is null and icon_class_id is null from public.coop_profile_icons_v1('lfg',array[md5('icon-post-1')::uuid])),'visible LFG post retains subject with private metadata cleared');
reset role;
update public.player_profile_extensions set visibility='public' where account_id=md5('icon-owner-1')::uuid;
insert into public.player_blocks values(md5('icon-owner-1')::uuid,'00000000-0000-0000-0000-000000000101');
set local role authenticated;
select pg_temp.assert_coop_icon((select profile_icon_id is null and icon_class_id is null from public.coop_profile_icons_v1('lfg',array[md5('icon-post-1')::uuid])),'LFG icon respects existing profile block without exposing owner');
reset role;
select 'PASS co-op icons: LFG discovery window, first50 ordering, missing-state/expired/closed exclusion, deduplication and privacy' as result;

do $$
declare after_snapshot jsonb;
begin
 select jsonb_build_object(
  'members',(select jsonb_agg(to_jsonb(m) order by run_id,character_id) from public.expedition_run_members m),
  'runs',(select jsonb_agg(to_jsonb(r) order by id) from public.expedition_runs r),
  'private',(select jsonb_agg(to_jsonb(s) order by run_id) from public.coop_run_private_state s),
  'client',(select jsonb_agg(to_jsonb(s) order by run_id) from public.coop_run_client_snapshots s),
  'ready',(select jsonb_agg(to_jsonb(c) order by id) from public.coop_ready_checks c),
  'posts',(select jsonb_agg(to_jsonb(p) order by id) from public.online_coop_lfg_posts p)) into after_snapshot;
 perform pg_temp.assert_coop_icon(after_snapshot=(select snapshot from coop_icon_frozen_before),'all frozen combat/loadout/hash/private/client/ready JSON and LFG rows are unchanged by icon reads');
 perform pg_temp.assert_coop_icon((select stat_snapshot->>'classId'='BASTION' from public.expedition_run_members where run_id='00000000-0000-0000-0000-000000000301' and character_id='00000000-0000-0000-0000-000000000202'),'public Stonecaller appearance never replaces frozen Bastion class');
end $$;
select 'PASS co-op icons: icon reads and privacy/icon changes do not mutate frozen gameplay, ready checks, hashes or LFG cleanup' as result;
rollback;
