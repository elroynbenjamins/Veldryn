drop policy if exists "echo profiles readable" on public.echo_profiles;
create policy echo_profiles_owner_read on public.echo_profiles for select using (exists (
 select 1 from public.characters c where c.id=echo_profiles.character_id and c.account_id=auth.uid()
));
alter table public.echo_profiles
 add column if not exists opted_in boolean not null default false,
 add column if not exists expires_at timestamptz,
 add column if not exists readiness_json jsonb not null default '{}'::jsonb,
 add column if not exists snapshot_hash text;
revoke insert,update,delete on public.echo_recruitments from anon,authenticated;
