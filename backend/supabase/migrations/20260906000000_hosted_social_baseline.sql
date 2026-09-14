-- Recovered dependency of 20260907000000_online_social.sql. The original hosted
-- database already had these objects, but their creation was missing from Git.
-- Definitions were checked against production catalog metadata on 2026-09-12.
-- Intentionally precedes its consumer; never replaces an existing table/policy.
begin;
alter table public.guilds add column if not exists minimum_level integer not null default 1;
alter table public.guilds add column if not exists join_policy text not null default 'open';
do $$ begin
 -- Compact hosted chat tables received this default in the old reconciliation
 -- path; a newly created full chat table did not, breaking the later seed.
 if exists(select 1 from pg_attribute a where a.attrelid='public.chat_filter_terms'::regclass and a.attname='severity' and not a.atthasdef) then
  alter table public.chat_filter_terms alter column severity set default 2;
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.guilds'::regclass and conname='guilds_join_policy_check') then
  alter table public.guilds add constraint guilds_join_policy_check check(join_policy in ('open','apply','invite'));
 end if;
 if to_regclass('public.guild_applications') is null then
  create table public.guild_applications (
   id uuid primary key default gen_random_uuid(),
   guild_id uuid not null references public.guilds(id) on delete cascade,
   account_id uuid not null references auth.users(id) on delete cascade,
   status text not null default 'pending' check(status in ('pending','accepted','declined','withdrawn')),
   created_at timestamptz not null default now(),
   unique(guild_id,account_id)
  );
  alter table public.guild_applications enable row level security;
  revoke all on public.guild_applications from public,anon,authenticated;
  grant select,insert on public.guild_applications to authenticated;
  grant all on public.guild_applications to service_role;
  create policy guild_application_owner_read on public.guild_applications for select using(account_id=auth.uid());
 end if;
end $$;
commit;
