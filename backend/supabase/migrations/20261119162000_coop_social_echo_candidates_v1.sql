-- Automatic friend/guild Echo recruitment source.
-- No publishing preference, manual opt-in or Echo expiration is needed for
-- discovery. Derive and freeze an actively saved character on the trusted
-- backend; the client receives ONLY a role/level/name summary.
-- SECURITY: this function exposes private game-state JSON and MUST remain
-- service-role only. It is never called directly by mobile clients.
begin;
create or replace function public.coop_social_echo_sources_server_v1(
 p_actor_account_id uuid,p_min_level integer
) returns jsonb
language sql stable security definer set search_path=''
as $function$
 with candidates as (
  select g.account_id,g.character_id,g.revision,g.state,
   exists(select 1 from public.friendships f
    where (f.account_a=p_actor_account_id and f.account_b=g.account_id)
       or (f.account_b=p_actor_account_id and f.account_a=g.account_id)) as is_friend,
   exists(select 1 from public.guild_members mine
    join public.guild_members other on other.guild_id=mine.guild_id
    where mine.account_id=p_actor_account_id and other.account_id=g.account_id) as is_guild,
   c.name
  from public.online_game_states g
  join public.characters c on c.id=g.character_id and c.account_id=g.account_id
  where p_actor_account_id is not null and p_min_level between 1 and 100
    and g.account_id<>p_actor_account_id
    and c.level>=p_min_level
    and g.state#>>'{character,id}'=c.id::text
    and not exists(select 1 from public.player_blocks block
      where (block.blocker_id=g.account_id and block.blocked_id=p_actor_account_id)
         or (block.blocked_id=g.account_id and block.blocker_id=p_actor_account_id))
 ), related as (
  select * from candidates where is_friend or is_guild
  order by is_friend desc,is_guild desc,name,character_id
  limit 64
 )
 select coalesce(jsonb_agg(jsonb_build_object(
   'accountId',account_id::text,'characterId',character_id::text,
   'revision',revision,'state',state,
   'relationship',case when is_friend and is_guild then 'both'
     when is_friend then 'friend' else 'guild' end
  )), '[]'::jsonb)
 from related;
$function$;
revoke all on function public.coop_social_echo_sources_server_v1(uuid,integer) from public,anon,authenticated;
grant execute on function public.coop_social_echo_sources_server_v1(uuid,integer) to service_role;

-- Existing random Echo fallback is now social-only as well. Strangers do not
-- automatically appear as player Echoes; NPCs fill remaining vacancies.
create or replace function public.eligible_online_coop_echoes_server_v1(
 p_actor_account_id uuid,p_min_level integer
) returns jsonb
language sql stable security definer set search_path=''
as $function$
 select coalesce(jsonb_agg(jsonb_build_object(
  'profileId',p.id,'sourceAccountId',p.account_id,'publishedAtMs',extract(epoch from p.published_at)*1000,
  'record',p.loadout_snapshot
 )),'[]'::jsonb)
 from (
   select e.*,c.account_id,
    row_number() over(partition by e.role order by e.published_at desc,e.id) as role_rank
   from public.echo_profiles e
   join public.characters c on c.id=e.character_id
   where e.opted_in and e.expires_at>now() and e.published_at>now()-interval '7 days'
    and e.content_version='online-coop-loadout-v1'
    and e.preferences->>'pipeline'='online_coop_v1'
    and e.synced_level>=p_min_level
    -- Friend/guild Echoes are level-gated; the host's Live CP gate is separate.
    -- Frozen loadout role/readiness and legal equipment are rechecked at run start.
    and c.account_id<>p_actor_account_id
    and (
      exists(select 1 from public.friendships f
       where (f.account_a=p_actor_account_id and f.account_b=c.account_id)
          or (f.account_b=p_actor_account_id and f.account_a=c.account_id))
      or exists(select 1 from public.guild_members mine
       join public.guild_members other on other.guild_id=mine.guild_id
       where mine.account_id=p_actor_account_id and other.account_id=c.account_id)
    )
    and not exists(select 1 from public.player_blocks bl
      where (bl.blocker_id=c.account_id and bl.blocked_id=p_actor_account_id)
         or (bl.blocked_id=c.account_id and bl.blocker_id=p_actor_account_id))
 ) p where p.role_rank<=128;
$function$;
revoke all on function public.eligible_online_coop_echoes_server_v1(uuid,integer) from public,anon,authenticated;
grant execute on function public.eligible_online_coop_echoes_server_v1(uuid,integer) to service_role;
-- A friendship/guild membership can change after the candidate list loads.
-- Enforce the social gate again within the actual run-start transaction.
-- The trigger affects only Echo seats, never human Live runs or NPC kits.
create or replace function public.coop_social_echo_member_guard_v1()
returns trigger
language plpgsql security invoker set search_path=''
as $function$
declare v_controller uuid;
begin
 if new.member_kind='echo' then
  select r.controller_account_id into v_controller
   from public.expedition_runs r
   where r.id=new.run_id and r.coop_mode='qmode';
  if v_controller is not null then
   if exists(select 1 from public.player_blocks b
      where (b.blocker_id=v_controller and b.blocked_id=new.account_id)
         or (b.blocked_id=v_controller and b.blocker_id=new.account_id))
      or not (
       exists(select 1 from public.friendships f
        where (f.account_a=v_controller and f.account_b=new.account_id)
           or (f.account_b=v_controller and f.account_a=new.account_id))
       or exists(select 1 from public.guild_members mine
        join public.guild_members other on other.guild_id=mine.guild_id
        where mine.account_id=v_controller and other.account_id=new.account_id)
      ) then
     raise exception 'social_echo_unavailable';
   end if;
  end if;
 end if;
 return new;
end;
$function$;
revoke all on function public.coop_social_echo_member_guard_v1() from public,anon,authenticated;
grant execute on function public.coop_social_echo_member_guard_v1() to service_role;
drop trigger if exists coop_social_echo_member_guard_v1 on public.expedition_run_members;
create trigger coop_social_echo_member_guard_v1
 before insert on public.expedition_run_members
 for each row execute function public.coop_social_echo_member_guard_v1();
commit;
