begin;
-- V50 reconciliation: generic event modules/config metadata.
-- Community campaigns remain deferred for pre-launch; old community tables remain dormant for migration history.
alter table public.live_events
  add column if not exists grace_ends_at timestamptz,
  add column if not exists priority integer not null default 0,
  add column if not exists modules text[] not null default array['overview','rewards','tasks']::text[];

do $$ begin
  if not exists(select 1 from pg_constraint where conname='live_events_grace_v50_check') then
    alter table public.live_events add constraint live_events_grace_v50_check check(grace_ends_at is null or ends_at is null or grace_ends_at>=ends_at);
  end if;
end $$;

-- Explicitly mark the old Harvestwake community feature dormant rather than deleting migration history.
update public.live_events
set config=jsonb_set(coalesce(config,'{}'::jsonb),'{communityModuleEnabled}','false'::jsonb,true)
where event_id='EVT_ANNUAL_009_2026';

create or replace function public.visible_live_events()
returns table(event_id text,name text,currency_id text,starts_at timestamptz,ends_at timestamptz,grace_ends_at timestamptz,priority integer,modules text[],config jsonb)
language sql stable security definer set search_path=public as $$
  select e.event_id,e.name,e.currency_id,e.starts_at,e.ends_at,e.grace_ends_at,e.priority,e.modules,e.config
  from public.live_events e
  where e.enabled
    and (e.starts_at is null or e.starts_at<=now())
    and (e.grace_ends_at is null or e.grace_ends_at>now())
  order by e.priority desc,e.starts_at desc nulls last,e.event_id;
$$;
revoke all on function public.visible_live_events() from public;
grant execute on function public.visible_live_events() to anon,authenticated;
commit;
