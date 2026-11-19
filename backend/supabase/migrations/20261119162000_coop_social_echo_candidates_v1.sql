-- Dedicated friend/guild Echo candidate browser.
-- Consent is the existing voluntary Echo publication. No raw equipment,
-- skills, private friend lists or unshared character data are disclosed.
begin;
create or replace function public.coop_social_echo_candidates_server_v1(
 p_actor_account_id uuid,p_min_level integer
) returns jsonb
language sql stable security definer
set search_path=''
as $function$
 with candidates as (
  select distinct on (e.id)
   e.id as profile_id,c.id as character_id,c.account_id,c.name,c.class_id,
   e.role,e.synced_level,
   coalesce((e.loadout_snapshot->>'combatPower')::numeric,0) as combat_power,
   exists(select 1 from public.friendships f
    where (f.account_a=p_actor_account_id and f.account_b=c.account_id)
       or (f.account_b=p_actor_account_id and f.account_a=c.account_id)) as is_friend,
   exists(select 1 from public.guild_members mine
    join public.guild_members other on other.guild_id=mine.guild_id
    where mine.account_id=p_actor_account_id and other.account_id=c.account_id) as is_guild
  from public.echo_profiles e
  join public.characters c on c.id=e.character_id
  where p_min_level between 1 and 100
    and c.account_id<>p_actor_account_id
    and e.opted_in and e.expires_at>now() and e.published_at>now()-interval '7 days'
    and e.content_version='online-coop-loadout-v1'
    and e.preferences->>'pipeline'='online_coop_v1'
    and e.synced_level>=p_min_level
    and coalesce((e.loadout_snapshot->>'combatPower')::numeric,0)>=2500
    and e.role in ('tank','damage','support')
    and not exists(select 1 from public.player_blocks block
     where (block.blocker_id=c.account_id and block.blocked_id=p_actor_account_id)
        or (block.blocked_id=c.account_id and block.blocker_id=p_actor_account_id))
 ), visible as (
  select * from candidates where is_friend or is_guild
  order by is_friend desc,is_guild desc,name,profile_id limit 64
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'profileId',profile_id::text,'characterId',character_id::text,'accountId',account_id::text,
  'name',name,'classId',class_id,'role',role,'level',synced_level,
  'combatPower',combat_power,
  'relationship',case when is_friend and is_guild then 'both' when is_friend then 'friend' else 'guild' end
 )),'[]'::jsonb) from visible;
$function$;
revoke all on function public.coop_social_echo_candidates_server_v1(uuid,integer) from public,anon,authenticated;
grant execute on function public.coop_social_echo_candidates_server_v1(uuid,integer) to service_role;
commit;
