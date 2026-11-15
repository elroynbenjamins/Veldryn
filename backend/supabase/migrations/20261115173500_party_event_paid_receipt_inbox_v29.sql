-- Veldryn Party Events v29: durable, mutually coupled RECEIPT + INBOX schema.
-- DRAFT ONLY. This migration has NO payout function, NO claim entrypoint,
-- NO reward updater, NO public access, and does NOT release Party Events.
-- Depends on the hidden v11-v25 Party Event migrations (not deployed).
begin;

-- Receipt and mailbox rows are future "paid" records, not provisional grants.
-- Neither can be inserted by ordinary service_role credentials: only a future
-- separately reviewed SECURITY DEFINER atomic payout writer could do so.
create table private.party_event_paid_claim_receipts_v29 (
 id uuid primary key default gen_random_uuid(),
 inbox_id uuid not null unique,
 offer_id uuid not null unique
   references private.party_event_reward_offers_v24(id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid not null,
 reservation_id uuid not null,
 event_starts_at timestamptz not null,
 request_id text not null check(request_id ~ '^[a-zA-Z0-9_-]{8,128}$'),
 reward_model text not null check(reward_model='party-event-rewards-v2'),
 reward_kind text not null check(reward_kind in
   ('participation','warrior','artisan','companion')),
 reward_hash text not null check(reward_hash ~ '^[a-f0-9]{64}
 source_revision bigint not null check(source_revision>=0),
 settled_revision bigint not null check(settled_revision=source_revision+1),
 -- The prepared grant is verified against locked online state; these amounts
 -- are retained for audit, not independently authorizing any credit.
 gold_delta bigint not null check(gold_delta>=0),
 combat_xp_delta bigint not null check(combat_xp_delta>=0),
 profession_xp_delta bigint not null check(profession_xp_delta>=0),
 profession_skill_id text,
 companion_essence_delta bigint not null check(companion_essence_delta>=0),
 bondstones_delta bigint not null check(bondstones_delta>=0),
 party_renown_delta bigint not null check(party_renown_delta>=0),
 gem_dust_delta bigint not null check(gem_dust_delta>=0),
 state_after_hash text not null check(state_after_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'paid' check(status='paid'),
 created_at timestamptz not null default now(),
 unique(event_starts_at,account_id),
 unique(account_id,request_id),
 unique(id,account_id,offer_id,reward_hash),
 foreign key(event_starts_at,account_id)
   references private.party_event_reward_offers_v24(event_starts_at,account_id)
   on delete cascade,
 foreign key(character_id,account_id)
   references public.characters(id,account_id) on delete cascade,
 check((profession_xp_delta>0)=(profession_skill_id is not null)),
 check(profession_skill_id is null or profession_skill_id in
   ('mining','woodcutting','fishing','smithing','cooking','herbalism',
    'alchemy','exploration','tailoring','enchanting','faith'))
);

create table private.party_event_paid_claim_inbox_v29 (
 id uuid primary key default gen_random_uuid(),
 receipt_id uuid not null unique,
 offer_id uuid not null unique
   references private.party_event_reward_offers_v24(id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid not null,
 event_starts_at timestamptz not null,
 title text not null check(length(title) between 1 and 100),
 reward_json jsonb not null check(jsonb_typeof(reward_json)='object'),
 reward_hash text not null check(reward_hash ~ '^[a-f0-9]{64}
 delivery_state text not null default 'delivered'
   check(delivery_state='delivered'),
 delivered_at timestamptz not null default now(),
 unique(event_starts_at,account_id),
 unique(id,account_id,offer_id,reward_hash),
 foreign key(event_starts_at,account_id)
   references private.party_event_reward_offers_v24(event_starts_at,account_id)
   on delete cascade,
 foreign key(character_id,account_id)
   references public.characters(id,account_id) on delete cascade
);

-- These TWO cyclic, deferred foreign keys are essential: a transaction may
-- insert both records in either order; COMMIT fails if either is absent.
-- A receipt cannot survive without its own Inbox message and vice versa.
alter table private.party_event_paid_claim_receipts_v29
 add constraint party_event_v29_receipt_inbox_pair
 foreign key(inbox_id,account_id,offer_id,reward_hash)
 references private.party_event_paid_claim_inbox_v29(id,account_id,offer_id,reward_hash)
 deferrable initially deferred;
alter table private.party_event_paid_claim_inbox_v29
 add constraint party_event_v29_inbox_receipt_pair
 foreign key(receipt_id,account_id,offer_id,reward_hash)
 references private.party_event_paid_claim_receipts_v29(id,account_id,offer_id,reward_hash)
 deferrable initially deferred;

alter table private.party_event_paid_claim_receipts_v29 enable row level security;
alter table private.party_event_paid_claim_inbox_v29 enable row level security;
revoke all on private.party_event_paid_claim_receipts_v29,
 private.party_event_paid_claim_inbox_v29
 from public,anon,authenticated,service_role;
grant select on private.party_event_paid_claim_receipts_v29,
 private.party_event_paid_claim_inbox_v29 to service_role;

-- Service role cannot UPDATE/DELETE paid records. Immutable UPDATE triggers
-- guard owners; ON DELETE CASCADE remains available for account erasure.
create trigger party_event_paid_receipt_immutable_v29
 before update on private.party_event_paid_claim_receipts_v29
 for each row execute function private.party_event_progress_immutable_v14();
create trigger party_event_paid_inbox_immutable_v29
 before update on private.party_event_paid_claim_inbox_v29
 for each row execute function private.party_event_progress_immutable_v14();

comment on table private.party_event_paid_claim_receipts_v29 is
 'Draft only; future exactly-once paid receipts, no writer in v29. Inbox FK checked at commit.';
comment on table private.party_event_paid_claim_inbox_v29 is
 'Draft only; atomic, paired reward Inbox, no writer in v29. Delivery is not a second transfer.';

-- Private, read-only mailbox. The SERVER MUST resolve p_account_id from its
-- authenticated session; never expose this function through an unauthenticated
-- gateway or let a player pass a different account_id. Zero rows in v29.
create or replace function private.read_party_event_paid_inbox_v29(
 p_account_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb;
begin
 if p_account_id is null then
  raise exception 'party_event_v29_account_required';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'receiptId',r.id,'inboxId',m.id,'offerId',r.offer_id,
   'characterId',r.character_id,'eventStartsAt',r.event_starts_at,
   'title',m.title,'rewardKind',r.reward_kind,
   'reward',m.reward_json,'rewardHash',m.reward_hash,
   'deliveredAt',m.delivered_at,'deliveryState',m.delivery_state,
   'claimed',true,'economyApplied',true,'inboxDelivered',true)
   order by m.delivered_at desc,m.id),'[]'::jsonb) into v_items
 from private.party_event_paid_claim_inbox_v29 m
 join private.party_event_paid_claim_receipts_v29 r
   on r.id=m.receipt_id and r.inbox_id=m.id
   and r.account_id=m.account_id and r.offer_id=m.offer_id
 where m.account_id=p_account_id;
 return jsonb_build_object(
   'items',v_items,
   'claimEndpointEnabled',false,
   'payoutWriterInstalled',false);
end;$$;

revoke all on function private.read_party_event_paid_inbox_v29(uuid)
 from public,anon,authenticated,service_role;
grant execute on function private.read_party_event_paid_inbox_v29(uuid)
 to service_role;

-- Intentionally NO public/private paid-claim function and NO INSERT grants.
commit;
),
 reward_json jsonb not null check(jsonb_typeof(reward_json)='object'),
 constraint paid_receipt_reward_hash_verified_v29 check(
   reward_hash=encode(sha256(convert_to(reward_json::text,'UTF8')),'hex')),
 source_revision bigint not null check(source_revision>=0),
 settled_revision bigint not null check(settled_revision=source_revision+1),
 -- The prepared grant is verified against locked online state; these amounts
 -- are retained for audit, not independently authorizing any credit.
 gold_delta bigint not null check(gold_delta>=0),
 combat_xp_delta bigint not null check(combat_xp_delta>=0),
 profession_xp_delta bigint not null check(profession_xp_delta>=0),
 profession_skill_id text,
 companion_essence_delta bigint not null check(companion_essence_delta>=0),
 bondstones_delta bigint not null check(bondstones_delta>=0),
 party_renown_delta bigint not null check(party_renown_delta>=0),
 gem_dust_delta bigint not null check(gem_dust_delta>=0),
 state_after_hash text not null check(state_after_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'paid' check(status='paid'),
 created_at timestamptz not null default now(),
 unique(event_starts_at,account_id),
 unique(account_id,request_id),
 unique(id,account_id,offer_id,reward_hash),
 foreign key(event_starts_at,account_id)
   references private.party_event_reward_offers_v24(event_starts_at,account_id)
   on delete cascade,
 foreign key(character_id,account_id)
   references public.characters(id,account_id) on delete cascade,
 check((profession_xp_delta>0)=(profession_skill_id is not null)),
 check(profession_skill_id is null or profession_skill_id in
   ('mining','woodcutting','fishing','smithing','cooking','herbalism',
    'alchemy','exploration','tailoring','enchanting','faith'))
);

create table private.party_event_paid_claim_inbox_v29 (
 id uuid primary key default gen_random_uuid(),
 receipt_id uuid not null unique,
 offer_id uuid not null unique
   references private.party_event_reward_offers_v24(id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid not null,
 event_starts_at timestamptz not null,
 title text not null check(length(title) between 1 and 100),
 reward_json jsonb not null check(jsonb_typeof(reward_json)='object'),
 reward_hash text not null check(reward_hash ~ '^[a-f0-9]{64}$'),
 delivery_state text not null default 'delivered'
   check(delivery_state='delivered'),
 delivered_at timestamptz not null default now(),
 unique(event_starts_at,account_id),
 unique(id,account_id,offer_id,reward_hash),
 foreign key(event_starts_at,account_id)
   references private.party_event_reward_offers_v24(event_starts_at,account_id)
   on delete cascade,
 foreign key(character_id,account_id)
   references public.characters(id,account_id) on delete cascade
);

-- These TWO cyclic, deferred foreign keys are essential: a transaction may
-- insert both records in either order; COMMIT fails if either is absent.
-- A receipt cannot survive without its own Inbox message and vice versa.
alter table private.party_event_paid_claim_receipts_v29
 add constraint party_event_v29_receipt_inbox_pair
 foreign key(inbox_id,account_id,offer_id,reward_hash)
 references private.party_event_paid_claim_inbox_v29(id,account_id,offer_id,reward_hash)
 deferrable initially deferred;
alter table private.party_event_paid_claim_inbox_v29
 add constraint party_event_v29_inbox_receipt_pair
 foreign key(receipt_id,account_id,offer_id,reward_hash)
 references private.party_event_paid_claim_receipts_v29(id,account_id,offer_id,reward_hash)
 deferrable initially deferred;

alter table private.party_event_paid_claim_receipts_v29 enable row level security;
alter table private.party_event_paid_claim_inbox_v29 enable row level security;
revoke all on private.party_event_paid_claim_receipts_v29,
 private.party_event_paid_claim_inbox_v29
 from public,anon,authenticated,service_role;
grant select on private.party_event_paid_claim_receipts_v29,
 private.party_event_paid_claim_inbox_v29 to service_role;

-- Service role cannot UPDATE/DELETE paid records. Immutable UPDATE triggers
-- guard owners; ON DELETE CASCADE remains available for account erasure.
create trigger party_event_paid_receipt_immutable_v29
 before update on private.party_event_paid_claim_receipts_v29
 for each row execute function private.party_event_progress_immutable_v14();
create trigger party_event_paid_inbox_immutable_v29
 before update on private.party_event_paid_claim_inbox_v29
 for each row execute function private.party_event_progress_immutable_v14();

comment on table private.party_event_paid_claim_receipts_v29 is
 'Draft only; future exactly-once paid receipts, no writer in v29. Inbox FK checked at commit.';
comment on table private.party_event_paid_claim_inbox_v29 is
 'Draft only; atomic, paired reward Inbox, no writer in v29. Delivery is not a second transfer.';

-- Private, read-only mailbox. The SERVER MUST resolve p_account_id from its
-- authenticated session; never expose this function through an unauthenticated
-- gateway or let a player pass a different account_id. Zero rows in v29.
create or replace function private.read_party_event_paid_inbox_v29(
 p_account_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb;
begin
 if p_account_id is null then
  raise exception 'party_event_v29_account_required';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'receiptId',r.id,'inboxId',m.id,'offerId',r.offer_id,
   'characterId',r.character_id,'eventStartsAt',r.event_starts_at,
   'title',m.title,'rewardKind',r.reward_kind,
   'reward',m.reward_json,'rewardHash',m.reward_hash,
   'deliveredAt',m.delivered_at,'deliveryState',m.delivery_state,
   'claimed',true,'economyApplied',true,'inboxDelivered',true)
   order by m.delivered_at desc,m.id),'[]'::jsonb) into v_items
 from private.party_event_paid_claim_inbox_v29 m
 join private.party_event_paid_claim_receipts_v29 r
   on r.id=m.receipt_id and r.inbox_id=m.id
   and r.account_id=m.account_id and r.offer_id=m.offer_id
 where m.account_id=p_account_id;
 return jsonb_build_object(
   'items',v_items,
   'claimEndpointEnabled',false,
   'payoutWriterInstalled',false);
end;$$;

revoke all on function private.read_party_event_paid_inbox_v29(uuid)
 from public,anon,authenticated,service_role;
grant execute on function private.read_party_event_paid_inbox_v29(uuid)
 to service_role;

-- Intentionally NO public/private paid-claim function and NO INSERT grants.
commit;
),
 constraint paid_inbox_reward_hash_verified_v29 check(
   reward_hash=encode(sha256(convert_to(reward_json::text,'UTF8')),'hex')),
 delivery_state text not null default 'delivered'
   check(delivery_state='delivered'),
 delivered_at timestamptz not null default now(),
 unique(event_starts_at,account_id),
 unique(id,account_id,offer_id,reward_hash),
 foreign key(event_starts_at,account_id)
   references private.party_event_reward_offers_v24(event_starts_at,account_id)
   on delete cascade,
 foreign key(character_id,account_id)
   references public.characters(id,account_id) on delete cascade
);

