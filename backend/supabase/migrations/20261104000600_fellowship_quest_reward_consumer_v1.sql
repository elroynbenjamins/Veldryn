-- Fellowship / Guild Quests: authoritative Guild Activity award consumer.
-- All four outstanding nodes remain unreleased. This migration wires only
-- fellowship_quests; a separate sign-off will set its is_released flag.
-- Reward units are snapshotted in guild_quest_completions on first claim.
-- Every subsequent read displays those immutable units, even after rank changes.

create or replace function private.guild_skill_apply_bonus_units_v1(
 p_units integer,p_bps integer
) returns integer
language sql immutable security invoker set search_path=''
as $bonus$
 select greatest(0,floor(
  greatest(0,coalesce(p_units,0))::numeric
  *(10000+least(1000,greatest(0,coalesce(p_bps,0)))) / 10000 + 0.5
 )::integer);
$bonus$;
revoke all on function private.guild_skill_apply_bonus_units_v1(integer,integer)
 from public,anon,authenticated;
grant execute on function private.guild_skill_apply_bonus_units_v1(integer,integer) to service_role;

create or replace function public.guild_quest_reward_units_server_v1(
 p_guild_id uuid,p_rarity text
) returns integer
language sql stable security invoker set search_path=''
as $guild_quest_bonus$
 select private.guild_skill_apply_bonus_units_v1(
  public.guild_quest_rarity_reward_v3(p_rarity),
  coalesce((
   select least(a.rank,c.max_rank)*c.bonus_per_rank*100
   from public.guild_skill_allocations a
   join public.guild_skill_catalogue_v1 c on c.skill_id=a.skill_id
   where a.guild_id=p_guild_id and a.skill_id='fellowship_quests'
     and c.is_released and a.rank between 1 and c.max_rank
  ),0)
 );
$guild_quest_bonus$;
revoke all on function public.guild_quest_reward_units_server_v1(uuid,text)
 from public,anon,authenticated;
grant execute on function public.guild_quest_reward_units_server_v1(uuid,text)
 to service_role;

-- Integrate with BOTH immutable grant paths: two foundation objectives and
-- the weekly board's individual objective paths. In both cases the completion
-- record and the Guild Activity award receive the same server-calculated units.
-- Retain all current guild membership and session authorization checks.
do $patch_fellowship_quests$
declare
 v_old text := 'public.guild_quest_rarity_reward_v3(rr)';
 v_new text := 'public.guild_quest_reward_units_server_v1(gid,rr)';
 v_src text;
 v_next text;
 v_count integer;
begin
 select pg_get_functiondef('public.guild_quest_state_v1()'::regprocedure)
 into v_src;
 if position(v_new in v_src)>0 then
  raise notice 'Guild Quest reward consumer already connected';
  return;
 end if;
 v_count:=(length(v_src)-length(replace(v_src,v_old,'')))/length(v_old);
 if v_count<>6 then
  raise exception 'guild_quest_reward_consumer_source_mismatch: % references',v_count;
 end if;
 -- On subsequent views, report the originally credited immutable completion
 -- amount, not a hypothetical amount changed by later Guild Skill upgrades.
 v_next:=replace(v_src,
  $old_foundation$'[]'::jsonb,public.guild_quest_rarity_reward_v3(rr),$old_foundation$,
  $new_foundation$'[]'::jsonb,coalesce((select c.activity_units from public.guild_quest_completions c where c.guild_id=gid and c.week_key=wk and c.quest_key=b.source_key||':'||rr),public.guild_quest_reward_units_server_v1(gid,rr)),$new_foundation$
 );
 if v_next=v_src then raise exception 'guild_quest_foundation_return_pattern_missing';end if;
 v_src:=v_next;
 v_next:=replace(v_src,
  $old_objective$totalp,totalt,prog,public.guild_quest_rarity_reward_v3(rr),$old_objective$,
  $new_objective$totalp,totalt,prog,coalesce((select c.activity_units from public.guild_quest_completions c where c.guild_id=gid and c.week_key=wk and c.quest_key=b.source_key||':'||rr),public.guild_quest_reward_units_server_v1(gid,rr)),$new_objective$
 );
 if v_next=v_src then raise exception 'guild_quest_objective_return_pattern_missing';end if;
 v_src:=replace(v_next,v_old,v_new);
 if position(v_old in v_src)>0 then raise exception 'guild_quest_unpatched_reward_reference';end if;
 execute v_src;
end
$patch_fellowship_quests$;

-- Safety: no automatic node release; already-earned reward units are unchanged.
do $guild_quest_math_contract$
begin
 if private.guild_skill_apply_bonus_units_v1(25,0)<>25
 or private.guild_skill_apply_bonus_units_v1(25,200)<>26
 or private.guild_skill_apply_bonus_units_v1(60,400)<>62
 or private.guild_skill_apply_bonus_units_v1(135,600)<>143
 then raise exception 'guild_quest_bonus_rounding_contract_failed';end if;
 if (select is_released from public.guild_skill_catalogue_v1
     where skill_id='fellowship_quests')
 then raise exception 'fellowship_quests_must_stay_locked_until_staging_signoff';end if;
end
$guild_quest_math_contract$;
