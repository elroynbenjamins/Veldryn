-- Run in a transaction after the repair migration; always roll back this smoke test.
-- Uses one existing guild member as an identity; all temporary changes are rolled back.
begin;
do $test$
declare
 v_uid uuid; v_gid uuid; v_encounter uuid; v_board jsonb; v_count integer;
 v_before bigint; v_revision bigint; v_result record; v_attempt jsonb; v_gift jsonb;
begin
 select gm.account_id,gm.guild_id into strict v_uid,v_gid from public.guild_members gm limit 1;
 perform set_config('request.jwt.claim.sub',v_uid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_uid,'is_anonymous',false)::text,true);
 update public.guild_members set role='leader' where account_id=v_uid;
 update public.guilds set level=greatest(level,3) where id=v_gid;

 perform public.guild_activity_state_v1();
 perform public.guild_activity_state_v2();
 perform public.guild_quest_state_v1();
 perform public.update_guild_notice_board_v1('Database repair smoke test');
 perform public.update_guild_notice_board_v1('Database repair smoke test updated');
 select count(*) into v_count from public.guild_bulletins b where b.guild_id=v_gid and b.body='Database repair smoke test updated';
 assert v_count=1,'Notice upsert did not persist exactly one row';

 select a.revision into v_revision from public.guild_appearance a where a.guild_id=v_gid;
 select * into v_result from public.update_guild_appearance_v52('world_tree_green','classic','name_ivory','tag_silver','classic','Stronger together.');
 assert v_result.revision=v_revision+1,'Appearance revision did not increment';

 v_board:=public.guild_pve_board_v1();
 assert jsonb_typeof(v_board)='array','PvE board must return an array';
 select e.id into strict v_encounter from public.guild_pve_encounters_v1 e
 where e.guild_id=v_gid and e.kind='weekly' and e.ends_at>now() order by e.starts_at desc limit 1;
 assert exists(select 1 from public.guild_pve_roster_v2 r where r.encounter_id=v_encounter and r.account_id=v_uid),'New encounter roster missing';
 v_attempt:=public.attempt_guild_pve_v3(v_encounter,'database-repair-attempt');
 assert v_attempt=public.attempt_guild_pve_v3(v_encounter,'database-repair-attempt'),'Attempt retry was not idempotent';
 select e.damage into v_before from public.guild_pve_encounters_v1 e where e.id=v_encounter;
 insert into public.guild_pve_attempts_v3(encounter_id,account_id,request_id,attempt_number,damage,character_damage,companion_damage,created_at,resolves_at)
 values(v_encounter,v_uid,'database-repair-smoke',999,123,123,0,now()-interval '11 minutes',now()-interval '1 minute');
 perform public.settle_guild_pve_attempts_v3(v_gid,now());
 perform public.settle_guild_pve_attempts_v3(v_gid,now());
 assert (select e.damage=least(e.max_hp,v_before+123) from public.guild_pve_encounters_v1 e where e.id=v_encounter),'Attempt settlement counted damage incorrectly';
 assert (select a.resolved_at is not null from public.guild_pve_attempts_v3 a where a.encounter_id=v_encounter and a.account_id=v_uid and a.request_id='database-repair-smoke'),'Attempt not marked settled';

 assert not has_table_privilege('authenticated','public.guild_pve_roster_v2','SELECT'),'Roster exposed to player role';
 assert not has_function_privilege('authenticated','public.create_guild_pve_encounter_v2(uuid,text,text,text,timestamptz,timestamptz,timestamptz,text)','EXECUTE'),'Encounter creator exposed to player role';
 -- Exercise admin reads last: staff identities are intentionally blocked from social writes.
 insert into public.liveops_admin_users(account_id,role,enabled) values(v_uid,'owner',true)
 on conflict(account_id) do update set role='owner',enabled=true;
 v_gift:=public.reward_gift_admin_v1(v_uid,'state','{}');
 assert jsonb_typeof(v_gift->'catalog')='array','Admin gift catalogue failed';
end $test$;
select 'PASS: gift admin state, activity, quests, notice upsert, appearance revision, PvE roster/board, attempt retry, exactly-once settlement and access grants' as verification;
rollback;