-- These TWO cyclic, deferred foreign keys are essential: a transaction may
-- insert both records in either order; COMMIT fails if either is absent.
-- A receipt cannot survive without its own Inbox message and vice versa.
alter table private.party_event_paid_claim_receipts_v29
 add constraint party_event_v29_receipt_inbox_pair
 foreign key(inbox_id,account_id,offer_id,reward_hash)
 references private.party_event_paid_claim_inbox_v29(id,account_id,offer_id,reward_hash)
 deferrable initially deferred;
alter table private.party_event_paid_claim_inbox_v29
 add constraint party_event_v29_inbox_receipt_pair
 foreign key(receipt_id,account_id,offer_id,reward_hash)
 references private.party_event_paid_claim_receipts_v29(id,account_id,offer_id,reward_hash)
 deferrable initially deferred;

alter table private.party_event_paid_claim_receipts_v29 enable row level security;
alter table private.party_event_paid_claim_inbox_v29 enable row level security;
revoke all on private.party_event_paid_claim_receipts_v29,
 private.party_event_paid_claim_inbox_v29
 from public,anon,authenticated,service_role;
grant select on private.party_event_paid_claim_receipts_v29,
 private.party_event_paid_claim_inbox_v29 to service_role;

-- Service role cannot UPDATE/DELETE paid records. Immutable UPDATE triggers
-- guard owners; ON DELETE CASCADE remains available for account erasure.
create trigger party_event_paid_receipt_immutable_v29
 before update on private.party_event_paid_claim_receipts_v29
 for each row execute function private.party_event_progress_immutable_v14();
