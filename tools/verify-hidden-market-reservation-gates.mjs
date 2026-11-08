import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=relative=>readFileSync(path.join(root,relative),'utf8');
const base=read('backend/supabase/migrations/20261108171500_player_market_private_custody_foundation_v1.sql');
const reserve=read('backend/supabase/migrations/20261108173000_market_atomic_stack_reservation_private_v2.sql');
const cancel=read('backend/supabase/migrations/20261108173100_market_safe_cancellation_private_v2.sql');
const dbTest=read('backend/supabase/tests/player_market_atomic_reservations_v2.sql');
const returnClaim=read('backend/supabase/migrations/20261108174500_market_return_claims_private_v3.sql');
const purchase=read('backend/supabase/migrations/20261108175500_market_gold_purchase_private_v3.sql');
const returnTest=read('backend/supabase/tests/player_market_return_claims_v3.sql');
const purchaseTest=read('backend/supabase/tests/player_market_gold_purchase_v3.sql');
const release=read('apps/mobile/src/core/release-flags.ts');
const roadmap=read('apps/mobile/src/core/community-roadmap-release-visibility.ts');

function requireMatches(contents,patterns,filename){
  for(const [label,pattern] of patterns){
    assert.match(contents,pattern,filename+' must preserve '+label);
  }
}
requireMatches(base,[
  ['trading gate false',/trading_enabled boolean not null default false check \(trading_enabled = false\)/i],
  ['snapshot bridge false',/snapshot_bridge_ready boolean not null default false check \(snapshot_bridge_ready = false\)/i],
  ['tradability false',/tradable boolean not null default false check \(tradable = false\)/i],
], 'market foundation');
requireMatches(reserve,[
  ['read/escrow gate',/where singleton and trading_enabled and snapshot_bridge_ready/],
  ['state revision check',/v_row\.revision<>p_expected_revision/],
  ['matching gameplay advisory lock',/hashtextextended\('party-account:'\|\|p_account_id::text,0\)/],
  ['canonical snapshot lock',/from public\.online_game_states[\s\S]*?for update;/i],
  ['atomic source debit',/update public\.online_game_states[\s\S]*?revision=v_row\.revision\+1/],
  ['idempotent receipts',/market_action_receipts_v2/],
  ['strict resource/gem policy',/asset_kind in \('resource','gem'\)/],
  ['forbid copy markers in stacks',/k\.key not in \('itemId','quantity'\)/],
  ['revoke reserve RPC',/revoke all on function private\.market_reserve_stack_v2\([\s\S]*?from public,anon,authenticated,service_role;/i],
  ['RLS for return entitlements',/alter table private\.market_return_deliveries_v2 enable row level security;/i],
  ['funds remain drafts',/status text not null default 'draft' check\(status='draft'\)/],
  ['Gold conservation',/gross_gold::numeric=fee_gold::numeric\+seller_payout_gold::numeric/],
], 'private reservation');
requireMatches(cancel,[
  ['idempotent cancellation',/market_action_receipts_v2/],
  ['single return entitlement',/insert into private\.market_return_deliveries_v2/],
  ['close held lot',/set status='released',closed_at=now\(\)/],
  ['no direct inventory refund',/pending_return/],
  ['revoke cancellation RPC',/revoke all on function private\.market_cancel_stack_hold_v2\([\s\S]*?from public,anon,authenticated,service_role;/i],
  ['revoke expiry RPC',/revoke all on function private\.market_queue_due_returns_v2\([\s\S]*?from public,anon,authenticated,service_role;/i],
], 'private cancellation');
requireMatches(dbTest,[
  ['explicit QA gate-relaxation warning',/NEVER run the gate-relaxation block outside this rollback test/],
  ['transaction rollback',/\nrollback;\s*$/i],
  ['replay test',/reservation replay duplicated inventory debit/],
  ['cancellation replay test',/cancellation replay duplicated return entitlement/],
  ['cross-account test',/cross-account resource accepted/],
  ['Gold accounting test',/unbalanced Gold split accepted/],
  ['legacy protects crafting',/reserved cooking\/brewing inputs were sellable/],
], 'rollback test');
assert.match(release,/export const PLAYER_MARKET_RELEASED=false;/,'market remains hidden');
assert.match(roadmap,/return featureId!=='player_market';/,'unreleased market remains off Roadmap');
assert.doesNotMatch(reserve,/\bgrant execute\b/i,'never expose reserve RPCs');
assert.doesNotMatch(cancel,/\bgrant execute\b/i,'never expose cancel RPCs');
assert.doesNotMatch(reserve,/\bupdate\s+public\.character_wallets\b/i,'no Gold wallet mutation in reservation pass');
assert.doesNotMatch(cancel,/\bupdate\s+public\.online_game_states\b/i,'cancellation must only enqueue delivery, not invent inventory');

requireMatches(returnClaim,[
  ['return claim disabled gate',/where singleton and trading_enabled and snapshot_bridge_ready/],
  ['authoritative snapshot row lock',/from public\.online_game_states[\s\S]*?for update;/i],
  ['exact account-owned delivery lock',/delivery_id=p_delivery_id and recipient_account_id=p_account_id for update/],
  ['storage capacity protection',/raise exception 'market_destination_full'/],
  ['no silent quantity overflow',/raise exception 'market_destination_quantity_overflow'/],
  ['snapshot revision mutation',/revision=v_state\.revision\+1/],
  ['delivery one-time status',/set status='claimed',claimed_at=now\(\)/],
  ['receipt replay protection',/v_receipt\.action<>'claim_return'/],
  ['return claim RPC revocation',/revoke all on function private\.market_claim_return_delivery_v3\([\s\S]*?from public,anon,authenticated,service_role;/i],
], 'private returned-item claims');
requireMatches(purchase,[
  ['whole-lot purchase gated',/where singleton and trading_enabled and snapshot_bridge_ready/],
  ['deterministic dual account lock',/least\(p_buyer_account_id::text,v_seller_account_id::text\)/],
  ['both wallets reconciled',/v_buyer_gold is distinct from v_buyer_wallet[\s\S]*?v_seller_gold is distinct from v_seller_wallet/],
  ['both profiles reconciled',/v_buyer_gold is distinct from v_buyer_profile_gold[\s\S]*?v_seller_gold is distinct from v_seller_profile_gold/],
  ['require current price',/v_offer\.unit_price<>p_expected_unit_price/],
  ['require available reserved hold',/v_hold\.status<>'held'/],
  ['reject self purchases',/raise exception 'market_self_trade_denied'/],
  ['prevent overpay/negative Gold',/raise exception 'market_insufficient_gold'/],
  ['update buyer wallet',/set gold=v_new_buyer_gold,updated_at=now\(\)/],
  ['update seller wallet',/set gold=v_new_seller_gold,updated_at=now\(\)/],
  ['pending buyer item',/insert into private\.market_purchase_deliveries_v3/],
  ['settlement ledger',/insert into private\.market_gold_intents_v2/],
  ['only one buyer receipt per offer',/offer_id uuid not null unique references private\.market_sale_offers_v3/],
  ['all market tables RLS',/alter table private\.market_purchase_deliveries_v3 enable row level security;/],
  ['private purchase function revocation',/revoke all on function private\.market_purchase_stack_offer_v3\([\s\S]*?from public,anon,authenticated,service_role;/i],
], 'private Gold settlement');
requireMatches(returnTest,[
  ['return test rollback',/\nrollback;\s*$/i],
  ['full storage rollback',/full storage silently consumed the return/],
  ['no duplicate return',/duplicate return credit on retry/],
  ['inactive character',/inactive character return or Gold conservation failed/],
], 'return staging integration test');
requireMatches(purchaseTest,[
  ['purchase test rollback',/\nrollback;\s*$/i],
  ['wallet snapshot parity',/wallet \/ snapshot \/ character Gold divergence/],
  ['one buyer per offer',/same offer purchased twice/],
  ['insufficient Gold',/insufficient Gold accepted/],
  ['non-authoritative wallet refused',/unreconciled wallet accepted/],
], 'purchase staging integration test');
assert.doesNotMatch(returnClaim,/\bgrant execute\b/i,'return claims never granted to clients');
assert.doesNotMatch(purchase,/\bgrant execute\b/i,'Gold purchases never granted to clients');
assert.doesNotMatch(returnClaim,/\bupdate\s+public\.character_wallets\b/i,'resource refund does not move Gold');
assert.match(purchase,/status text not null default 'pending' check\(status='pending'\)/,
  'buyer item claim remains disabled until audited');

console.log('PASS: hidden market V2/V3 ACLs, atomic claims, wallet settlement and release gates remain private');
