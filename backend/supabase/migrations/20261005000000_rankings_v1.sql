-- VELDRYN v6 Pass 6: server-authoritative, prestige-only rankings.
-- The RPC is service-role only; callers receive display projections, never account ids.
alter table public.player_profiles add column if not exists profile_visibility text not null default 'public';
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.player_profiles'::regclass and conname='player_profiles_visibility_check') then
    alter table public.player_profiles add constraint player_profiles_visibility_check check (profile_visibility in ('public','friends','private'));
  end if;
end $$;

create or replace function public.ranking_skill_level_from_xp_v1(p_xp bigint)
returns integer language sql immutable parallel safe as $$
  select greatest(1, least(999, floor(sqrt(greatest(0, coalesce(p_xp,0))::numeric / 100)::numeric)::integer + 1))
$$;

create or replace function public.rankings_board_server_v1(
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
    select coalesce(jsonb_agg(jsonb_build_object('rank',row_number,'entityType','account','displayName',display_name,'guildTag',guild_tag,'guildTagColorId',guild_tag_color_id,'value',value,'isSelf',account_id=p_requester) order by value desc,display_name), '[]'::jsonb) into v_rows
    from (select row_number() over(order by t.value desc,coalesce(nullif(pp.display_name,''),'Adventurer')) row_number, t.account_id,t.value,coalesce(nullif(pp.display_name,''),'Adventurer') display_name,g.tag guild_tag,g.tag_color_id guild_tag_color_id from totals t join public.player_profiles pp on pp.account_id=t.account_id left join public.guild_members gm on gm.account_id=t.account_id left join public.guilds g on g.id=gm.guild_id where pp.profile_visibility='public' and not exists(select 1 from public.player_blocks b where (b.blocker_id=p_requester and b.blocked_id=t.account_id) or (b.blocker_id=t.account_id and b.blocked_id=p_requester)) order by t.value desc,display_name limit p_limit offset p_offset) q;
  elsif p_board in ('arena_rating','arena_wins') then
    select coalesce((select id from public.squad_arena_seasons where starts_at<=now() and ends_at>now() order by starts_at desc limit 1),'') into v_season;
    if v_season<>'' then
      execute format('select coalesce(jsonb_agg(jsonb_build_object(''rank'',row_number,''entityType'',''account'',''displayName'',display_name,''guildTag'',guild_tag,''guildTagColorId'',guild_tag_color_id,''value'',value,''isSelf'',account_id=$1) order by value desc,display_name),''[]''::jsonb) from (select row_number() over(order by a.%I desc,coalesce(nullif(pp.display_name,''''),''Adventurer'')) row_number,a.account_id,a.%I value,coalesce(nullif(pp.display_name,''''),''Adventurer'') display_name,g.tag guild_tag,g.tag_color_id guild_tag_color_id from public.squad_arena_season_accounts a join public.player_profiles pp on pp.account_id=a.account_id left join public.guild_members gm on gm.account_id=a.account_id left join public.guilds g on g.id=gm.guild_id where a.season_id=$2 and pp.profile_visibility=''public'' and not exists(select 1 from public.player_blocks b where (b.blocker_id=$1 and b.blocked_id=a.account_id) or (b.blocked_id=$1 and b.blocker_id=a.account_id)) order by a.%I desc,display_name limit $3 offset $4) q',case when p_board='arena_wins' then 'wins' else 'rating' end,case when p_board='arena_wins' then 'wins' else 'rating' end,case when p_board='arena_wins' then 'wins' else 'rating' end) using p_requester,v_season,p_limit,p_offset into v_rows;
    end if;
  elsif p_board='guild' then
    select coalesce(jsonb_agg(jsonb_build_object('rank',row_number,'entityType','guild','displayName',name,'guildTag',tag,'guildTagColorId',tag_color_id,'value',level,'secondaryValue',xp,'isSelf',false) order by level desc,xp desc,name), '[]'::jsonb) into v_rows from (select row_number() over(order by g.level desc,g.xp desc,g.name) row_number,g.name,g.tag,g.tag_color_id,g.level,g.xp from public.guilds g order by g.level desc,g.xp desc,g.name limit p_limit offset p_offset) q;
  end if;
  return jsonb_build_object('board',p_board,'title',v_title,'description',v_description,'unit',v_unit,'prestigeOnly',true,'seasonId',nullif(v_season,''),'generatedAtMs',floor(extract(epoch from clock_timestamp())*1000)::bigint,'entries',v_rows);
end $$;
revoke all on function public.rankings_board_server_v1(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.rankings_board_server_v1(uuid,text,integer,integer) to service_role;
revoke all on function public.ranking_skill_level_from_xp_v1(bigint) from public,anon,authenticated;
grant execute on function public.ranking_skill_level_from_xp_v1(bigint) to service_role;