create trigger party_event_paid_inbox_immutable_v29
 before update on private.party_event_paid_claim_inbox_v29
 for each row execute function private.party_event_progress_immutable_v14();

comment on table private.party_event_paid_claim_receipts_v29 is
 'Draft only; future exactly-once paid receipts, no writer in v29. Inbox FK checked at commit.';
comment on table private.party_event_paid_claim_inbox_v29 is
 'Draft only; atomic, paired reward Inbox, no writer in v29. Delivery is not a second transfer.';

-- Private, read-only mailbox. The SERVER MUST resolve p_account_id from its
-- authenticated session; never expose this function through an unauthenticated
-- gateway or let a player pass a different account_id. Zero rows in v29.
create or replace function private.read_party_event_paid_inbox_v29(
 p_account_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb;
begin
 if p_account_id is null then
  raise exception 'party_event_v29_account_required';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'receiptId',r.id,'inboxId',m.id,'offerId',r.offer_id,
   'characterId',r.character_id,'eventStartsAt',r.event_starts_at,
   'title',m.title,'rewardKind',r.reward_kind,
   'reward',m.reward_json,'rewardHash',m.reward_hash,
   'deliveredAt',m.delivered_at,'deliveryState',m.delivery_state,
   'claimed',true,'economyApplied',true,'inboxDelivered',true)
   order by m.delivered_at desc,m.id),'[]'::jsonb) into v_items
 from private.party_event_paid_claim_inbox_v29 m
 join private.party_event_paid_claim_receipts_v29 r
   on r.id=m.receipt_id and r.inbox_id=m.id
   and r.account_id=m.account_id and r.offer_id=m.offer_id
 where m.account_id=p_account_id;
 return jsonb_build_object(
   'items',v_items,
   'claimEndpointEnabled',false,
   'payoutWriterInstalled',false);
