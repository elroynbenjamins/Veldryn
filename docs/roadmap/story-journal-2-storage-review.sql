-- REVIEW ONLY: not a migration, not applied to any database.
-- Private storage candidate. Install only in isolated test DB after review.
begin;
create schema if not exists private;
create table private.story_journal2_account_review (
 account_id uuid primary key,
 account_revision bigint not null check (account_revision >= 0),
 catalogue_version text not null check (length(catalogue_version) between 1 and 160),
 compact_state jsonb not null check (jsonb_typeof(compact_state) = 'object'
  and compact_state ? 'characters' and jsonb_typeof(compact_state->'characters') = 'array'
  and not (compact_state ? 'events') and not (compact_state ? 'receipts')
  and octet_length(compact_state::text) <= 262144),
 updated_at timestamptz not null default now()
);
create table private.story_journal2_entitlement_review (
 account_id uuid not null,
 character_id uuid not null,
 quest_id text not null check (length(quest_id) between 1 and 160),
 policy_version text not null check (length(policy_version) between 1 and 160),
 request_id text not null check (request_id ~ '^[A-Za-z0-9_-]{8,128}$'),
 reward_hash text not null check (reward_hash ~ '^[a-f0-9]{64}$'),
 settled_revision bigint not null check (settled_revision >= 1),
 created_at timestamptz not null default now(),
 primary key (account_id,character_id,quest_id),
 unique (account_id,request_id)
);
alter table private.story_journal2_account_review enable row level security;
alter table private.story_journal2_entitlement_review enable row level security;
revoke all on private.story_journal2_account_review, private.story_journal2_entitlement_review from public, anon, authenticated;
grant select,insert,update on private.story_journal2_account_review to service_role;
grant select,insert on private.story_journal2_entitlement_review to service_role;
-- No direct client policy, public RPC, trigger, wallet write, or backfill.
-- Actual writer must acquire the existing party-account advisory lock first,
-- then online_game_states row FOR UPDATE, then Journal row.
-- Retain entitlement rows on character deletion; account erasure is a separate
-- reviewed privacy/lifecycle operation. Existing server_action_receipts owns replay.
rollback;
