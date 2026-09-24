-- Run with `supabase db query --linked --file supabase/tests/profile_v43.sql`.
-- Fixtures are rolled back and exercise the authenticated public-profile RPC.
begin;
create or replace function pg_temp.assert_profile(value boolean,message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'PROFILE V43 FAIL: %',message; end if; end $$;
do $$
declare owner_id uuid:=gen_random_uuid(); viewer_id uuid:=gen_random_uuid(); outsider_id uuid:=gen_random_uuid(); guild_id uuid:=gen_random_uuid(); owner_character uuid:=gen_random_uuid(); profile jsonb;
begin
 insert into auth.users(id,email) values(owner_id,'profile-owner-'||owner_id||'@example.invalid'),(viewer_id,'profile-viewer-'||viewer_id||'@example.invalid'),(outsider_id,'profile-outsider-'||outsider_id||'@example.invalid');
 insert into public.characters(id,account_id,name,class_id) values(owner_character,owner_id,'Profile Owner','WAYFINDER'),(gen_random_uuid(),viewer_id,'Profile Viewer','IRONWARDEN'),(gen_random_uuid(),outsider_id,'Profile Outsider','DAWNKEEPER');

 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.profile_extension_update_v43('private',false,owner_character,'  Private'||chr(9)||' profile  ',null,null,'{}','[]','{}','{}');
 perform set_config('request.jwt.claim.sub',viewer_id::text,true);
 profile:=public.profile_public_v43(owner_id);
 perform pg_temp.assert_profile(profile is null,'private profile stays hidden from unrelated player');

 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.profile_extension_update_v43('guild',false,owner_character,'Guild profile',null,null,'{}','[]','{}','{}');
 insert into public.guilds(id,name,owner_account_id) values(guild_id,'Profile Test Guild',owner_id);
 insert into public.guild_members(guild_id,account_id,role) values(guild_id,owner_id,'leader'),(guild_id,viewer_id,'member');
 perform set_config('request.jwt.claim.sub',viewer_id::text,true);
 profile:=public.profile_public_v43(owner_id);
 perform pg_temp.assert_profile(profile->>'bio'='Guild profile','shared Guild member can view Guild profile');
 perform pg_temp.assert_profile(profile#>>'{character,id}'=owner_character::text,'profile uses selected owned character');

 perform set_config('request.jwt.claim.sub',outsider_id::text,true);
 profile:=public.profile_public_v43(owner_id);
 perform pg_temp.assert_profile(profile is null,'Guild profile stays hidden from outsider');
 perform set_config('request.jwt.claim.sub',viewer_id::text,true);
 insert into public.player_blocks(blocker_id,blocked_id) values(viewer_id,owner_id);
 profile:=public.profile_public_v43(owner_id);
 perform pg_temp.assert_profile(profile is null,'mutual social block hides otherwise visible profile');
end $$;
select 'PASS: Profile V43 privacy, Guild visibility, selected character and block suppression' result;
rollback;
