-- Public seasonal planning is separate from activation. Players may see an
-- authored festival's dates before Live-Ops enables its gameplay systems.
create or replace function public.public_event_calendar()
returns table(
  event_id text,
  name text,
  starts_at timestamptz,
  ends_at timestamptz,
  grace_ends_at timestamptz,
  priority integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.event_id,
    e.name,
    e.starts_at,
    e.ends_at,
    e.grace_ends_at,
    e.priority
  from public.live_events e
  where coalesce(e.config->>'catalogStatus','') = 'production'
  order by e.starts_at asc nulls last, e.priority desc, e.event_id;
$$;

revoke execute on function public.public_event_calendar() from public, anon, authenticated;
grant execute on function public.public_event_calendar() to authenticated, service_role;
