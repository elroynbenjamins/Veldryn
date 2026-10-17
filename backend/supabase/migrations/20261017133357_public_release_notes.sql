-- Public announcements are separate from mandatory-update enforcement.
-- The existing app_release_policy minimum_version / force_after remains authoritative.
create table if not exists public.app_release_notes (
 platform text not null check (platform in ('android','other')),
 version text not null,
 title text not null,
 highlights jsonb not null default '[]'::jsonb check (jsonb_typeof(highlights) = 'array'),
 published_at timestamptz not null default now(),
 is_published boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key (platform,version)
);

create index if not exists app_release_notes_feed_idx
 on public.app_release_notes(platform,is_published,published_at desc);

alter table public.app_release_notes enable row level security;

drop policy if exists "Published release notes readable" on public.app_release_notes;
create policy "Published release notes readable"
 on public.app_release_notes for select to anon, authenticated
 using (is_published and published_at <= now());

revoke insert, update, delete on public.app_release_notes from anon, authenticated;
grant select on public.app_release_notes to anon, authenticated;
