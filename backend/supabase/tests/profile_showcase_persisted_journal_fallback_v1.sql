-- Regression test: run only against a local or staging database.
-- Uses a disposable account; all fixtures are rolled back.
begin;
do $qa$
declare a uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); alt uuid:=gen_random_uuid(); result jsonb;
begin
 insert into auth.users(id,email) values(a,'showcase-qa-'||a||'@example.invalid');
 insert into public.characters(id,account_id,name,class_id) values
 (c,a,'Journal QA','RAVAGER'),(alt,a,'Journal Alt QA','DAWNKEEPER');
 insert into public.player_profiles(account_id,display_name,active_character_id)
 values(a,'Journal QA',c) on conflict(account_id) do update set active_character_id=excluded.active_character_id;
 insert into public.online_game_states(account_id,character_id,state) values(a,c,
 jsonb_build_object('character',jsonb_build_object('id',c,'name','Journal QA','classId','RAVAGER'),
 'skills','[]'::jsonb,'otherCharacters',jsonb_build_array(jsonb_build_object('character',jsonb_build_object('id',alt,'name','Journal Alt QA','classId','DAWNKEEPER'),'skills','[]'::jsonb)),
 'account',jsonb_build_object('journalState','{"unlockedAchievements":{"artisan_novice":{"unlockedAtMs":1}},"records":{"longest_activity_seconds":{"value":100,"recordId":"longest_activity_seconds","achievedAtMs":1}}}'::jsonb)));
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','is_anonymous',false)::text,true);
 if exists(select 1 from private.adventurers_journal_state where account_id=a) then raise exception 'fixture has private journal';end if;
 result:=public.profile_extension_update_v43('public',false,c,'',null,null,array['artisan_novice'],'[]',array['longest_activity_seconds'],'{}');
 result:=public.profile_character_showcase_update_v2(c,null,null,array['artisan_novice'],'[{"kind":"profile_icon","id":"starter:hooded-ranger"}]',array['longest_activity_seconds'],'{}');
 if not (result->'achievementShowcaseIds' @> '["artisan_novice"]' and result->'recordShowcaseIds' @> '["longest_activity_seconds"]' and result->'collectionShowcase' @> '[{"kind":"profile_icon","id":"starter:hooded-ranger"}]') then raise exception 'valid save failed';end if;
 result:=public.profile_character_showcase_update_v2(alt,null,null,array['artisan_novice'],'[]',array['longest_activity_seconds'],'{}');
 if not (result->'recordShowcaseIds' @> '["longest_activity_seconds"]') then raise exception 'alt save failed';end if;
 if (select active_character_id from public.player_profiles where account_id=a) is distinct from c then raise exception 'active character changed';end if;
 result:=public.profile_character_public_v1(a,alt);
 if result#>>'{recordEntries,longest_activity_seconds,value}' is distinct from '100' then raise exception 'public projection failed';end if;
 begin
 perform public.profile_character_showcase_update_v2(c,null,null,array['fake_achievement'],'[]','{}','{}');
 raise exception 'invalid achievement accepted';
 exception when raise_exception then if sqlerrm <> 'ACHIEVEMENT_NOT_UNLOCKED' then raise;end if;end;
 begin
 perform public.profile_character_showcase_update_v2(c,null,null,'{}','[]',array['fake_record'],'{}');
 raise exception 'invalid record accepted';
 exception when raise_exception then if sqlerrm <> 'RECORD_NOT_AVAILABLE' then raise;end if;end;
 update public.online_game_states set state=jsonb_set(state,'{account,journalState}','{"unlockedAchievements":["artisan_novice"],"records":[]}'::jsonb,true) where account_id=a;
 begin
 perform public.profile_character_showcase_update_v2(c,null,null,array['artisan_novice'],'[]','{}','{}');
 raise exception 'malformed journal accepted';
 exception when raise_exception then if sqlerrm <> 'ACHIEVEMENT_NOT_UNLOCKED' then raise;end if;end;
end $qa$;
rollback;
