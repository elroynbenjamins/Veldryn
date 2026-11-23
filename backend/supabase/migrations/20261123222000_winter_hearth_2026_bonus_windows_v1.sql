-- Read-only server service projection of historical Winter Hearth milestone windows.
-- Do not award retroactive XP from a current milestone snapshot.
begin;
create or replace function public.winter_hearth_2026_bonus_windows_server_v1(p_account_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $windows$
declare
 v_gid uuid;v_join timestamptz;v_event public.live_events;
 v_start timestamptz;v_end timestamptz;v_rows jsonb;
begin
 if p_account_id is null then return '[]'::jsonb;end if;
 select m.guild_id,m.joined_at into v_gid,v_join
 from public.guild_members m where m.account_id=p_account_id
 order by m.joined_at desc limit 1;
 if v_gid is null then return '[]'::jsonb;end if;
 select * into v_event from public.live_events
 where event_id='EVT_ANNUAL_012_2026';
 if not found or not v_event.enabled
  or coalesce(v_event.config->>'winterHearthGuildEnabled','false')<>'true'
 then return '[]'::jsonb;end if;
 v_start:=greatest(v_event.starts_at,'2026-12-03 00:00:00+00'::timestamptz,v_join);
 v_end:=least(v_event.ends_at,'2026-12-27 00:00:00+00'::timestamptz);
 if v_end is null or v_start is null or v_end<=v_start then return '[]'::jsonb;end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'percent',ms.percent,
  'startsAt',greatest(v_start,ms.earned_at),
  'endsAt',v_end,
  'gatheringSpeedBps',case when ms.percent=100 then 1000 else 400 end,
  'skillXpBps',case when ms.percent=100 then 1000 when ms.percent>=50 then 600 else 0 end,
  'combatXpBps',case when ms.percent=100 then 1000 when ms.percent>=75 then 600 else 0 end
 ) order by ms.percent),'[]'::jsonb) into v_rows
 from public.guild_winter_hearth_2026_milestones ms
 where ms.guild_id=v_gid and greatest(v_start,ms.earned_at)<v_end;
 return v_rows;
end $windows$;
revoke all on function public.winter_hearth_2026_bonus_windows_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.winter_hearth_2026_bonus_windows_server_v1(uuid) to service_role;
commit;