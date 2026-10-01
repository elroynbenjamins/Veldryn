begin;

create table private.player_staff_badges_v1(
 account_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','moderator')),
 enabled boolean not null default true
);
create table private.player_badge_preferences_v1(
 account_id uuid primary key references auth.users(id) on delete cascade,
 show_supporter boolean not null default true
);
alter table private.player_staff_badges_v1 enable row level security;
alter table private.player_badge_preferences_v1 enable row level security;
revoke all on private.player_staff_badges_v1,private.player_badge_preferences_v1 from public,anon,authenticated;
grant select,insert,update,delete on private.player_staff_badges_v1,private.player_badge_preferences_v1 to service_role;
comment on table private.player_staff_badges_v1 is 'Server-managed public staff identity only; does not grant any moderation or administrator permissions. Existing enabled control-center owners display Admin automatically.';

-- PL/pgSQL keeps this migration compatible with the later-dated commerce migration.
-- Until commerce is installed, Supporter safely resolves to false.
create function private.player_badges_v1(p_account_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_staff text;v_supporter boolean:=false;v_show boolean:=true;v_exp timestamptz;v_until timestamptz:=now()+interval '120 seconds';
begin
 select role into v_staff from private.player_staff_badges_v1 where account_id=p_account_id and enabled;
 if exists(select 1 from public.liveops_admin_users where account_id=p_account_id and enabled and role='owner') then v_staff:='admin';end if;
 if to_regprocedure('private.commerce_entitlements_v1(uuid)') is not null then
  select supporter into v_supporter from private.commerce_entitlements_v1(p_account_id);
  select supporter_expires_at into v_exp from private.account_commerce_entitlements_v1 where account_id=p_account_id;
 end if;
 select coalesce((select show_supporter from private.player_badge_preferences_v1 where account_id=p_account_id),true) into v_show;
 if v_supporter and v_show and v_exp is not null then v_until:=least(v_until,v_exp);end if;
 return jsonb_build_object('staff',v_staff,'supporter',coalesce(v_supporter,false) and v_show,'validUntilMs',floor(extract(epoch from v_until)*1000)::bigint);
end $$;
revoke all on function private.player_badges_v1(uuid) from public,anon,authenticated;
grant execute on function private.player_badges_v1(uuid) to service_role;

create function public.guild_identities_v2(p_account_ids uuid[])
returns table(account_id uuid,guild_tag text,guild_tag_color_id text,player_name_style jsonb,player_badges jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if coalesce(cardinality(p_account_ids),0)>100 then raise exception 'TOO_MANY_IDENTITIES';end if;
 return query select b.account_id,b.guild_tag,b.guild_tag_color_id,to_jsonb(b)->'player_name_style',private.player_badges_v1(b.account_id)
 from public.guild_identities(array(select distinct id from unnest(p_account_ids) id where id is not null)) b;
end $$;

create function public.player_badge_self_v1() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_available boolean:=false;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if to_regprocedure('private.commerce_entitlements_v1(uuid)') is not null then
  select supporter into v_available from private.commerce_entitlements_v1(v_uid);
 end if;
 return jsonb_build_object('identity',private.player_badges_v1(v_uid),'showSupporter',coalesce((select show_supporter from private.player_badge_preferences_v1 where account_id=v_uid),true),'supporterAvailable',coalesce(v_available,false));
end $$;

create function public.update_player_badge_preferences_v1(p_show_supporter boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_show_supporter is null then raise exception 'INVALID_BADGE_PREFERENCE';end if;
 insert into private.player_badge_preferences_v1(account_id,show_supporter) values(v_uid,p_show_supporter)
 on conflict(account_id) do update set show_supporter=excluded.show_supporter;
 return public.player_badge_self_v1();
end $$;

revoke all on function public.guild_identities_v2(uuid[]),public.player_badge_self_v1(),public.update_player_badge_preferences_v1(boolean) from public,anon,authenticated;
grant execute on function public.guild_identities_v2(uuid[]),public.player_badge_self_v1(),public.update_player_badge_preferences_v1(boolean) to authenticated;

create or replace function public.rankings_board_server_v2(
  p_requester uuid, p_board text, p_limit integer default 50, p_offset integer default 0
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_rows jsonb := '[]'::jsonb; v_title text; v_description text; v_unit text; v_season text;
begin
  if p_requester is null or p_board is null or p_limit not between 1 and 100 or p_offset not between 0 and 10000 then raise exception 'INVALID_RANKING_REQUEST'; end if;
  if p_board not in ('profession_total','mining','woodcutting','fishing','smithing','cooking','herbalism','alchemy','hunting','exploration','tailoring','enchanting','faith','arena_rating','arena_wins','dungeon_tier','dungeon_clears','achievement_score','guild') then raise exception 'INVALID_RANKING_BOARD'; end if;
  select case when p_board='profession_total' then 'Profession Total' when p_board='arena_rating' then 'Arena Rating' when p_board='arena_wins' then 'Arena Wins' when p_board='guild' then 'Guild Prestige' else initcap(replace(p_board,'_',' ')) end,
         case when p_board='profession_total' then 'Combined server-tracked profession levels across the account.' when p_board like 'arena_%' then 'Current Arena-season prestige.' when p_board='guild' then 'Guild level and contribution prestige.' else 'Server-calculated prestige board.' end,
         case when p_board like 'arena_rating' then 'rating' when p_board like 'arena_wins' then 'wins' when p_board like 'dungeon_%' then case when p_board='dungeon_tier' then 'tier' else 'clears' end when p_board='achievement_score' then 'points' when p_board='guild' then 'level' when p_board='profession_total' then 'levels' else 'level' end
    into v_title,v_description,v_unit;
  if p_board='profession_total' then
    with totals as (select c.account_id,sum(public.ranking_skill_level_from_xp_v1(s.xp)) value from public.characters c join public.character_skills s on s.character_id=c.id group by c.account_id)
    select coalesce(jsonb_agg(jsonb_build_object('rank',row_number,'entityType','account','displayName',display_name,'guildTag',guild_tag,'guildTagColorId',guild_tag_color_id,'value',value,'playerBadges',private.player_badges_v1(account_id),'isSelf',account_id=p_requester) order by value desc,display_name), '[]'::jsonb) into v_rows
    from (select row_number() over(order by t.value desc,coalesce(nullif(pp.display_name,''),'Adventurer')) row_number, t.account_id,t.value,coalesce(nullif(pp.display_name,''),'Adventurer') display_name,g.tag guild_tag,g.tag_color_id guild_tag_color_id from totals t join public.player_profiles pp on pp.account_id=t.account_id left join public.guild_members gm on gm.account_id=t.account_id left join public.guilds g on g.id=gm.guild_id where pp.profile_visibility='public' and not exists(select 1 from public.player_blocks b where (b.blocker_id=p_requester and b.blocked_id=t.account_id) or (b.blocker_id=t.account_id and b.blocked_id=p_requester)) order by t.value desc,display_name limit p_limit offset p_offset) q;
  elsif p_board in ('arena_rating','arena_wins') then
    select coalesce((select id from public.squad_arena_seasons where starts_at<=now() and ends_at>now() order by starts_at desc limit 1),'') into v_season;
    if v_season<>'' then
      execute format('select coalesce(jsonb_agg(jsonb_build_object(''rank'',row_number,''entityType'',''account'',''displayName'',display_name,''guildTag'',guild_tag,''guildTagColorId'',guild_tag_color_id,''value'',value,''playerBadges'',private.player_badges_v1(account_id),''isSelf'',account_id=$1) order by value desc,display_name),''[]''::jsonb) from (select row_number() over(order by a.%I desc,coalesce(nullif(pp.display_name,''''),''Adventurer'')) row_number,a.account_id,a.%I value,coalesce(nullif(pp.display_name,''''),''Adventurer'') display_name,g.tag guild_tag,g.tag_color_id guild_tag_color_id from public.squad_arena_season_accounts a join public.player_profiles pp on pp.account_id=a.account_id left join public.guild_members gm on gm.account_id=a.account_id left join public.guilds g on g.id=gm.guild_id where a.season_id=$2 and pp.profile_visibility=''public'' and not exists(select 1 from public.player_blocks b where (b.blocker_id=$1 and b.blocked_id=a.account_id) or (b.blocked_id=$1 and b.blocker_id=a.account_id)) order by a.%I desc,display_name limit $3 offset $4) q',case when p_board='arena_wins' then 'wins' else 'rating' end,case when p_board='arena_wins' then 'wins' else 'rating' end,case when p_board='arena_wins' then 'wins' else 'rating' end) using p_requester,v_season,p_limit,p_offset into v_rows;
    end if;
  elsif p_board='guild' then
    select coalesce(jsonb_agg(jsonb_build_object('rank',row_number,'entityType','guild','displayName',name,'guildTag',tag,'guildTagColorId',tag_color_id,'value',level,'secondaryValue',xp,'isSelf',false) order by level desc,xp desc,name), '[]'::jsonb) into v_rows from (select row_number() over(order by g.level desc,g.xp desc,g.name) row_number,g.name,g.tag,g.tag_color_id,g.level,g.xp from public.guilds g order by g.level desc,g.xp desc,g.name limit p_limit offset p_offset) q;
  end if;
  return jsonb_build_object('board',p_board,'title',v_title,'description',v_description,'unit',v_unit,'prestigeOnly',true,'seasonId',nullif(v_season,''),'generatedAtMs',floor(extract(epoch from clock_timestamp())*1000)::bigint,'entries',v_rows);
end $$;

revoke all on function public.rankings_board_server_v2(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.rankings_board_server_v2(uuid,text,integer,integer) to service_role;

commit;