end;$$;

revoke all on function private.read_party_event_paid_inbox_v29(uuid)
 from public,anon,authenticated,service_role;
grant execute on function private.read_party_event_paid_inbox_v29(uuid)
 to service_role;

-- Intentionally NO public/private paid-claim function and NO INSERT grants.
commit;
),
 reward_json jsonb not null check(jsonb_typeof(reward_json)='object'),
 constraint paid_receipt_reward_hash_verified_v29 check(
   reward_hash=encode(sha256(convert_to(reward_json::text,'UTF8')),'hex')),
 source_revision bigint not null check(source_revision>=0),
 settled_revision bigint not null check(settled_revision=source_revision+1),
 -- The prepared grant is verified against locked online state; these amounts
 -- are retained for audit, not independently authorizing any credit.
 gold_delta bigint not null check(gold_delta>=0),
 combat_xp_delta bigint not null check(combat_xp_delta>=0),
 profession_xp_delta bigint not null check(profession_xp_delta>=0),
 profession_skill_id text,
 companion_essence_delta bigint not null check(companion_essence_delta>=0),
 bondstones_delta bigint not null check(bondstones_delta>=0),
 party_renown_delta bigint not null check(party_renown_delta>=0),
 gem_dust_delta bigint not null check(gem_dust_delta>=0),
 state_after_hash text not null check(state_after_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'paid' check(status='paid'),
 created_at timestamptz not null default now(),
 unique(event_starts_at,account_id),
 unique(account_id,request_id),
 unique(id,account_id,offer_id,reward_hash),
 foreign key(event_starts_at,account_id)
   references private.party_event_reward_offers_v24(event_starts_at,account_id)
   on delete cascade,
 foreign key(character_id,account_id)
   references public.characters(id,account_id) on delete cascade,
 check((profession_xp_delta>0)=(profession_skill_id is not null)),
 check(profession_skill_id is null or profession_skill_id in
   ('mining','woodcutting','fishing','smithing','cooking','herbalism',
    'alchemy','exploration','tailoring','enchanting','faith'))
);

