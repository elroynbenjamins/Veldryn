-- A raid should feel like a rotating weekly threat, not a renamed progress bar.
-- The rotation is deterministic from the UTC week so every guild faces the same
-- baseline boss. Event bosses continue to be created from their live event.
begin;

create or replace function public.guild_pve_weekly_boss_name_v1(p_start timestamptz)
returns text language sql immutable set search_path=public as $$
 select case mod(extract(week from p_start at time zone 'UTC')::integer,4)
  when 0 then 'Rootbound Colossus'
  when 1 then 'Fallen Oathbreaker'
  when 2 then 'Granite Moss Troll'
  else 'Veilbound Revenant'
 end
$$;
revoke all on function public.guild_pve_weekly_boss_name_v1(timestamptz) from public,anon,authenticated;
grant execute on function public.guild_pve_weekly_boss_name_v1(timestamptz) to service_role;

create or replace function public.ensure_guild_pve_v1(p_guild uuid,p_now timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare v_start timestamptz:=date_trunc('week',p_now at time zone 'UTC') at time zone 'UTC';e record;
begin
 perform public.create_guild_pve_encounter_v2(
  p_guild,'weekly:'||to_char(v_start at time zone 'UTC','YYYY-MM-DD'),'weekly',
  public.guild_pve_weekly_boss_name_v1(v_start),v_start,v_start+interval '7 days',v_start+interval '14 days'
 );
 for e in select * from public.visible_live_events() where starts_at<=p_now and ends_at>p_now loop
  perform public.create_guild_pve_encounter_v2(p_guild,'event:'||e.event_id||':'||extract(epoch from e.starts_at)::text,'event',e.name,e.starts_at,e.ends_at,greatest(e.ends_at,coalesce(e.claim_ends_at,e.ends_at+interval '3 days')),e.event_id);
 end loop;
end $$;
revoke all on function public.ensure_guild_pve_v1(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.ensure_guild_pve_v1(uuid,timestamptz) to service_role;
commit;
