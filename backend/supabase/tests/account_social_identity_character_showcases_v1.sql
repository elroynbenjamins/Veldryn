-- Transactional staging QA: no fixture survives the final rollback.
begin;
create or replace function pg_temp.assert_social(value boolean,label text)
returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'SOCIAL_IDENTITY_FAIL: %',label;end if;end $$;
do $qa$
declare
 owner_id uuid:=gen_random_uuid();
 viewer_id uuid:=gen_random_uuid();
 c1 uuid:=gen_random_uuid();c2 uuid:=gen_random_uuid();c3 uuid:=gen_random_uuid();
 row jsonb;row2 jsonb;
begin
 insert into auth.users(id,email)
 values(owner_id,'social-owner-'||owner_id||'@example.invalid'),
  (viewer_id,'social-viewer-'||viewer_id||'@example.invalid');
 insert into public.characters(id,account_id,name,class_id)
 values(c1,owner_id,'Warden One','IRONWARDEN'),
  (c2,owner_id,'Shade Two','KNIFE_DANCER'),
  (c3,owner_id,'Healer Three','DAWNKEEPER');
 insert into public.player_profiles(account_id,display_name,active_character_id)
 values(owner_id,'Warden One',c1) on conflict(account_id) do nothing;
 insert into public.player_profiles(account_id,display_name)
 values(viewer_id,'Viewer') on conflict(account_id) do nothing;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 row:=public.set_account_social_name_v1('Realm Hero');
 perform pg_temp.assert_social(row->>'socialName'='Realm Hero' and row->>'selected'='true','initial name selection');
 update public.player_profiles set active_character_id=c2 where account_id=owner_id;
 perform pg_temp.assert_social((select display_name='Realm Hero' from public.player_profiles where account_id=owner_id),'switch preserves social name');
 -- The same selected name is idempotent rather than a second cooldown event.
 row:=public.set_account_social_name_v1('Realm Hero');
 perform pg_temp.assert_social(row->>'selected'='true','same-name idempotency');
 begin
  perform public.set_account_social_name_v1('New Hero');
  raise exception 'expected cooldown not enforced';
 exception when others then
  if sqlerrm not like '%SOCIAL_NAME_COOLDOWN%' then raise;end if;
 end;
 perform set_config('request.jwt.claim.sub',viewer_id::text,true);
 begin
  perform public.set_account_social_name_v1('Realm Hero');
  raise exception 'expected uniqueness not enforced';
 exception when others then
  if sqlerrm not like '%SOCIAL_NAME_TAKEN%' then raise;end if;
 end;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.profile_extension_update_v43('public',false,c1,'Shared account bio',null,null,
  '{}'::text[],'[]'::jsonb,'{}'::text[],'{}'::text[]);
 perform public.profile_extension_update_v43('public',false,c2,'Shared account bio',null,null,
  '{}'::text[],'[]'::jsonb,'{}'::text[],'{}'::text[]);
 perform pg_temp.assert_social(
  (select count(*)=2 from public.character_profile_showcases_v1 where account_id=owner_id),
  'two independently stored showcases');
 -- Assert independent per-character state is read, not the account's last selected slots.
 update public.character_profile_showcases_v1
  set favorite_skill_id='mining' where character_id=c1;
 perform set_config('request.jwt.claim.sub',viewer_id::text,true);
 row:=public.profile_character_public_v1(owner_id,c1);
 row2:=public.profile_character_public_v1(owner_id,c2);
 perform pg_temp.assert_social(row->>'displayName'='Realm Hero','social name exposed on public profile');
 perform pg_temp.assert_social(row#>>'{character,name}'='Warden One','first character name');
 perform pg_temp.assert_social(row2#>>'{character,name}'='Shade Two','second character name');
 perform pg_temp.assert_social(jsonb_array_length(row->'characterChoices')=3,'three-character gallery');
 perform pg_temp.assert_social(row->>'favoriteSkillId'='mining'
    and row2->>'favoriteSkillId' is null,'showcase preferences stay separate');
 row:=public.profile_character_gear_v1(owner_id,c2);
 perform pg_temp.assert_social(row->>'characterId'=c2::text,'gear uses selected hero not featured hero');
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.profile_extension_update_v43('private',false,c2,'Private bio',null,null,
  '{}'::text[],'[]'::jsonb,'{}'::text[],'{}'::text[]);
 perform set_config('request.jwt.claim.sub',viewer_id::text,true);
 perform pg_temp.assert_social(public.profile_character_public_v1(owner_id,c1) is null,'private gallery blocked');
 perform pg_temp.assert_social(public.profile_character_gear_v1(owner_id,c1) is null,'private gear blocked');
end $qa$;
select 'PASS: account social name, cooldown, three characters, independent showcases and privacy' as result;
rollback;
