create table if not exists public.expedition_run_builds (
 run_id uuid primary key references public.expedition_runs(id) on delete cascade,
 boon_ids text[] not null default '{}', artifact_ids text[] not null default '{}', evolution_ids text[] not null default '{}',
 build_version integer not null default 1, updated_at timestamptz not null default now()
);
alter table public.expedition_run_builds enable row level security;
create policy "members read expedition builds" on public.expedition_run_builds for select using (
 exists(select 1 from public.expedition_run_members m where m.run_id=run_id and m.account_id=auth.uid())
);
comment on table public.expedition_run_builds is 'Server-authoritative temporary Boon/Artifact/Evolution state. Cleared when run ends.';
