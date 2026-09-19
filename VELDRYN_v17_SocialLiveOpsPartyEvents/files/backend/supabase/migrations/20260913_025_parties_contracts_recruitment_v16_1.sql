-- VELDRYN v16.1 — persistent parties, asynchronous Party Contracts, Party/Guild recruitment.
-- Client requests must never supply authoritative contribution points. Points are written by trusted server settlement code.

alter table if exists public.parties add column if not exists name text;
alter table if exists public.parties add column if not exists join_policy text not null default 'request_to_join';
alter table if exists public.parties add column if not exists activity_preference text not null default 'mixed';
alter table if exists public.parties add column if not exists play_style text not null default 'balanced';
alter table if exists public.parties add column if not exists updated_at timestamptz not null default now();

alter table if exists public.party_members add column if not exists account_id uuid;
update public.party_members pm
set account_id = c.account_id
from public.characters c
where pm.character_id = c.id and pm.account_id is null;
create unique index if not exists uq_party_member_account_one_party
  on public.party_members(account_id) where account_id is not null;
create index if not exists idx_party_members_party_account on public.party_members(party_id, account_id);

create table if not exists public.party_invites(
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  invited_account_id uuid not null references auth.users(id) on delete cascade,
  invited_by_account_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in('pending','accepted','declined','expired','cancelled')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index if not exists uq_party_invite_pending
  on public.party_invites(party_id, invited_account_id) where status='pending';

create table if not exists public.party_join_requests(
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  status text not null default 'pending' check(status in('pending','accepted','declined','expired','cancelled')),
  note text not null default '',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index if not exists uq_party_join_request_pending
  on public.party_join_requests(party_id, account_id) where status='pending';

create table if not exists public.party_recruitment_posts(
  party_id uuid primary key references public.parties(id) on delete cascade,
  owner_account_id uuid not null references auth.users(id) on delete cascade,
  activity_preference text not null check(activity_preference in('combat','skilling','mixed')),
  play_style text not null check(play_style in('casual','balanced','active','competitive')),
  goal_tags text[] not null default '{}',
  description text not null default '',
  status text not null default 'active' check(status in('active','closed','expired')),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists idx_party_recruitment_browse
  on public.party_recruitment_posts(status, activity_preference, expires_at);

create table if not exists public.party_seeker_posts(
  account_id uuid primary key references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  activity_preference text not null check(activity_preference in('combat','skilling','mixed')),
  play_style text not null check(play_style in('casual','balanced','active','competitive')),
  goal_tags text[] not null default '{}',
  description text not null default '',
  class_id text,
  combat_level integer,
  status text not null default 'active' check(status in('active','closed','expired')),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists idx_party_seekers_browse
  on public.party_seeker_posts(status, activity_preference, expires_at);

create table if not exists public.guild_recruitment_profiles(
  guild_id uuid primary key references public.guilds(id) on delete cascade,
  owner_account_id uuid not null references auth.users(id) on delete cascade,
  focus_tags text[] not null default '{}',
  play_style text not null check(play_style in('casual','balanced','active','competitive')),
  description text not null default '',
  is_recruiting boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.guild_seeker_posts(
  account_id uuid primary key references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  desired_focus_tags text[] not null default '{}',
  play_style text not null check(play_style in('casual','balanced','active','competitive')),
  description text not null default '',
  class_id text,
  combat_level integer,
  status text not null default 'active' check(status in('active','closed','expired')),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists idx_guild_seekers_browse on public.guild_seeker_posts(status, expires_at);

create table if not exists public.party_contract_instances(
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  definition_id text not null,
  focus text not null check(focus in('combat','skilling','mixed')),
  rotation_key text not null,
  target_points integer not null check(target_points > 0),
  mixed_minimum_fraction numeric(5,4),
  status text not null default 'active' check(status in('active','completed','expired','cancelled')),
  accepted_by_account_id uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  completion_snapshot jsonb,
  unique(party_id, rotation_key, definition_id)
);
create index if not exists idx_party_contract_active on public.party_contract_instances(party_id, status, expires_at);
create unique index if not exists uq_party_contract_one_active on public.party_contract_instances(party_id) where status='active';

create table if not exists public.party_contract_member_progress(
  contract_instance_id uuid not null references public.party_contract_instances(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  raw_points bigint not null default 0 check(raw_points >= 0),
  completion_points bigint not null default 0 check(completion_points >= 0),
  combat_points bigint not null default 0 check(combat_points >= 0),
  skilling_points bigint not null default 0 check(skilling_points >= 0),
  last_contribution_at timestamptz,
  reward_claimed_at timestamptz,
  primary key(contract_instance_id, account_id)
);

create table if not exists public.party_contract_contribution_receipts(
  contract_instance_id uuid not null references public.party_contract_instances(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  source_event_id text not null,
  date_key date not null,
  category text not null check(category in('combat','skilling')),
  raw_points integer not null check(raw_points >= 0),
  credited_points integer not null check(credited_points >= 0),
  completion_credited_points integer not null check(completion_credited_points >= 0),
  created_at timestamptz not null default now(),
  primary key(contract_instance_id, account_id, source_event_id)
);
create index if not exists idx_party_contract_daily_receipts
  on public.party_contract_contribution_receipts(contract_instance_id, account_id, date_key);

create table if not exists public.party_weekly_social_goal_claims(
  account_id uuid not null references auth.users(id) on delete cascade,
  week_key text not null,
  party_id uuid not null references public.parties(id) on delete cascade,
  contract_instance_id uuid not null references public.party_contract_instances(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key(account_id, week_key)
);

-- Hooks for short Party Events. Ranking rewards should remain prestige/cosmetic-heavy.
create table if not exists public.party_event_scores(
  event_id text not null,
  party_id uuid not null references public.parties(id) on delete cascade,
  score bigint not null default 0 check(score >= 0),
  rank_snapshot integer,
  updated_at timestamptz not null default now(),
  primary key(event_id, party_id)
);
create table if not exists public.party_event_member_scores(
  event_id text not null,
  party_id uuid not null references public.parties(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  score bigint not null default 0 check(score >= 0),
  updated_at timestamptz not null default now(),
  primary key(event_id, party_id, account_id)
);

alter table public.party_invites enable row level security;
alter table public.party_join_requests enable row level security;
alter table public.party_recruitment_posts enable row level security;
alter table public.party_seeker_posts enable row level security;
alter table public.guild_recruitment_profiles enable row level security;
alter table public.guild_seeker_posts enable row level security;
alter table public.party_contract_instances enable row level security;
alter table public.party_contract_member_progress enable row level security;
alter table public.party_contract_contribution_receipts enable row level security;
alter table public.party_weekly_social_goal_claims enable row level security;
alter table public.party_event_scores enable row level security;
alter table public.party_event_member_scores enable row level security;

-- Public authenticated browse surfaces. Mutation is intentionally server-authoritative/service-role unless a later RPC is added.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='party_recruitment_posts' and policyname='browse active party recruitment') then
    create policy "browse active party recruitment" on public.party_recruitment_posts for select using(status='active' and expires_at > now());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='party_seeker_posts' and policyname='browse active party seekers') then
    create policy "browse active party seekers" on public.party_seeker_posts for select using(status='active' and expires_at > now());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='guild_recruitment_profiles' and policyname='browse recruiting guilds') then
    create policy "browse recruiting guilds" on public.guild_recruitment_profiles for select using(is_recruiting=true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='guild_seeker_posts' and policyname='browse active guild seekers') then
    create policy "browse active guild seekers" on public.guild_seeker_posts for select using(status='active' and expires_at > now());
  end if;
end $$;

-- Party members can read their own contract state. Trusted server code writes contribution/reward state.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='party_contract_instances' and policyname='party members read contracts') then
    create policy "party members read contracts" on public.party_contract_instances for select using(
      exists(select 1 from public.party_members pm where pm.party_id=party_contract_instances.party_id and pm.account_id=auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='party_contract_member_progress' and policyname='party members read progress') then
    create policy "party members read progress" on public.party_contract_member_progress for select using(
      exists(
        select 1 from public.party_contract_instances pci
        join public.party_members pm on pm.party_id=pci.party_id
        where pci.id=party_contract_member_progress.contract_instance_id and pm.account_id=auth.uid()
      )
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='party_event_scores' and policyname='party members read event score') then
    create policy "party members read event score" on public.party_event_scores for select using(
      exists(select 1 from public.party_members pm where pm.party_id=party_event_scores.party_id and pm.account_id=auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='party_event_member_scores' and policyname='party members read event member scores') then
    create policy "party members read event member scores" on public.party_event_member_scores for select using(
      exists(select 1 from public.party_members pm where pm.party_id=party_event_member_scores.party_id and pm.account_id=auth.uid())
    );
  end if;
end $$;
