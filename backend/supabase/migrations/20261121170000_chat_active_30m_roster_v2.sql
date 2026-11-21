-- v2: recently-active account roster for the chat community list (30m rolling window).
-- Keep v1 (7m, "Online") untouched for older released clients.
-- Reuse authenticated server-authoritative foreground/client heartbeats.
-- Accounts (not characters) are counted; blocked relationships remain excluded.
create or replace function public.online_player_roster_v2()
returns jsonb
language sql stable security definer
set search_path = ''
as $function$
 with viewer as (
  select auth.uid() as account_id
 ), recent as (
  select p.account_id,max(p.last_seen_at) as last_seen_at
  from public.player_presence_5m p
  where p.bucket_start >= now() - interval '35 minutes'
    and p.last_seen_at >= now() - interval '30 minutes'
  group by p.account_id
 ), eligible as (
  select r.account_id,
    coalesce(nullif(c.name,''),nullif(profile.display_name,''),'Adventurer') as sender_name,
    greatest(1,c.level) as level,
    c.class_id,
    exists (
     select 1 from public.friendships f
     where (f.account_a=v.account_id and f.account_b=r.account_id)
        or (f.account_b=v.account_id and f.account_a=r.account_id)
    ) as is_friend,
    exists (
     select 1 from public.guild_members mine
     join public.guild_members theirs on theirs.guild_id=mine.guild_id
     where mine.account_id=v.account_id and theirs.account_id=r.account_id
    ) as is_guildmate
  from recent r
  cross join viewer v
  join public.player_profiles profile on profile.account_id=r.account_id
  join public.characters c on c.id=profile.active_character_id and c.account_id=r.account_id
  where v.account_id is not null
    and not exists (
     select 1 from public.player_blocks b
     where (b.blocker_id=v.account_id and b.blocked_id=r.account_id)
        or (b.blocker_id=r.account_id and b.blocked_id=v.account_id)
    )
 ), page as (
  select * from eligible
  order by is_friend desc,is_guildmate desc,lower(sender_name),account_id
  limit 250
 )
 select jsonb_build_object(
  'count',(select count(*) from eligible),
  'players',coalesce((
   select jsonb_agg(
    jsonb_build_object(
     'account_id',p.account_id,
     'sender_name',p.sender_name,
     'level',p.level,
     'class_id',p.class_id,
     'is_friend',p.is_friend,
     'is_guildmate',p.is_guildmate
    ) order by p.is_friend desc,p.is_guildmate desc,lower(p.sender_name),p.account_id
   ) from page p
  ),'[]'::jsonb)
 );
$function$;

revoke all on function public.online_player_roster_v2() from public, anon;
grant execute on function public.online_player_roster_v2() to authenticated;

comment on function public.online_player_roster_v2() is 'Authenticated account roster active within 30 minutes; not a live connection guarantee.';
