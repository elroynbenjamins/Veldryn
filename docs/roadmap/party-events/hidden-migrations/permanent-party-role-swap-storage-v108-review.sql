-- REVIEW ONLY. Outside deployable migrations. Disposable PostgreSQL 17 only.
-- No public RPC, no grants, no changes to current Party membership rows.
-- Parent Party row must be locked by future owner workflow before opening,
-- expiring, responding or committing a proposal.
create schema if not exists private;

create table private.party_role_swap_proposals_v108 (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  proposer_account_id uuid not null references auth.users(id) on delete cascade,
  chat_message_id uuid unique references public.chat_messages(id) on delete set null,
  roster_revision bigint not null check (roster_revision > 0),
  -- Canonical sorted server snapshot of ALL active memberships plus joined_at,
  -- current leader, party minimum level and status. Never client-authored.
  original_roster jsonb not null check (
    jsonb_typeof(original_roster) = 'object'
    and original_roster ? 'members'
    and jsonb_typeof(original_roster->'members') = 'array'
    and jsonb_array_length(original_roster->'members') between 2 and 4
  ),
  original_roster_digest text not null check (original_roster_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  state text not null default 'pending' check (state in ('pending','completed','declined','cancelled','expired')),
  closed_at timestamptz,
  committed_revision bigint,
  check (expires_at = created_at + interval '5 minutes'),
  check ((state = 'pending' and closed_at is null) or
         (state <> 'pending' and closed_at is not null and closed_at >= created_at)),
  check ((state = 'completed' and committed_revision = roster_revision + 1 and committed_revision is not null and closed_at < expires_at)
         or (state <> 'completed' and committed_revision is null)),
  unique (id,party_id)
);
-- One active proposal per Party. Expire old rows under the Party lock before
-- opening another; do not make clock-dependent partial index predicates.
create unique index party_role_swap_one_pending_v108
  on private.party_role_swap_proposals_v108(party_id) where state='pending';

create table private.party_role_swap_participants_v108 (
  proposal_id uuid not null references private.party_role_swap_proposals_v108(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  from_character_id uuid not null,
  to_character_id uuid not null,
  from_role text not null check (from_role in ('tank','damage','support')),
  to_role text not null check (to_role in ('tank','damage','support')),
  -- Historical IDs are not foreign keys to mutable character rows; final
  -- commit must re-read and lock ownership. No gear or inventory transfer.
  decision text check (decision in ('accept','decline')),
  decided_at timestamptz,
  primary key (proposal_id,account_id),
  unique (proposal_id,from_character_id),
  unique (proposal_id,to_character_id),
  check (from_character_id <> to_character_id and from_role <> to_role),
  check ((decision is null and decided_at is null) or (decision is not null and decided_at is not null))
);

create table private.party_chat_action_receipts_v108 (
  account_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null check (request_id ~ '^[A-Za-z0-9:_-]{1,128}$'),
  party_id uuid not null references public.parties(id) on delete cascade,
  source_id uuid not null,
  message_id uuid not null,
  kind text not null check (kind in ('role_swap','contract_vote','event_vote','group_readiness','recruitment_request')),
  request_digest text not null check (request_digest ~ '^[a-f0-9]{64}$'),
  effect_id uuid not null unique,
  effect_digest text not null check (effect_digest ~ '^[a-f0-9]{64}$'),
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (account_id,request_id)
);

alter table private.party_role_swap_proposals_v108 enable row level security;
alter table private.party_role_swap_participants_v108 enable row level security;
alter table private.party_chat_action_receipts_v108 enable row level security;
revoke all on private.party_role_swap_proposals_v108,
 private.party_role_swap_participants_v108,
 private.party_chat_action_receipts_v108 from public, anon, authenticated, service_role;
-- Intentionally no policies, service-role grants or callable writer. Real
-- mutation must enforce role/ownership, immutable proposal, server time,
-- all consent, current roster, activity locks and readback in one transaction.
