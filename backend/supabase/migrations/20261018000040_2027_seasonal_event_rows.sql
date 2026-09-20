begin;

-- Pre-register the first two 2027 annual-event runtime identities without
-- enabling or scheduling them. Content resolves through the matching annual
-- series template in the shared TypeScript catalog, while progression/claims
-- remain isolated by the year-specific event_id.
insert into public.live_events(
  event_id,name,currency_id,enabled,starts_at,ends_at,grace_ends_at,config,priority,modules,updated_at
)
select
  replacement.event_id,
  source.name,
  source.currency_id,
  false,
  null,
  null,
  null,
  coalesce(source.config,'{}'::jsonb)
    || jsonb_build_object(
      'seasonYear',2027,
      'clonedFromEventId',source.event_id,
      'catalogStatus','production',
      'runtimeAuthority','shared_typescript'
    ),
  source.priority,
  source.modules,
  now()
from public.live_events source
join (values
  ('EVT_ANNUAL_002_2026','EVT_ANNUAL_002_2027'),
  ('EVT_ANNUAL_003_2026','EVT_ANNUAL_003_2027')
) replacement(source_event_id,event_id)
  on replacement.source_event_id=source.event_id
on conflict(event_id) do update
set
  name=excluded.name,
  currency_id=excluded.currency_id,
  config=coalesce(public.live_events.config,'{}'::jsonb)||excluded.config,
  priority=excluded.priority,
  modules=excluded.modules,
  updated_at=now();

-- Deliberately do not alter enabled or schedule columns on conflict.
commit;
