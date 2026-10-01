-- Disposable test database only. All fixture changes roll back.
begin;
create function pg_temp.assert_background(value boolean,message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'BACKGROUND FAIL: %',message;end if;end $$;
do $$
declare gid uuid:='00000000-0000-0000-0000-000000000201';uid uuid:='00000000-0000-0000-0000-000000000101';row record;before_revision bigint;
begin
 -- The isolated runner creates this leader/guild through schema fixtures.
 perform set_config('request.jwt.claim.sub',uid::text,true);
 select * into row from public.update_guild_appearance_with_background_v1('world_tree_green','classic','name_ivory','tag_silver','classic','Together.','guild_plaza');
 perform pg_temp.assert_background(row.background_id='guild_plaza','default background round trip');
 perform pg_temp.assert_background((select background_id='guild_plaza' from public.guild_appearance where guild_id=gid),'appearance projection persists');
 before_revision:=row.revision;
 begin perform public.update_guild_appearance_with_background_v1('world_tree_green','classic','name_ivory','tag_silver','classic','Together.','forest_sanctum');raise exception 'accepted locked background';exception when others then if sqlerrm<>'GUILD_BACKGROUND_LOCKED' then raise;end if;end;
 perform pg_temp.assert_background((select revision=before_revision from public.guild_appearance where guild_id=gid),'failed save does not increment revision');
 begin perform public.update_guild_appearance_with_background_v1('world_tree_green','classic','name_ivory','tag_silver','classic','Together.',null);raise exception 'accepted null';exception when others then if sqlerrm<>'INVALID_GUILD_BACKGROUND' then raise;end if;end;
 begin perform public.update_guild_appearance_with_background_v1('world_tree_green','classic','name_ivory','tag_silver','classic','Together.','unknown');raise exception 'accepted unknown';exception when others then if sqlerrm<>'INVALID_GUILD_BACKGROUND' then raise;end if;end;
 update public.guilds set level=10 where id=gid;
 select * into row from public.update_guild_appearance_with_background_v1('world_tree_green','silver_fellowship','name_emerald','tag_emerald','classic','Together.','forest_sanctum');
 perform pg_temp.assert_background(row.background_id='forest_sanctum' and row.revision=before_revision+1,'level 10 unlock and one revision increment');
 perform public.update_guild_appearance_v52('world_tree_green','classic','name_ivory','tag_silver','classic','Old client.');
 perform pg_temp.assert_background((select background_id='forest_sanctum' from public.guilds where id=gid),'older client preserves background');
 begin perform public.update_guild_appearance_with_background_v1('world_tree_green','mythic_conqueror','name_ivory','tag_silver','classic','Together.','plain');raise exception 'bypassed border gate';exception when others then if sqlerrm<>'GUILD_BORDER_LOCKED' then raise;end if;end;
 perform pg_temp.assert_background((select background_id='forest_sanctum' from public.guilds where id=gid),'other failed cosmetic leaves background unchanged');
 update public.guild_members set role='member' where account_id=uid;
 begin perform public.update_guild_appearance_with_background_v1('world_tree_green','classic','name_ivory','tag_silver','classic','Together.','plain');raise exception 'member accepted';exception when others then if sqlerrm<>'GUILD_OFFICER_REQUIRED' then raise;end if;end;
 update public.guild_members set role='officer' where account_id=uid;
 perform public.update_guild_appearance_with_background_v1('world_tree_green','classic','name_ivory','tag_silver','classic','Together.','plain');
 perform set_config('request.jwt.claims','{"is_anonymous":true}',true);
 begin perform public.update_guild_appearance_with_background_v1('world_tree_green','classic','name_ivory','tag_silver','classic','Together.','plain');raise exception 'guest accepted';exception when others then if sqlerrm<>'LINK_ACCOUNT_REQUIRED' then raise;end if;end;
 perform set_config('request.jwt.claims','{}',true);
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.update_guild_appearance_with_background_v1('world_tree_green','classic','name_ivory','tag_silver','classic','Together.','plain');raise exception 'unauthenticated accepted';exception when others then if sqlerrm<>'AUTH_REQUIRED' then raise;end if;end;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000199',true);
 begin perform public.update_guild_appearance_with_background_v1('world_tree_green','classic','name_ivory','tag_silver','classic','Together.','plain');raise exception 'outsider accepted';exception when others then if sqlerrm<>'NOT_IN_GUILD' then raise;end if;end;
 perform pg_temp.assert_background(not has_function_privilege('anon','public.update_guild_appearance_with_background_v1(text,text,text,text,text,text,text)','EXECUTE'),'anon cannot execute');
 perform pg_temp.assert_background(has_function_privilege('authenticated','public.update_guild_appearance_with_background_v1(text,text,text,text,text,text,text)','EXECUTE'),'authenticated can execute');
 perform pg_temp.assert_background(not has_table_privilege('authenticated','public.guild_appearance','UPDATE'),'no direct appearance writes');
end $$;
select 'PASS: guild background persistence, unlocks, permissions, atomicity and old callers' result;
rollback;
