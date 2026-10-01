begin;
-- Public release history is independent of each guild's permanent ownership.
create table public.guild_event_color_releases_v1(
 color_id text primary key check(color_id in('name_halloween_orange')),
 first_available_at timestamptz not null
);
alter table public.guild_event_color_releases_v1 enable row level security;
revoke all on public.guild_event_color_releases_v1 from public,anon,authenticated;
grant all on public.guild_event_color_releases_v1 to service_role;

create function public.record_guild_event_color_release_v1(p_event text,p_start timestamptz,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_enabled and p_start<=now() and p_event ~ '^EVT_ANNUAL_010_[0-9]{4}$' then
 insert into public.guild_event_color_releases_v1 values('name_halloween_orange',p_start)
 on conflict(color_id) do update set first_available_at=least(public.guild_event_color_releases_v1.first_available_at,excluded.first_available_at);
 end if;
end $$;
revoke all on function public.record_guild_event_color_release_v1(text,timestamptz,boolean) from public,anon,authenticated;

-- Preserve history even when a past event is disabled, rescheduled or removed.
create function public.guild_event_color_release_trigger_v1() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op<>'INSERT' then perform public.record_guild_event_color_release_v1(old.event_id,old.starts_at,old.enabled);end if;
 if tg_op<>'DELETE' then perform public.record_guild_event_color_release_v1(new.event_id,new.starts_at,new.enabled);return new;end if;
 return old;
end $$;
create trigger guild_event_color_release_v1 after insert or update or delete on public.live_events
 for each row execute function public.guild_event_color_release_trigger_v1();
revoke all on function public.guild_event_color_release_trigger_v1() from public,anon,authenticated;

-- Backfill from prior shared encounters, without revealing unstarted events.
insert into public.guild_event_color_releases_v1(color_id,first_available_at)
 select 'name_halloween_orange',min(starts_at) from public.guild_pve_encounters_v1
 where kind='event' and event_id ~ '^EVT_ANNUAL_010_[0-9]{4}$' and starts_at<=now()
 having count(*)>0 on conflict do nothing;
select public.record_guild_event_color_release_v1(event_id,starts_at,enabled) from public.live_events;

create function public.guild_appearance_entitlements_v4()
returns table(guild_id uuid,guild_level integer,banner_gallery_tier integer,pve_achievement_ids text[],event_cosmetic_ids text[],revealed_event_color_ids text[])
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 -- Lazy refresh covers a scheduled event crossing its start time without a row update.
 perform public.record_guild_event_color_release_v1(e.event_id,e.starts_at,e.enabled) from public.live_events e;
 return query select ent.*,coalesce((select array_agg(r.color_id order by r.color_id) from public.guild_event_color_releases_v1 r),'{}'::text[])
 from public.guild_appearance_entitlements_v3() ent;
end $$;
revoke all on function public.guild_appearance_entitlements_v4() from public,anon;
grant execute on function public.guild_appearance_entitlements_v4() to authenticated;
commit;
