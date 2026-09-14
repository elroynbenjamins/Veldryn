-- VELDRYN Combat Companion ecosystem completion.
-- Adds weekly Proving Grounds and Codex/showcase persistence only.
-- Passive Pets, Pet Essence, Pet Bond and character Triad Trials remain untouched.

alter table public.account_companion_progression
  add column if not exists codex_discovered_companion_ids text[] not null default '{}'::text[],
  add column if not exists codex_claimed_milestone_ids text[] not null default '{}'::text[],
  add column if not exists codex_reward_ids text[] not null default '{}'::text[],
  add column if not exists showcase_slots_unlocked smallint;

-- v5 allowed up to three showcase companions. Grandfather existing account rows so this
-- migration never removes a previously available showcase capability. Fresh accounts
-- created after the migration receive one slot and unlock the others through Codex milestones.
update public.account_companion_progression
set showcase_slots_unlocked = 3
where showcase_slots_unlocked is null;

alter table public.account_companion_progression
  alter column showcase_slots_unlocked set default 1,
  alter column showcase_slots_unlocked set not null;

do $$ begin
  alter table public.account_companion_progression
    add constraint account_companion_showcase_slots_range check(showcase_slots_unlocked between 1 and 3);
exception when duplicate_object then null; end $$;

create table if not exists public.account_companion_proving_grounds (
  account_id uuid primary key,
  week_key text not null,
  progress jsonb not null default '{}'::jsonb,
  completed_ids text[] not null default '{}'::text[],
  claimed_ids text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

alter table public.account_companion_proving_grounds enable row level security;
do $$ begin
  create policy "owner read companion proving grounds"
    on public.account_companion_proving_grounds for select
    using(account_id=auth.uid());
exception when duplicate_object then null; end $$;

comment on table public.account_companion_proving_grounds is
  'Server-authoritative weekly Combat Companion Proving Grounds. Lazy weekly rollover uses the existing Companion/global Monday-UTC week key; permanent companion progression never resets.';
comment on column public.account_companion_progression.codex_reward_ids is
  'Entitlement identifiers awarded by Combat Companion Codex milestones. Production profile adapter maps these to the existing profile cosmetic/title systems; no new currency is introduced.';
