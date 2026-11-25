-- Rollback-only staging QA. Never execute on production.
begin;
do $qa$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); g uuid:=gen_random_uuid(); h uuid:=gen_random_uuid(); n bigint; p int; r record; ids text[];
begin
 insert into auth.users(id,aud,role) values(a,'authenticated','authenticated'),(b,'authenticated','authenticated');
 insert into public.guilds(id,name,owner_account_id) values(g,'Winterqa'||translate(substr(g::text,1,8),'0123456789','abcdefghij'),a),(h,'Winterqb'||translate(substr(h::text,1,8),'0123456789','abcdefghij'),b);
 insert into public.guild_members(guild_id,account_id,role) values(g,a,'leader'),(h,b,'leader') on conflict do nothing;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','is_anonymous',false)::text,true);
 select public.guild_frostfall_cosmetic_releases_v1() into ids;
 if cardinality(ids)<>0 then raise exception 'release gate not off';end if;
 begin
  perform public.update_guild_appearance_with_frostfall_v1('banner_frostfall_standard_2026','classic','name_ivory','tag_silver','classic','Together.','plain');
  raise exception 'unexpected success';
 exception when others then if sqlerrm<>'GUILD_EVENT_COSMETIC_LOCKED_OR_WRONG_SLOT' then raise;end if;end;
 insert into public.guild_winter_hearth_2026_projects(guild_id,logs,lights) values(g,25000,2500);
 foreach p in array array[25,50,75,100] loop
  insert into public.guild_winter_hearth_2026_milestones(guild_id,percent,guild_gold) values(g,p,case p when 25 then 10000 when 50 then 20000 when 75 then 30000 else 50000 end);
 end loop;
 begin
  perform public.update_guild_appearance_with_frostfall_v1('banner_frostfall_standard_2026','classic','name_ivory','tag_silver','classic','Together.','plain');
  raise exception 'unexpected success';
 exception when others then if sqlerrm<>'GUILD_EVENT_COSMETIC_LOCKED_OR_WRONG_SLOT' then raise;end if;end;
 update private.guild_event_cosmetic_catalog set released=true where event_id='EVT_ANNUAL_012_2026';
 -- Existing hall progression remains authoritative for colors.
 begin
  perform public.update_guild_appearance_with_frostfall_v1('world_tree_green','classic','name_frostfall_aurora_2026','tag_silver','classic','Together.','plain');
  raise exception 'unexpected success';
 exception when others then if sqlerrm<>'guild_hall_color_edit_locked' then raise;end if;end;
 insert into public.guild_construction_unlocks(guild_id,unlock_id,template_id) values(g,'guild_construction_hall_1','construction_hall_1');
 select revision into n from public.guild_appearance where guild_id=g;
 select * into r from public.update_guild_appearance_with_frostfall_v1('banner_frostfall_standard_2026','border_frostfall_frozen_majesty_2026','name_frostfall_aurora_2026','tag_silver','classic','Together.','background_frostfall_winter_aurora_2026');
 if r.guild_id<>g or r.banner_id<>'banner_frostfall_standard_2026' or r.border_id<>'border_frostfall_frozen_majesty_2026' or r.name_color_id<>'name_frostfall_aurora_2026' or r.background_id<>'background_frostfall_winter_aurora_2026' or r.revision<>n+1 then raise exception 'bad equip receipt';end if;
 if not exists(select 1 from public.guild_appearance where guild_id=g and banner_id=r.banner_id and border_id=r.border_id and name_color_id=r.name_color_id and background_id=r.background_id) then raise exception 'projection mismatch';end if;
 if (select count(*) from public.guild_cosmetic_unlocks where guild_id=g and source_ref='EVT_ANNUAL_012_2026')<>4 then raise exception 'ownership mismatch';end if;
 select event_cosmetic_ids into ids from public.guild_appearance_entitlements_v4();
 if not ('name_frostfall_aurora_2026'=any(ids)) then raise exception 'entitlement read mismatch';end if;
 begin
  perform public.update_guild_appearance_with_frostfall_v1('background_frostfall_winter_aurora_2026','classic','name_ivory','tag_silver','classic','Together.','plain');
  raise exception 'unexpected success';
 exception when others then if sqlerrm<>'GUILD_EVENT_COSMETIC_LOCKED_OR_WRONG_SLOT' then raise;end if;end;
 -- Unequip all without revoking ownership.
 perform public.update_guild_appearance_with_background_v3('world_tree_green','classic','name_ivory','tag_silver','classic','Together.','plain');
 if (select count(*) from public.guild_cosmetic_unlocks where guild_id=g and source_ref='EVT_ANNUAL_012_2026')<>4 then raise exception 'unequip revoked ownership';end if;
 update public.guild_members set role='member' where guild_id=g and account_id=a;
 begin
  perform public.update_guild_appearance_with_frostfall_v1('banner_frostfall_standard_2026','classic','name_ivory','tag_silver','classic','Together.','plain');
  raise exception 'unexpected success';
 exception when others then if sqlerrm<>'GUILD_OFFICER_REQUIRED' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','is_anonymous',false)::text,true);
 begin
  perform public.update_guild_appearance_with_frostfall_v1('banner_frostfall_standard_2026','classic','name_ivory','tag_silver','classic','Together.','plain');
  raise exception 'unexpected success';
 exception when others then if sqlerrm<>'GUILD_EVENT_COSMETIC_LOCKED_OR_WRONG_SLOT' then raise;end if;end;
end $qa$;
select 'PASS: release, ownership, all slots, Hall gate, role, wrong guild/slot, unequip, projection and revision' as result;
rollback;