create table private.party_event_paid_claim_inbox_v29 (
 id uuid primary key default gen_random_uuid(),
 receipt_id uuid not null unique,
 offer_id uuid not null unique
   references private.party_event_reward_offers_v24(id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid not null,
 event_starts_at timestamptz not null,
 title text not null check(length(title) between 1 and 100),
 reward_json jsonb not null check(jsonb_typeof(reward_json)='object'),
 reward_hash text not null check(reward_hash ~ '^[a-f0-9]{64}
 delivery_state text not null default 'delivered'
   check(delivery_state='delivered'),
 delivered_at timestamptz not null default now(),
 unique(event_starts_at,account_id),
 unique(id,account_id,offer_id,reward_hash),
 foreign key(event_starts_at,account_id)
   references private.party_event_reward_offers_v24(event_starts_at,account_id)
   on delete cascade,
 foreign key(character_id,account_id)
   references public.characters(id,account_id) on delete cascade
);

-- These TWO cyclic, deferred foreign keys are essential: a transaction may
-- insert both records in either order; COMMIT fails if either is absent.
-- A receipt cannot survive without its own Inbox message and vice versa.
alter table private.party_event_paid_claim_receipts_v29
 add constraint party_event_v29_receipt_inbox_pair
 foreign key(inbox_id,account_id,offer_id,reward_hash)
 references private.party_event_paid_claim_inbox_v29(id,account_id,offer_id,reward_hash)
 deferrable initially deferred;
alter table private.party_event_paid_claim_inbox_v29
 add constraint party_event_v29_inbox_receipt_pair
 foreign key(receipt_id,account_id,offer_id,reward_hash)
 references private.party_event_paid_claim_receipts_v29(id,account_id,offer_id,reward_hash)
 deferrable initially deferred;

alter table private.party_event_paid_claim_receipts_v29 enable row level security;
alter table private.party_event_paid_claim_inbox_v29 enable row level security;
revoke all on private.party_event_paid_claim_receipts_v29,
 private.party_event_paid_claim_inbox_v29
 from public,anon,authenticated,service_role;
grant select on private.party_event_paid_claim_receipts_v29,
 private.party_event_paid_claim_inbox_v29 to service_role;

-- Service role cannot UPDATE/DELETE paid records. Immutable UPDATE triggers
-- guard owners; ON DELETE CASCADE remains available for account erasure.
create trigger party_event_paid_receipt_immutable_v29
 before update on private.party_event_paid_claim_receipts_v29
 for each row execute function private.party_event_progress_immutable_v14();
create trigger party_event_paid_inbox_immutable_v29
 before update on private.party_event_paid_claim_inbox_v29
 for each row execute function private.party_event_progress_immutable_v14();

comment on table private.party_event_paid_claim_receipts_v29 is
 'Draft only; future exactly-once paid receipts, no writer in v29. Inbox FK checked at commit.';
comment on table private.party_event_paid_claim_inbox_v29 is
 'Draft only; atomic, paired reward Inbox, no writer in v29. Delivery is not a second transfer.';

-- Private, read-only mailbox. The SERVER MUST resolve p_account_id from its
-- authenticated session; never expose this function through an unauthenticated
-- gateway or let a player pass a different account_id. Zero rows in v29.
create or replace function private.read_party_event_paid_inbox_v29(
 p_account_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb;
begin
 if p_account_id is null then
  raise exception 'party_event_v29_account_required';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'receiptId',r.id,'inboxId',m.id,'offerId',r.offer_id,
   'characterId',r.character_id,'eventStartsAt',r.event_starts_at,
   'title',m.title,'rewardKind',r.reward_kind,
   'reward',m.reward_json,'rewardHash',m.reward_hash,
   'deliveredAt',m.delivered_at,'deliveryState',m.delivery_state,
   'claimed',true,'economyApplied',true,'inboxDelivered',true)
   order by m.delivered_at desc,m.id),'[]'::jsonb) into v_items
 from private.party_event_paid_claim_inbox_v29 m
 join private.party_event_paid_claim_receipts_v29 r
   on r.id=m.receipt_id and r.inbox_id=m.id
   and r.account_id=m.account_id and r.offer_id=m.offer_id
 where m.account_id=p_account_id;
 return jsonb_build_object(
   'items',v_items,
   'claimEndpointEnabled',false,
   'payoutWriterInstalled',false);
