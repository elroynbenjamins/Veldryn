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
const purchaseClaim=read('backend/supabase/migrations/20261108181000_market_purchase_claims_private_v4.sql');
const marketInbox=read('backend/supabase/migrations/20261108181100_market_inbox_projection_private_v4.sql');
const marketInboxTest=read('backend/supabase/tests/player_market_inbox_and_buyer_claims_v4.sql');
const marketInboxClient=read('apps/mobile/src/online/market-inbox.ts');
const marketInboxPanel=read('apps/mobile/src/screens/MarketInboxPanel.tsx');
const rewardInboxScreen=read('apps/mobile/src/screens/RewardsInboxScreen.tsx');
const sellerOffers=read('backend/supabase/migrations/20261108183000_market_seller_offer_lifecycle_private_v5.sql');
const sellerTest=read('backend/supabase/tests/player_market_seller_offers_v5.sql');
const marketAuth=read('backend/online/market-auth-boundary.ts');
const marketAuthTest=read('backend/online/tests/market-auth-boundary.ts');
const gameplayEdge=read('backend/online/edge.ts');
const concurrencyRunner=read('backend/supabase/tests/run_market_concurrency_ci_v6.sh');
const gearProof=read('backend/online/market-equipment-proof.ts');
const gearProofTest=read('backend/online/tests/market-equipment-proof.ts');
const exactGearEscrow=read('backend/supabase/migrations/20261108211500_market_exact_equipment_escrow_private_v8.sql');
const exactGearReturns=read('backend/supabase/migrations/20261108212500_market_equipment_returns_private_v8.sql');
const exactGearTest=read('backend/supabase/tests/player_market_exact_equipment_v8.sql');
const buyerGearLedger=read('backend/supabase/migrations/20261108222500_market_equipment_buyer_ledger_private_v9.sql');
const buyerGearOffer=read('backend/supabase/migrations/20261108223000_market_equipment_offer_private_v9.sql');
const buyerGearPurchase=read('backend/supabase/migrations/20261108223500_market_equipment_purchase_private_v9.sql');
const buyerGearClaim=read('backend/supabase/migrations/20261108224000_market_equipment_buyer_claim_private_v9.sql');
const buyerGearCancel=read('backend/supabase/migrations/20261108224500_market_equipment_offer_cancellation_private_v9.sql');
const buyerGearInbox=read('backend/supabase/migrations/20261108225000_market_equipment_inbox_private_v9.sql');
const buyerGearTest=read('backend/supabase/tests/player_market_equipment_buyer_v9.sql');
const buyerGearRace=read('backend/supabase/tests/run_market_equipment_concurrency_ci_v9.sh');
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
assert.match(roadmap,/return true;/,'Player Market can be voted on in Roadmap without releasing trading');
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

