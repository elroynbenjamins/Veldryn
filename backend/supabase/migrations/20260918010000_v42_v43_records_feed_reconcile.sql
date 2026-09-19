begin;

-- V42/V43 reconciliation: Personal Records and world milestone feed.
-- Achievement claims/titles remain owned by the existing achievement service.

create table if not exists public.personal_records(
  account_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  value numeric not null check(value>=0),
  achieved_at timestamptz not null,
  character_id uuid,
  context_label text,
  updated_at timestamptz not null default now(),
  primary key(account_id,record_id),
  check(char_length(coalesce(context_label,''))<=140)
);

create table if not exists private.personal_record_receipts(
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  fingerprint text not null,
  record_id text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(account_id,event_id)
);

create table if not exists public.world_milestone_feed(
  feed_id text primary key,
  account_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  display_name text not null,
  subject_id text not null,
  subject_name text not null,
  detail text,
  occurred_at timestamptz not null,
  expires_at timestamptz not null default (now()+interval '14 days'),
  check(char_length(display_name)<=32),
  check(char_length(subject_name)<=80),
  check(char_length(coalesce(detail,''))<=140)
);
create index if not exists world_milestone_feed_recent_idx on public.world_milestone_feed(occurred_at desc,expires_at);

alter table public.personal_records enable row level security;
alter table public.world_milestone_feed enable row level security;
alter table private.personal_record_receipts enable row level security;

drop policy if exists "read own personal records" on public.personal_records;
create policy "read own personal records" on public.personal_records for select to authenticated using(account_id=auth.uid());

-- World-feed publication remains trusted service/backend only. Empty feed is valid at launch.
drop policy if exists "read recent world milestones" on public.world_milestone_feed;
create policy "read recent world milestones" on public.world_milestone_feed for select to authenticated using(expires_at>now());

revoke all on private.personal_record_receipts from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.personal_record_receipts to service_role;

commit;
