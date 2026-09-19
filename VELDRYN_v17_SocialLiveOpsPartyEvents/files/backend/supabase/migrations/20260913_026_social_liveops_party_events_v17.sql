-- VELDRYN v17 — Social Live-Ops + Party Events + full Guild recruitment.
-- Depends on v16.1 migration 20260913_025_parties_contracts_recruitment_v16_1.sql.
-- All contribution writes, score finalization and reward grants are server-authoritative.

-- Recruitment remains broad (Combat / Skilling / Mixed, play style, goal/focus) while live event tags are only soft discovery hints.
alter table if exists public.party_recruitment_posts add column if not exists active_event_tags text[] not null default '{}';
alter table if exists public.party_seeker_posts add column if not exists active_event_tags text[] not null default '{}';
alter table if exists public.guild_recruitment_profiles add column if not exists active_event_tags text[] not null default '{}';
alter table if exists public.guild_recruitment_profiles add column if not exists min_total_level integer;
alter table if exists public.guild_recruitment_profiles add column if not exists min_combat_level integer;
alter table if exists public.guild_recruitment_profiles add column if not exists application_required boolean not null default true;
alter table if exists public.guild_seeker_posts add column if not exists active_event_tags text[] not null default '{}';
alter table if exists public.guild_seeker_posts add column if not exists total_level integer;

