-- Guild PvE event entries already carry their runtime event ID internally.
-- Return it to the authenticated board so the mobile client can render the
-- festival's actual boss identity and activity plan instead of treating the
-- festival title as a boss name.
create or replace function public.guild_pve_board_v1() returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();gid uuid;result jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 select guild_id into gid from public.guild_members where account_id=uid limit 1 for share;
 if gid is null then return '[]'::jsonb;end if;
 perform public.ensure_guild_pve_v1(gid,now());
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'name',e.name,'eventId',e.event_id,'startsAt',e.starts_at,'endsAt',e.ends_at,'claimEndsAt',e.claim_ends_at,'maxHp',e.max_hp,'damage',e.damage,'rosterSize',e.roster_size,'personalCap',e.personal_cap,'dailyCap',e.daily_cap,
  'eligible',exists(select 1 from public.guild_pve_roster_v2 where encounter_id=e.id and account_id=uid),
  'dailyUsed',coalesce((select floor(credited_ms/300.0) from public.guild_pve_daily_v2 where account_id=uid and scope_key=e.scope_key and earned_day=(now() at time zone 'UTC')::date),0),
  'personalDamage',coalesce((select damage from public.guild_pve_members_v1 where encounter_id=e.id and account_id=uid),0),
  'allowanceUsed',coalesce((select sum(m.damage) from public.guild_pve_members_v1 m join public.guild_pve_encounters_v1 x on x.id=m.encounter_id where m.account_id=uid and x.scope_key=e.scope_key),0),
  'contributors',(select count(*) from public.guild_pve_members_v1 where encounter_id=e.id),
  'claimed',coalesce((select jsonb_agg(milestone) from public.guild_pve_claims_v1 where account_id=uid and scope_key=e.scope_key),'[]'::jsonb)) order by e.starts_at desc,e.kind),'[]'::jsonb) into result
 from public.guild_pve_encounters_v1 e where e.guild_id=gid and e.claim_ends_at>now() and (e.kind='weekly' or exists(select 1 from public.visible_live_events() v where v.event_id=e.event_id and v.starts_at=e.starts_at));
 return result;
end $$;
revoke all on function public.guild_pve_board_v1() from public,anon;
grant execute on function public.guild_pve_board_v1() to authenticated;
