-- Run against a disposable local database after all migrations. Fixtures roll back.
begin;
create function pg_temp.assert_badge(value boolean,message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'BADGE FAIL: %',message;end if;end $$;
do $$
declare supporter uuid:=gen_random_uuid();staff uuid:=gen_random_uuid();viewer uuid:=gen_random_uuid();projection jsonb;expiry timestamptz:=now()+interval '30 seconds';
begin
 insert into auth.users(id,email,raw_user_meta_data) values
 (supporter,'badge-'||supporter||'@example.invalid','{}'),
 (staff,'badge-'||staff||'@example.invalid','{}'),
 (viewer,'badge-'||viewer||'@example.invalid','{"role":"admin","supporter":true}');
 insert into private.account_commerce_entitlements_v1(account_id,supporter_active,supporter_expires_at) values(supporter,true,expiry);
 insert into private.player_staff_badges_v1(account_id,role) values(staff,'moderator');
 perform set_config('request.jwt.claim.sub',viewer::text,true);
 select player_badges into projection from public.guild_identities_v2(array[viewer]);
 perform pg_temp.assert_badge(projection->>'staff' is null and (projection->>'supporter')::boolean=false,'user metadata cannot forge roles or Supporter');
 select player_badges into projection from public.guild_identities_v2(array[supporter]);
 perform pg_temp.assert_badge((projection->>'supporter')::boolean,'active Supporter is visible by default');
 perform pg_temp.assert_badge((projection->>'validUntilMs')::bigint<=floor(extract(epoch from expiry)*1000)::bigint,'badge cache never exceeds subscription expiry');
 perform pg_temp.assert_badge(private.player_badges_v1(staff)->>'staff'='moderator','moderator badge comes from server assignment');
 insert into public.liveops_admin_users(account_id,role,enabled) values(staff,'owner',true);
 perform pg_temp.assert_badge(private.player_badges_v1(staff)->>'staff'='admin','owner has Admin precedence');
 update public.liveops_admin_users set enabled=false where account_id=staff;
 update private.player_staff_badges_v1 set enabled=false where account_id=staff;
 perform pg_temp.assert_badge(private.player_badges_v1(staff)->>'staff' is null,'revoked roles are removed');
 perform set_config('request.jwt.claim.sub',supporter::text,true);
 projection:=public.update_player_badge_preferences_v1(false);
 perform pg_temp.assert_badge((projection#>>'{identity,supporter}')::boolean=false and (projection->>'supporterAvailable')::boolean,'hiding does not revoke entitlement');
 perform set_config('request.jwt.claim.sub',viewer::text,true);
 select player_badges into projection from public.guild_identities_v2(array[supporter]);
 perform pg_temp.assert_badge((projection->>'supporter')::boolean=false,'other viewers respect hidden Supporter');
 perform public.update_player_badge_preferences_v1(true);
 perform pg_temp.assert_badge(not (select show_supporter from private.player_badge_preferences_v1 where account_id=supporter),'visibility write only changes authenticated account');
 perform set_config('request.jwt.claim.sub',supporter::text,true);
 perform public.update_player_badge_preferences_v1(true);
 update private.account_commerce_entitlements_v1 set supporter_expires_at=now()-interval '1 second' where account_id=supporter;
 perform pg_temp.assert_badge(not (private.player_badges_v1(supporter)->>'supporter')::boolean,'expired Supporter is hidden');
 perform pg_temp.assert_badge((select show_supporter from private.player_badge_preferences_v1 where account_id=supporter),'expiry preserves preference');
 perform pg_temp.assert_badge(not has_table_privilege('authenticated','private.player_staff_badges_v1','INSERT'),'clients cannot assign staff');
 perform pg_temp.assert_badge(not has_table_privilege('authenticated','private.player_badge_preferences_v1','UPDATE'),'clients cannot bypass preference RPC');
 perform pg_temp.assert_badge(not has_function_privilege('anon','public.guild_identities_v2(uuid[])','EXECUTE'),'anonymous role cannot enumerate badges');
 perform pg_temp.assert_badge(not has_function_privilege('authenticated','public.rankings_board_server_v2(uuid,text,integer,integer)','EXECUTE'),'rankings projection stays service-only');
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.player_badge_self_v1();raise exception 'unauthenticated call accepted';exception when others then if sqlerrm<>'AUTH_REQUIRED' then raise;end if;end;
end $$;
select 'PASS: authoritative badges, expiry, visibility, staff precedence and grants' result;
rollback;
