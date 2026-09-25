-- Public mobile release policy for startup version gating.
-- Safe to read before authentication; writes remain service/admin only.

create table if not exists public.app_release_policy(
  channel text primary key,
  latest_version text not null,
  minimum_version text not null,
  latest_build bigint,
  minimum_build bigint,
  force_after timestamptz,
  update_title text not null default 'VELDRYN has been updated',
  update_message text not null default 'A newer version is required to continue your adventure. Update VELDRYN through your app store.',
  android_store_url text,
  ios_store_url text,
  maintenance_mode boolean not null default false,
  maintenance_title text not null default 'Asterfall is under maintenance',
  maintenance_message text not null default 'The realm is temporarily unavailable while maintenance is completed. Please check again shortly.',
  updated_at timestamptz not null default now()
);

alter table public.app_release_policy enable row level security;

grant select on table public.app_release_policy to anon, authenticated;
revoke insert, update, delete on table public.app_release_policy from anon, authenticated;

drop policy if exists app_release_policy_anon_read on public.app_release_policy;
create policy app_release_policy_anon_read
on public.app_release_policy
for select
to anon
using (true);

drop policy if exists app_release_policy_authenticated_read on public.app_release_policy;
create policy app_release_policy_authenticated_read
on public.app_release_policy
for select
to authenticated
using (true);

insert into public.app_release_policy(
  channel,latest_version,minimum_version,android_store_url,update_title,update_message
) values
  ('production','0.1.0','0.1.0','https://play.google.com/store/apps/details?id=com.elroybenjamins.veldryn','VELDRYN has been updated','This version is no longer supported. Update VELDRYN to continue your adventure.'),
  ('preview','0.1.0','0.1.0','https://play.google.com/store/apps/details?id=com.elroybenjamins.veldryn','VELDRYN preview update','Install the latest preview build to continue testing.'),
  ('staging','0.1.0','0.1.0','https://play.google.com/store/apps/details?id=com.elroybenjamins.veldryn','VELDRYN staging update','Install the latest staging build to continue testing.')
on conflict(channel) do nothing;

comment on table public.app_release_policy is 'Public read-only mobile release and maintenance policy. Update through service-role/admin tooling only.';
