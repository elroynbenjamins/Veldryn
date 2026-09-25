create table if not exists public.app_release_policy (
  platform text primary key check (platform in ('android','other')),
  latest_version text not null default '0.1.0',
  minimum_version text not null default '0.1.0',
  force_after timestamptz,
  title text not null default 'VELDRYN has been updated',
  message text not null default 'This version is no longer supported. Update to continue your adventure.',
  maintenance_mode boolean not null default false,
  maintenance_message text not null default 'VELDRYN is temporarily unavailable while maintenance is completed.',
  updated_at timestamptz not null default now()
);

alter table public.app_release_policy enable row level security;

drop policy if exists "release policy readable by everyone" on public.app_release_policy;
create policy "release policy readable by everyone"
on public.app_release_policy for select
to anon, authenticated
using (true);

revoke insert, update, delete on public.app_release_policy from anon, authenticated;
grant select on public.app_release_policy to anon, authenticated;

insert into public.app_release_policy(platform,latest_version,minimum_version)
values ('android','0.1.0','0.1.0'),('other','0.1.0','0.1.0')
on conflict (platform) do nothing;