end;$$;

revoke all on function private.read_party_event_paid_inbox_v29(uuid)
 from public,anon,authenticated,service_role;
grant execute on function private.read_party_event_paid_inbox_v29(uuid)
 to service_role;

-- Intentionally NO public/private paid-claim function and NO INSERT grants.
commit;
),
 constraint paid_inbox_reward_hash_verified_v29 check(
   reward_hash=encode(sha256(convert_to(reward_json::text,'UTF8')),'hex')),
 delivery_state text not null default 'delivered'
   check(delivery_state='delivered'),
 delivered_at timestamptz not null default now(),
 unique(event_starts_at,account_id),
 unique(id,account_id,offer_id,reward_hash),
 foreign key(event_starts_at,account_id)
   references private.party_event_reward_offers_v24(event_starts_at,account_id)
   on delete cascade,
 foreign key(character_id,account_id)
   references public.characters(id,account_id) on delete cascade
);

-- These TWO cyclic, deferred foreign keys are essential: a transaction may
-- insert both records in either order; COMMIT fails if either is absent.
-- A receipt cannot survive without its own Inbox message and vice versa.
alter table private.party_event_paid_claim_receipts_v29
 add constraint party_event_v29_receipt_inbox_pair
 foreign key(inbox_id,account_id,offer_id,reward_hash)
 references private.party_event_paid_claim_inbox_v29(id,account_id,offer_id,reward_hash)
 deferrable initially deferred;