requireMatches(purchaseClaim,[
  ['runtime hard gate',/where singleton and trading_enabled and snapshot_bridge_ready/],
  ['buyer account ownership',/buyer_account_id=p_account_id for update/],
  ['settled seller hold',/v_origin_hold.status<>'settled'/],
  ['server snapshot lock',/from public\.online_game_states[\s\S]*?for update;/i],
  ['full storage protection',/raise exception 'market_destination_full'/],
  ['Gold unchanged during item claim',/update public\.online_game_states[\s\S]*?revision=v_state\.revision\+1/i],
  ['claim idempotency',/v_receipt\.action<>'claim_purchase'/],
  ['one-time delivery status',/set status='claimed',claimed_at=now\(\)/],
  ['buyer-claim RPC revoked',/revoke all on function private\.market_claim_purchase_delivery_v4\([\s\S]*?from public,anon,authenticated,service_role;/i],
], 'purchase delivery claim');
requireMatches(marketInbox,[
  ['market disabled until release',/where singleton and trading_enabled and snapshot_bridge_ready/],
  ['purchase event',/'purchased'::text as kind/],
  ['sold event',/'sold'::text as kind/],
  ['returned event',/'returned'::text as kind/],
  ['only owner market return records',/r.recipient_account_id=p_account_id/],
  ['only owner market purchase records',/p.buyer_account_id=p_account_id/],
  ['only owner sales',/o.seller_account_id=p_account_id/],
  ['sold Gold already paid',/'credited'::text as status/],
  ['market inbox RPC revoked',/revoke all on function private\.market_inbox_snapshot_v4\(uuid,boolean,integer\)[\s\S]*?from public,anon,authenticated,service_role;/i],
], 'private inbox projection');
requireMatches(marketInboxTest,[
  ['isolated rollback',/\nrollback;\s*$/i],
  ['separate seller Gold notification',/seller Gold history notification duplicated or missing/],
  ['claim exactly once',/purchased item duplicated on replay/],
  ['full bank protection',/full bank lost purchase or changed Gold/],
  ['returned listing',/returned lot missing from Market Inbox/],
], 'market inbox staging tests');
assert.match(rewardInboxScreen,/PLAYER_MARKET_RELEASED\?<Pressable/,
  'Market Inbox tab must remain hidden behind the release flag');
assert.match(rewardInboxScreen,/\{marketTab\?<MarketInboxPanel/,
  'the Market Inbox panel is only mounted on its future tab');
assert.match(marketInboxPanel,/if\(!PLAYER_MARKET_RELEASED\)return null;/,
  'Market Inbox panel must fail closed');
assert.match(marketInboxClient,/if\(!PLAYER_MARKET_RELEASED\)throw/,
  'Market Inbox API calls must fail closed');
assert.doesNotMatch(purchaseClaim,/\bgrant execute\b/i,
  'buyer claims are not exposed to clients');
assert.doesNotMatch(marketInbox,/\bgrant execute\b/i,
  'market inbox snapshot is not exposed to clients');
assert.doesNotMatch(purchaseClaim,/\bupdate\s+public\.character_wallets\b/i,
  'claiming a bought item must never move Gold again');

requireMatches(sellerOffers,[
  ['trade runtime gate',/where singleton and trading_enabled and snapshot_bridge_ready/],
  ['seller advisory lock',/hashtextextended\('party-account:'\|\|p_seller_account_id::text,0\)/],
  ['ownership lock',/where hold_id=p_hold_id and owner_account_id=p_seller_account_id[\s\S]*?for update;/i],
  ['verified unsocketed stack only',/v_asset\.asset_kind not in \('resource','gem'\)/],
  ['exact hold quantity',/v_hold\.held_quantity<>p_expected_quantity/],
  ['no re-list',/market_hold_already_listed/],
  ['20 active listings',/market_seller_listing_cap/],
  ['atomic escrow cancellation',/v_return:=private\.market_cancel_stack_hold_v2\(/],
  ['direct active-listing guard',/raise exception 'market_active_listing_requires_cancel_offer'/],
  ['expiry closes matching offer',/update private\.market_sale_offers_v3 set status='cancelled'/],
  ['seller-owned listing query',/where o\.seller_account_id=p_seller_account_id/],
  ['publish execute revoked',/revoke all on function private\.market_publish_sale_offer_v5\([\s\S]*?from public,anon,authenticated,service_role;/i],
  ['cancel execute revoked',/revoke all on function private\.market_cancel_sale_offer_v5\([\s\S]*?from public,anon,authenticated,service_role;/i],
  ['seller snapshot execute revoked',/revoke all on function private\.market_seller_offers_snapshot_v5\([\s\S]*?from public,anon,authenticated,service_role;/i],
], 'seller listing lifecycle');
requireMatches(sellerTest,[
  ['QA rollback',/\nrollback;\s*$/i],
  ['active cancel test',/cancelled seller listing did not queue item return atomically/],
  ['sold cancellation denial',/sold lot generated seller return entitlement/],
  ['expired auto unlist',/expired listing left ghost offer or lost escrow/],
  ['active listing cap test',/seller exceeded 20 active listings/],
], 'seller lifecycle regression');
assert.doesNotMatch(sellerOffers,/\bgrant execute\b/i,'seller list operations must remain private');

requireMatches(marketAuth,[
  ['hard disabled Edge gate',/export const MARKET_EDGE_TRANSPORT_RELEASED = false;/],
  ['verified account identity',/const actor=await services\.authenticate\(token\)/],
  ['no body account spoofing',/keys\.every\(k=>fields\.includes\(k\)\)/],
  ['no network access in unreleased handler',/return new Response\(JSON\.stringify\(\{error:'not_found'\}\)/],
], 'dormant market auth boundary');
requireMatches(marketAuthTest,[
  ['actor binding',/actor must come from authenticated session/],
  ['unreleased handler blocks Auth',/unreleased route cannot even authenticate or query/],
  ['spoofed owner test',/sellerAccountId:'someone-else'/],
  ['spoofed buyer test',/buyerAccountId:actor/],
], 'market auth boundary test');
assert.doesNotMatch(gameplayEdge,/market-auth-boundary|marketHiddenHandler|market_inbox|view=market/,
  'no Player Market transport is mounted in the live gameplay Edge handler');
requireMatches(concurrencyRunner,[
  ['disposable local DB name',/veldryn_market_ci/],
  ['refuse nonlocal execution',/PGHOST.*localhost/],
  ['two independent buyers',/buy-concurrent-a1[\s\S]*?buy-concurrent-b1/],
  ['cancel wins race',/cancel-race-a2[\s\S]*?buy-race-b2/],
  ['purchase wins race',/buy-race-a3[\s\S]*?cancel-race-b3/],
  ['postrace Gold conservation',/market_concurrent_invariant_failed/],
], 'real market concurrency runner');
assert.doesNotMatch(marketAuth,/\.rpc\(|service_role|SUPABASE_SERVICE_ROLE_KEY/,
  'future auth boundary cannot directly invoke privileged market RPCs');

requireMatches(gearProof,[
  ['hard equipment escrow gate',/export const MARKET_EQUIPMENT_ESCROW_RELEASED_V7=false as const/],
  ['read-only exact ownership audit',/auditCraftedGearOwnership\(state\)/],
  ['unknown legacy copy denied',/equipment_ownership_audit_not_clean/],
  ['exact receipt requirement',/exact_receipt_missing_or_duplicate/],
  ['all socket metadata canonical',/socket_reconciliation_required/],
  ['saved loadout protection',/saved_loadout_references_copy/],
  ['active equipment rejection',/equipped_or_overflow_copy_not_tradable/],
  ['no item-level upgrade leaks',/legacy_item_level_upgrades_unreconciled/],
  ['server revision captured',/sourceRevision:revision/],
  ['always escrow disabled',/canEscrowNow:false/],
  ['always delivery disabled',/canDeliverNow:false/],
  ['buyer ownership verified',/buyer\.account\.longTermAccountScopeId!==buyerAccountId/],
  ['duplicate instance refusal',/duplicate_instance_id_in_destination/],
  ['full pouch refusal',/destination_storage_full_or_unverified/],
], 'exact equipment proof');
requireMatches(gearProofTest,[
  ['never releases escrow',/MARKET_EQUIPMENT_ESCROW_RELEASED_V7,false/],
  ['socket and rarity persistence',/preserve full serialized per-copy receipt, sockets and upgrades/],
  ['saved loadout protection',/saved_loadout_references_copy/],
  ['duplicate buyer copy denial',/duplicate_instance_id_in_destination/],
  ['pouch capacity refusal',/destination_storage_full_or_unverified/],
  ['nonmutating read-only inspection',/inspection must not mutate saved equipment/],
], 'equipment proof regression');
assert.doesNotMatch(gearProof,/\bupdate\s+public\.|\binsert\s+into\b|\bdelete\s+from\b|\.rpc\(/i,
  'the equipment transfer proof must not move assets');
assert.doesNotMatch(gameplayEdge,/market-equipment-proof/,
  'the equipment proof must not be imported by the live gameplay transport');

requireMatches(exactGearEscrow,[
  ['hard-false independent equipment enable constraint',/equipment_transfers_enabled boolean not null default false[\s\S]*?check\(equipment_transfers_enabled=false\)/],
  ['custody table RLS',/alter table private\.market_equipment_escrows_v8 enable row level security/],
  ['account advisory lock',/hashtextextended\('party-account:'\|\|p_account_id::text,0\)/],
  ['server authoritative revision lock',/select \* into v_state from public\.online_game_states[\s\S]*?for update/],
  ['unique exact receipt check',/v_receipt_count<>1/],
  ['unique physical copy check',/v_stack_count<>1/],
  ['legacy untagged gear fail closed',/market_equipment_identity_ambiguous/],
  ['protected saved loadouts',/market_equipment_saved_loadout/],
  ['socket item policy verified',/item_id=v_stat and asset_kind='gem'/],
  ['source stack + exact receipt removed in one state update',/v_new_state:=pg_catalog\.jsonb_set\(v_state\.state#-v_path,[\s\S]*?'\{account,craftedGearInstances\}',v_remaining_records,false\)/],
  ['source revision advanced once',/revision=v_state\.revision\+1/],
  ['receipt copied into custody',/'exactReceipt',v_receipt/],
  ['reserve execute revoked',/revoke all on function private\.market_reserve_exact_equipment_v8\([\s\S]*?from public,anon,authenticated,service_role;/],
], 'exact equipment escrow');
requireMatches(exactGearReturns,[
  ['private equipment return ledger RLS',/alter table private\.market_equipment_return_deliveries_v8 enable row level security/],
  ['equipment sale still blocked',/market_equipment_listing_lifecycle_not_ready/],
  ['exact return receipt comparison',/v_gear\.exact_receipt is distinct from v_delivery\.receipt_payload/],
  ['full destination cannot consume entitlement',/market_equipment_destination_full/],
  ['buyer cannot claim return',/market_equipment_delivery_not_owned/],
  ['duplicate equipment ID prevented',/market_equipment_destination_identity_conflict/],
  ['exact receipt and stack credited together',/v_next_state:=pg_catalog\.jsonb_set\(v_game\.state,v_stack_path,[\s\S]*?v_records\|\|pg_catalog\.jsonb_build_array\(v_delivery\.receipt_payload\)/],
  ['single use return claim receipt',/'claim_equipment_return',v_result/],
  ['claim execute revoked',/revoke all on function private\.market_claim_equipment_return_v8\([\s\S]*?from public,anon,authenticated,service_role;/],
], 'exact equipment returns');
requireMatches(exactGearTest,[
  ['synthetic staging rollback',/\nrollback;\s*$/],
  ['original Forge metadata preserved',/exact Forge copy escrow did not atomically preserve receipt/],
  ['full bank cannot consume return',/full bank consumed exact Forge return/],
  ['socket mismatch rejected',/socket mismatch accepted by equipment escrow/],
  ['saved loadout rejection',/saved loadout gear accepted by escrow/],
  ['other account rejected',/non-owner claimed original equipment/],
  ['duplicate instance rejection',/duplicate Forge copy was restored/],
  ['bank escrow and equipment pouch restored',/pouch return modified exact receipt or another copy/],
], 'exact equipment staging tests');
for(const s of [exactGearEscrow,exactGearReturns]){
  assert.doesNotMatch(s,/\bgrant\s+(execute|select|insert|update|delete)\b/i,
    'equipment escrow cannot grant any client or service access');
  assert.doesNotMatch(s,/\bupdate\s+public\.character_wallets\b/i,
    'equipment escrow and return cannot modify Gold wallets');
}
assert.doesNotMatch(gameplayEdge,/market_reserve_exact_equipment_v8|market_claim_equipment_return_v8/,
  'no live equipment escrow transport is permitted');

requireMatches(buyerGearLedger,[
  ['buyer-owned exact equipment delivery ledger',/create table private\.market_equipment_purchase_deliveries_v9/],
  ['no duplicate source hold delivery',/source_hold_id uuid not null unique/],
  ['private table row-level security',/alter table private\.market_equipment_purchase_deliveries_v9 enable row level security/],
  ['delivery must be distinct from seller account',/buyer_account_id<>seller_account_id/],
], 'V9 gear buyer delivery ledger');
requireMatches(buyerGearOffer,[
  ['separate hard-false gear gate',/singleton and equipment_transfers_enabled/],
  ['whole copy listing only',/p_expected_quantity<>1/],
  ['exact receipt matched against custody',/immutable_attributes->'exactReceipt' is distinct from v_gear\.exact_receipt/],
  ['publish equipment does not grant execute',/revoke all on function private\.market_publish_equipment_offer_v9/],
], 'V9 gear sale listings');
requireMatches(buyerGearPurchase,[
  ['dual account lock, deterministic order',/least\(p_buyer_account_id::text,v_seller_account_id::text\)/],
  ['dual account lock maximum',/greatest\(p_buyer_account_id::text,v_seller_account_id::text\)/],
  ['equipment separate hard gate',/singleton and equipment_transfers_enabled/],
  ['no resource purchase',/v_asset\.asset_kind<>'equipment'/],
  ['buyer identity collision rejects',/market_equipment_buyer_identity_collision/],
  ['single durable buyer entitlement',/insert into private\.market_equipment_purchase_deliveries_v9/],
  ['all three Gold surfaces reconciled',/update public\.character_wallets[\s\S]*?update public\.characters[\s\S]*?update public\.online_game_states/],
  ['hold settles atomically',/set status='settled',closed_at=now\(\)/],
  ['original exact escrow sold',/update private\.market_equipment_escrows_v8[\s\S]*?set status='sold'/],
  ['purchase private no external exec',/revoke all on function private\.market_purchase_equipment_offer_v9/],
], 'V9 gear Gold sale');
requireMatches(buyerGearClaim,[
  ['buyer delivery ownership checked',/buyer_account_id=p_account_id for update/],
  ['seller remains original hold owner',/owner_account_id=v_delivery\.seller_account_id/],
  ['buyer character strictly owned',/market_equipment_buyer_character_not_owned/],
  ['receipt bound to chosen buyer character',/v_rebound_receipt:=pg_catalog\.jsonb_set/],
  ['buyer Forge receipt appended once',/v_records\|\|pg_catalog\.jsonb_build_array\(v_rebound_receipt\)/],
  ['full capacity denial before claim',/market_equipment_destination_full/],
  ['claim idempotency',/'claim_equipment_purchase'/],
  ['buyer claim no client access',/revoke all on function private\.market_claim_equipment_purchase_v9/],
], 'V9 buyer character receipt delivery');
requireMatches(buyerGearCancel,[
  ['cannot release an open listing directly',/status in \('draft','active','sold'\)/],
  ['equipment cancel releases exact hold',/private\.market_cancel_exact_equipment_v8/],
  ['cancellation only for held Forge copy',/v_gear\.status<>'held'/],
  ['equipment seller cancellation no client grant',/revoke all on function private\.market_cancel_equipment_offer_v9/],
], 'V9 gear seller return');
requireMatches(buyerGearInbox,[
  ['purchased gear goes to Market Inbox',/'purchase-equipment:'\|\|p\.delivery_id::text/],
  ['returned gear goes to Market Inbox',/'return-equipment:'\|\|r\.delivery_id::text/],
  ['seller payout still exactly once',/'sale:'\|\|o\.offer_id::text/],
  ['private read model no grants',/revoke all on function private\.market_inbox_snapshot_v4/],
], 'V9 Market Inbox');
requireMatches(buyerGearTest,[
  ['staging rollback only',/\nrollback;\s*$/],
  ['purchase Gold conservation',/equipment purchase did not conserve Forge receipt and Gold/],
  ['alternate character owns exact receipt',/buyer claim changed Forge metadata, sockets or Gold/],
  ['no double claim',/buyer received duplicate Forge gear/],
  ['full inventory pending',/equipment claim bypassed inventory capacity/],
  ['sold seller cannot reclaim',/sold Forge copy was returned to seller/],
  ['gear buyer pending inbox',/bought equipment not queued in Market Inbox/],
  ['seller return pending inbox',/cancelled equipment missing from Market Inbox/],
], 'V9 synthetic buyer tests');
for (const v of [buyerGearLedger,buyerGearOffer,buyerGearPurchase,buyerGearClaim,buyerGearCancel,buyerGearInbox]) {
  assert.doesNotMatch(v,/\bgrant\s+(execute|select|insert|update|delete)\b/i,
    'V9 cannot expose a client or service-role grant');
}
assert.doesNotMatch(buyerGearClaim,/\bupdate\s+public\.character_wallets\b/i,
  'claiming equipment must not charge the buyer or pay seller again');
assert.doesNotMatch(gameplayEdge,/market_purchase_equipment_offer_v9|market_claim_equipment_purchase_v9/,
  'V9 must remain unmounted in live gameplay Edge');

requireMatches(buyerGearRace,[
  ['local throwaway PG host',/PGHOST.*localhost/],
  ['throwaway CI database',/veldryn_market_ci/],
  ['competing buyer sessions',/buy-concurrent-a1[\s\S]*?buy-concurrent-b1/],
  ['cancel before purchase',/cancel-race-a2[\s\S]*?buy-race-b2/],
  ['purchase before cancellation',/buy-race-a3[\s\S]*?cancel-race-b3/],
  ['Gold and custody invariants',/market_v9_concurrent_invariant_failed/],
], 'V9 real equipment transaction races');
console.log('PASS: hidden V2–V9 market security, buyer Forge transfers and unexposed Inbox checks');