create table if not exists public.guild_applications(
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  note text not null default '',
  status text not null default 'pending' check(status in('pending','accepted','declined','expired','cancelled')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index if not exists uq_guild_application_pending on public.guild_applications(guild_id, account_id) where status='pending';
create index if not exists idx_guild_applications_account on public.guild_applications(account_id, status, created_at desc);

create table if not exists public.guild_invites(
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  invited_by_account_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in('pending','accepted','declined','expired','cancelled')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index if not exists uq_guild_invite_pending on public.guild_invites(guild_id, account_id) where status='pending';
create index if not exists idx_guild_invites_account on public.guild_invites(account_id, status, created_at desc);

-- Immutable versioned event content. definition_json is the complete server-owned definition.
create table if not exists public.liveops_event_definitions(
  event_id text not null,
  version integer not null check(version > 0),
  scope text not null check(scope in('party')),
  definition_json jsonb not null,
  config_hash text not null,
  created_at timestamptz not null default now(),
  created_by text,
  primary key(event_id, version)
);

create or replace function public.prevent_liveops_definition_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'liveops event definitions are immutable; create a new version';
end $$;
drop trigger if exists trg_liveops_definition_immutable on public.liveops_event_definitions;
create trigger trg_liveops_definition_immutable
before update or delete on public.liveops_event_definitions
for each row execute function public.prevent_liveops_definition_mutation();

create table if not exists public.liveops_event_instances(
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  definition_version integer not null,
  definition_snapshot jsonb not null,
  config_hash text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  settlement_grace_minutes integer not null default 10 check(settlement_grace_minutes between 5 and 30),
  status text not null default 'scheduled' check(status in('scheduled','active','settling','finalized','archived','cancelled')),
  finalized_at timestamptz,
  finalization_checksum text,
  created_at timestamptz not null default now(),
  foreign key(event_id, definition_version) references public.liveops_event_definitions(event_id, version),
  check(ends_at > starts_at),
  check(ends_at <= starts_at + interval '72 hours'),
  check(ends_at >= starts_at + interval '24 hours')
);
create index if not exists idx_liveops_instances_window on public.liveops_event_instances(status, starts_at, ends_at);
create unique index if not exists uq_liveops_one_active_party_event
  on public.liveops_event_instances((definition_snapshot->>'scope'))
  where status in('active','settling') and definition_snapshot->>'scope'='party';


create or replace function public.prevent_liveops_instance_definition_mutation() returns trigger language plpgsql as $$
begin
  if old.event_id is distinct from new.event_id
     or old.definition_version is distinct from new.definition_version
     or old.definition_snapshot is distinct from new.definition_snapshot
     or old.config_hash is distinct from new.config_hash then
    raise exception 'liveops event instance definition snapshot is immutable';
  end if;
  return new;
end $$;
drop trigger if exists trg_liveops_instance_definition_immutable on public.liveops_event_instances;
create trigger trg_liveops_instance_definition_immutable
before update on public.liveops_event_instances
for each row execute function public.prevent_liveops_instance_definition_mutation();

create or replace function public.prevent_overlapping_party_event_windows() returns trigger language plpgsql as $$
begin
  if new.status in ('scheduled','active','settling') and new.definition_snapshot->>'scope'='party' then
    if exists(
      select 1 from public.liveops_event_instances e
      where e.id <> new.id
        and e.status in ('scheduled','active','settling')
        and e.definition_snapshot->>'scope'='party'
        and tstzrange(e.starts_at, e.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
    ) then
      raise exception 'party event schedule overlaps an existing party event';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_liveops_no_party_overlap on public.liveops_event_instances;
create trigger trg_liveops_no_party_overlap
before insert or update of starts_at, ends_at, status on public.liveops_event_instances
for each row execute function public.prevent_overlapping_party_event_windows();

-- Account-level personal progress follows the account even if it later leaves its party.
create table if not exists public.liveops_event_account_progress(
  event_instance_id uuid not null references public.liveops_event_instances(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  personal_points bigint not null default 0 check(personal_points >= 0),
  combat_points bigint not null default 0 check(combat_points >= 0),
  skilling_points bigint not null default 0 check(skilling_points >= 0),
  last_contribution_at timestamptz,
  primary key(event_instance_id, account_id)
);

-- Party score is the canonical live leaderboard aggregate.
create table if not exists public.liveops_event_party_progress(
  event_instance_id uuid not null references public.liveops_event_instances(id) on delete cascade,
  party_id uuid not null,
  party_name_snapshot text,
  score bigint not null default 0 check(score >= 0),
  combat_points bigint not null default 0 check(combat_points >= 0),
  skilling_points bigint not null default 0 check(skilling_points >= 0),
  meaningful_contributors integer not null default 0 check(meaningful_contributors >= 0),
  ranked_eligible boolean not null default false,
  last_score_at timestamptz not null default now(),
  primary key(event_instance_id, party_id)
);
create index if not exists idx_liveops_party_leaderboard
  on public.liveops_event_party_progress(event_instance_id, ranked_eligible, score desc, last_score_at asc, party_id asc);

create table if not exists public.liveops_event_party_member_progress(
  event_instance_id uuid not null references public.liveops_event_instances(id) on delete cascade,
  party_id uuid not null,
  account_id uuid not null references auth.users(id) on delete cascade,
  points bigint not null default 0 check(points >= 0),
  combat_points bigint not null default 0 check(combat_points >= 0),
  skilling_points bigint not null default 0 check(skilling_points >= 0),
  first_contribution_at timestamptz,
  last_contribution_at timestamptz,
  primary key(event_instance_id, party_id, account_id)
);
create index if not exists idx_liveops_member_event_account on public.liveops_event_party_member_progress(event_instance_id, account_id);

-- After meaningful contribution, an account is bound to one party for party/ranking rewards for that event.
-- Changing party remains allowed, but the new party does not receive that account's party score.
create table if not exists public.liveops_event_party_bindings(
  event_instance_id uuid not null references public.liveops_event_instances(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  party_id uuid not null,
  locked_at timestamptz not null,
  points_at_lock integer not null check(points_at_lock > 0),
  primary key(event_instance_id, account_id)
);

-- Transactional outbox. Trusted settlement code inserts this in the same transaction as gameplay/economy rewards.
-- Worker retries are safe because every downstream target also has source_event_id idempotency.
create table if not exists public.social_contribution_outbox(
  id uuid primary key default gen_random_uuid(),
  source_event_id text not null unique,
  account_id uuid not null references auth.users(id) on delete cascade,
  party_id_at_settlement uuid,
  party_name_at_settlement text,
  event_json jsonb not null,
  targets_json jsonb not null,
  status text not null default 'pending' check(status in('pending','processing','processed','dead_letter')),
  attempts integer not null default 0 check(attempts >= 0),
  last_error text,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  processed_at timestamptz,
  result_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_social_contribution_outbox_pending on public.social_contribution_outbox(status, available_at, created_at) where status in('pending','processing');

-- Raw idempotency receipts. source_event_id must originate from trusted settlement code.
create table if not exists public.liveops_event_contribution_receipts(
  event_instance_id uuid not null references public.liveops_event_instances(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  party_id uuid not null,
  party_name_at_settlement text,
  source_event_id text not null,
  date_key date not null,
  category text not null check(category in('combat','skilling')),
  activity_kind text not null check(activity_kind in('combat','gathering','processing','crafting','fishing','hunting','alchemy','delivery')),
  content_id text not null,
  raw_points integer not null check(raw_points >= 0),
  credited_points integer not null check(credited_points >= 0),
  party_credited_points integer not null check(party_credited_points >= 0),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(event_instance_id, account_id, source_event_id)
);
create index if not exists idx_liveops_receipts_daily on public.liveops_event_contribution_receipts(event_instance_id, account_id, date_key);
create index if not exists idx_liveops_receipts_breakdown on public.liveops_event_contribution_receipts(event_instance_id, account_id, date_key, activity_kind, content_id);

-- Bounded daily aggregates for the client contribution breakdown. This avoids shipping/querying an unbounded receipt history.
create table if not exists public.liveops_event_contribution_daily_breakdown(
  event_instance_id uuid not null references public.liveops_event_instances(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  date_key date not null,
  activity_kind text not null check(activity_kind in('combat','gathering','processing','crafting','fishing','hunting','alchemy','delivery')),
  content_id text not null,
  points bigint not null default 0 check(points >= 0),
  units bigint not null default 0 check(units >= 0),
  updated_at timestamptz not null default now(),
  primary key(event_instance_id, account_id, date_key, activity_kind, content_id)
);

-- Final ranks are snapshots. Claims never depend on a live leaderboard query after event settlement.
create table if not exists public.liveops_event_rank_snapshots(
  event_instance_id uuid not null references public.liveops_event_instances(id) on delete cascade,
  party_id uuid not null,
  party_name_snapshot text,
  rank integer not null check(rank > 0),
  eligible_party_count integer not null check(eligible_party_count > 0),
  score bigint not null check(score >= 0),
  percentile numeric(8,4) not null,
  reward_band text not null check(reward_band in('top10','top100','top10_percent','top25_percent','qualified')),
  meaningful_contributors integer not null,
  snapshotted_at timestamptz not null,
  primary key(event_instance_id, party_id),
  unique(event_instance_id, rank)
);

create table if not exists public.liveops_event_reward_claims(
  claim_key text primary key,
  event_instance_id uuid not null references public.liveops_event_instances(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  party_id uuid,
  reward_kind text not null check(reward_kind in('personal_milestone','party_milestone','ranking')),
  milestone_points integer,
  reward_bundle_id text not null,
  granted_transaction_id text,
  claimed_at timestamptz not null default now()
);
create index if not exists idx_liveops_claims_account on public.liveops_event_reward_claims(account_id, event_instance_id);

-- Legacy v16 event score hook tables are retained for migration safety but are no longer canonical for v17 Party Events.
comment on table public.party_event_scores is 'Legacy v16 hook only; v17 canonical Party Event score is liveops_event_party_progress.';
comment on table public.party_event_member_scores is 'Legacy v16 hook only; v17 canonical member score is liveops_event_party_member_progress.';

alter table public.guild_applications enable row level security;
alter table public.guild_invites enable row level security;
alter table public.liveops_event_definitions enable row level security;
alter table public.liveops_event_instances enable row level security;
alter table public.liveops_event_account_progress enable row level security;
alter table public.liveops_event_party_progress enable row level security;
alter table public.liveops_event_party_member_progress enable row level security;
alter table public.liveops_event_party_bindings enable row level security;
alter table public.social_contribution_outbox enable row level security;
alter table public.liveops_event_contribution_receipts enable row level security;
alter table public.liveops_event_contribution_daily_breakdown enable row level security;
alter table public.liveops_event_rank_snapshots enable row level security;
alter table public.liveops_event_reward_claims enable row level security;

-- Browsing event schedule/aggregate leaderboard is authenticated-public. Mutations remain trusted-server only.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='liveops_event_definitions' and policyname='authenticated read liveops definitions') then
    create policy "authenticated read liveops definitions" on public.liveops_event_definitions for select to authenticated using(true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='liveops_event_instances' and policyname='authenticated read liveops instances') then
    create policy "authenticated read liveops instances" on public.liveops_event_instances for select to authenticated using(status <> 'archived');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='liveops_event_party_progress' and policyname='authenticated read event leaderboard') then
    create policy "authenticated read event leaderboard" on public.liveops_event_party_progress for select to authenticated using(true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='liveops_event_rank_snapshots' and policyname='authenticated read finalized event ranks') then
    create policy "authenticated read finalized event ranks" on public.liveops_event_rank_snapshots for select to authenticated using(true);
  end if;
end $$;

-- Private progress/breakdown/claim surfaces are self-readable. Party member detail is limited to members of that party.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='liveops_event_account_progress' and policyname='read own event progress') then
    create policy "read own event progress" on public.liveops_event_account_progress for select using(account_id=auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='liveops_event_party_member_progress' and policyname='party reads event member progress') then
    create policy "party reads event member progress" on public.liveops_event_party_member_progress for select using(
      exists(select 1 from public.party_members pm where pm.party_id=liveops_event_party_member_progress.party_id and pm.account_id=auth.uid())
      or account_id=auth.uid()
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='liveops_event_party_bindings' and policyname='read own event binding') then
    create policy "read own event binding" on public.liveops_event_party_bindings for select using(account_id=auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='liveops_event_contribution_receipts' and policyname='read own event receipts') then
    create policy "read own event receipts" on public.liveops_event_contribution_receipts for select using(account_id=auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='liveops_event_contribution_daily_breakdown' and policyname='read own event breakdown') then
    create policy "read own event breakdown" on public.liveops_event_contribution_daily_breakdown for select using(account_id=auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='liveops_event_reward_claims' and policyname='read own event claims') then
    create policy "read own event claims" on public.liveops_event_reward_claims for select using(account_id=auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='guild_applications' and policyname='read own guild applications') then
    create policy "read own guild applications" on public.guild_applications for select using(account_id=auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='guild_invites' and policyname='read own guild invites') then
    create policy "read own guild invites" on public.guild_invites for select using(account_id=auth.uid());
  end if;
end $$;