alter table private.party_event_paid_claim_inbox_v29
 add constraint party_event_v29_inbox_receipt_pair
 foreign key(receipt_id,account_id,offer_id,reward_hash)
 references private.party_event_paid_claim_receipts_v29(id,account_id,offer_id,reward_hash)
 deferrable initially deferred;

alter table private.party_event_paid_claim_receipts_v29 enable row level security;
alter table private.party_event_paid_claim_inbox_v29 enable row level security;
revoke all on private.party_event_paid_claim_receipts_v29,
 private.party_event_paid_claim_inbox_v29
 from public,anon,authenticated,service_role;
grant select on private.party_event_paid_claim_receipts_v29,
 private.party_event_paid_claim_inbox_v29 to service_role;

-- Service role cannot UPDATE/DELETE paid records. Immutable UPDATE triggers
-- guard owners; ON DELETE CASCADE remains available for account erasure.
create trigger party_event_paid_receipt_immutable_v29
 before update on private.party_event_paid_claim_receipts_v29
 for each row execute function private.party_event_progress_immutable_v14();
create trigger party_event_paid_inbox_immutable_v29
 before update on private.party_event_paid_claim_inbox_v29
 for each row execute function private.party_event_progress_immutable_v14();

comment on table private.party_event_paid_claim_receipts_v29 is
 'Draft only; future exactly-once paid receipts, no writer in v29. Inbox FK checked at commit.';
comment on table private.party_event_paid_claim_inbox_v29 is
 'Draft only; atomic, paired reward Inbox, no writer in v29. Delivery is not a second transfer.';

-- Private, read-only mailbox. The SERVER MUST resolve p_account_id from its
-- authenticated session; never expose this function through an unauthenticated
-- gateway or let a player pass a different account_id. Zero rows in v29.
create or replace function private.read_party_event_paid_inbox_v29(
 p_account_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb;
begin
 if p_account_id is null then
  raise exception 'party_event_v29_account_required';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'receiptId',r.id,'inboxId',m.id,'offerId',r.offer_id,
   'characterId',r.character_id,'eventStartsAt',r.event_starts_at,
   'title',m.title,'rewardKind',r.reward_kind,
   'reward',m.reward_json,'rewardHash',m.reward_hash,
   'deliveredAt',m.delivered_at,'deliveryState',m.delivery_state,
   'claimed',true,'economyApplied',true,'inboxDelivered',true)
   order by m.delivered_at desc,m.id),'[]'::jsonb) into v_items
 from private.party_event_paid_claim_inbox_v29 m
 join private.party_event_paid_claim_receipts_v29 r
   on r.id=m.receipt_id and r.inbox_id=m.id
   and r.account_id=m.account_id and r.offer_id=m.offer_id
 where m.account_id=p_account_id;
 return jsonb_build_object(
   'items',v_items,
   'claimEndpointEnabled',false,
   'payoutWriterInstalled',false);
end;$$;

revoke all on function private.read_party_event_paid_inbox_v29(uuid)
 from public,anon,authenticated,service_role;
grant execute on function private.read_party_event_paid_inbox_v29(uuid)
 to service_role;

-- Intentionally NO public/private paid-claim function and NO INSERT grants.
commit;
