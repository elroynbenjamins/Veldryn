import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=relative=>readFileSync(path.join(root,relative),'utf8');
const base=read('backend/supabase/migrations/20261108171500_player_market_private_custody_foundation_v1.sql');
const reserve=read('backend/supabase/migrations/20261108173000_market_atomic_stack_reservation_private_v2.sql');
const cancel=read('backend/supabase/migrations/20261108173100_market_safe_cancellation_private_v2.sql');
const dbTest=read('backend/supabase/tests/player_market_atomic_reservations_v2.sql');
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
console.log('PASS: hidden market V2 SQL gates, ACL boundaries, atomic intent and Gold drafts remain disabled');
