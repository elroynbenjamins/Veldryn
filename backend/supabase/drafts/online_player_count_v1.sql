-- REVIEW ONLY: generate a real migration after staging verification.
-- Same eligibility and viewer/block scope as online_player_roster_v2.
-- No names, relationship lookups, character level aggregation or row JSON.
begin;
create or replace function public.online_player_count_v1()
returns bigint
language sql stable security definer
set search_path = ''
as $function$
 with viewer as (
  select auth.uid() as account_id
 ), recent as (
  select distinct p.account_id
  from public.player_presence_5m p
  where p.bucket_start >= now() - interval '35 minutes'
    and p.last_seen_at >= now() - interval '30 minutes'
 )
 select count(*)
 from recent r
 cross join viewer v
 join public.player_profiles profile on profile.account_id=r.account_id
 join public.characters c on c.id=profile.active_character_id and c.account_id=r.account_id
 where v.account_id is not null
   and not exists (
    select 1 from public.player_blocks b
    where (b.blocker_id=v.account_id and b.blocked_id=r.account_id)
       or (b.blocker_id=r.account_id and b.blocked_id=v.account_id)
   );
$function$;
revoke all on function public.online_player_count_v1() from public, anon;
grant execute on function public.online_player_count_v1() to authenticated;
comment on function public.online_player_count_v1() is 'Viewer-filtered count of accounts active in the last 30 minutes, with the same eligibility as online_player_roster_v2.';
commit;
