-- Veldryn Party Events V61: REVIEW-ONLY, NOT A DEPLOYABLE MIGRATION.
-- Requires private Party Events V11 and the not-yet-approved V43–V50 source stack.
-- No claim handler, currency grant, item mint or public read RPC is installed.
-- DO NOT MOVE into backend/supabase/migrations or apply to staging/production.
begin;

create table private.party_event_reward_receipts_v61 (
 source_key text primary key,
 party_id uuid not null,
 event_starts_at timestamptz not null,
 account_id uuid not null references auth.users(id) on delete cascade,
 origin text not null check (origin in ('chest','exchange')),
 chest_kind text check (chest_kind in ('participation','preparation','finale')),
 piece_id text,
 item_instance_id uuid,
 exact_item_receipt_version text,
 party_sigils_delta integer not null,
 gold integer not null,
 gem_dust integer not null,
 companion_essence integer not null,
 rules_version text not null check (rules_version='party-event-reward-v60'),
 canonical_proof_version text not null check(canonical_proof_version='party-event-proof-v61'),
 receipt jsonb not null check (jsonb_typeof(receipt)='object'),
 committed_at timestamptz not null default now(),
 foreign key(party_id,event_starts_at,account_id)
  references private.party_event_roster_v11(party_id,event_starts_at,account_id)
  on delete cascade,
 constraint party_event_reward_receipt_v61_source_identity check (
  source_key='party-event:'||
   (floor(extract(epoch from event_starts_at)*1000))::bigint::text||':'||
   account_id::text||':'||
   case when origin='chest' then chest_kind else 'exchange' end
 ),
 constraint party_event_reward_receipt_v61_origin check (
  (origin='chest' and chest_kind is not null and party_sigils_delta>=0) or
  (origin='exchange' and chest_kind is null and party_sigils_delta=-60
   and gold=0 and gem_dust=0 and companion_essence=0
   and piece_id is not null and item_instance_id is not null)
 ),
 constraint party_event_reward_receipt_v61_frozen_item check (
  (piece_id is null and item_instance_id is null and exact_item_receipt_version is null) or
  (piece_id is not null and item_instance_id is not null and
   length(exact_item_receipt_version) between 3 and 100)
 ),
 constraint party_event_reward_receipt_v61_canonical_amounts check (
  (origin='chest' and
   ((chest_kind='participation' and party_sigils_delta=8 and gold=200
     and gem_dust=2 and companion_essence=4) or
    (chest_kind='preparation' and party_sigils_delta=10 and gold=300
     and gem_dust=3 and companion_essence=5) or
    (chest_kind='finale' and party_sigils_delta=16 and gold=500
     and gem_dust=5 and companion_essence=8))) or
  (origin='exchange' and party_sigils_delta=-60 and gold=0
   and gem_dust=0 and companion_essence=0)
 ),
 constraint party_event_reward_receipt_v61_receipt_parity check (
  receipt->>'sourceKey'=source_key and receipt->>'accountId'=account_id::text
  and receipt->>'rulesVersion'=rules_version
  and receipt->>'origin'=origin
  and receipt->>'partySigilsDelta'=party_sigils_delta::text
  and receipt->>'gold'=gold::text
  and receipt->>'gemDust'=gem_dust::text
  and receipt->>'companionEssence'=companion_essence::text
  and (receipt->>'chestKind') is not distinct from chest_kind
  and (receipt->>'pieceId') is not distinct from piece_id
  and (receipt->>'weekStartMs')::bigint =
   (floor(extract(epoch from event_starts_at)*1000))::bigint
 )
);

-- PK is global source dedupe. A second unique guard makes the one-per-kind
-- and one-exchange/account/week contract explicit, across all Party IDs.
create unique index party_event_reward_claim_once_v61
 on private.party_event_reward_receipts_v61(account_id,event_starts_at,chest_kind)
 where origin='chest';
create unique index party_event_reward_exchange_once_v61
 on private.party_event_reward_receipts_v61(account_id,event_starts_at)
 where origin='exchange';
create unique index party_event_reward_item_instance_once_v61
 on private.party_event_reward_receipts_v61(item_instance_id)
 where item_instance_id is not null;

alter table private.party_event_reward_receipts_v61 enable row level security;
revoke all on private.party_event_reward_receipts_v61 from public,anon,authenticated,service_role;
-- Read-only until a reviewed single-transaction grant writer is installed.
grant select on private.party_event_reward_receipts_v61 to service_role;

create or replace function private.party_event_reward_receipt_immutable_v61()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 raise exception 'party_event_v61_receipt_immutable';
end;$$;
create trigger party_event_reward_receipt_no_updates_v61
 before update on private.party_event_reward_receipts_v61
 for each row execute function private.party_event_reward_receipt_immutable_v61();

revoke all on function private.party_event_reward_receipt_immutable_v61()
 from public,anon,authenticated,service_role;

comment on table private.party_event_reward_receipts_v61 is
 'UNRELEASED source immutable receipt schema. No insert grant or grant writer; actual rewards require atomic game inventory/wallet/Inbox/Day8 transaction.';

commit;
