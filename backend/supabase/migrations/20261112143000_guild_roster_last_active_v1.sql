-- A member-only roster projection with one last-active timestamp per member.
-- Source is the existing server-owned activity helper (presence, gameplay and sign-in).
-- Do not use joined_at as a fallback: joining is not evidence of current activity.
-- Kept separate from guild_roster so already-released clients retain their contract.
create or replace function public.guild_roster_with_activity_v1(p_guild_id uuid)
returns table(
 account_id uuid,
 display_name text,
 role text,
 joined_at timestamptz,
 last_active_at timestamptz
)
language sql stable security definer set search_path='' as $function$
 select gm.account_id,
        coalesce(pp.display_name,'Adventurer')::text,
        gm.role::text,
        gm.joined_at,
        public.social_account_last_active_v1(gm.account_id,null::timestamptz)
 from public.guild_members gm
 left join public.player_profiles pp on pp.account_id=gm.account_id
 where gm.guild_id=p_guild_id
   and exists(
     select 1 from public.guild_members viewer
     where viewer.guild_id=p_guild_id and viewer.account_id=(select auth.uid())
   )
 order by case gm.role when 'leader' then 0 when 'officer' then 1 else 2 end,gm.joined_at;
$function$;

revoke all on function public.guild_roster_with_activity_v1(uuid) from public,anon,authenticated;
grant execute on function public.guild_roster_with_activity_v1(uuid) to authenticated;
comment on function public.guild_roster_with_activity_v1(uuid) is
 'Guild-member-only roster with server-derived last activity. No last-activity access to nonmembers.';
