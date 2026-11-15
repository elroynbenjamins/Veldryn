const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const foundation=read('backend/supabase/migrations/20261111141514_dungeon_shop_hidden_atomic_foundation_v1.sql');
const release=read('backend/supabase/migrations/20261113192000_dungeon_shop_account_resources_release_v2.sql');
const bundles=read('backend/supabase/migrations/20261115220500_dungeon_shop_crafting_bundles_v3.sql');
const panel=read('apps/mobile/src/components/ExpeditionShopPanel.tsx');
const client=read('apps/mobile/src/online/expedition-shop.ts');
const screen=read('apps/mobile/src/screens/CoopExpeditionScreen.tsx');
const backend=read('backend/online/dungeon-shop.ts');
const catalog=read('backend/src/server/expeditions/dungeon-shop-catalog-v1.ts');
const shopView=read('apps/mobile/src/components/coop/DungeonMarksShopView.tsx');

// One authoritative 17-offer schema; the obsolete nine phantom SKUs must never
// be replayed by a future blanket Supabase migration deployment.
assert(!fs.existsSync(path.join(root,'backend/supabase/migrations/20261110180000_expedition_marks_shop_foundation.sql')),'retired draft migration must not create duplicate wallets');
for(const table of ['dungeon_shop_settings_v1','dungeon_shop_catalogue_v1','dungeon_shop_receipts_v1']){
 assert(foundation.includes('public.'+table),'canonical database must own '+table);
}
assert(foundation.includes('enable row level security'),'RLS must protect shop tables');
assert(foundation.includes('dungeon_shop_purchase_server_v1'),'purchase RPC must be atomic');
assert(foundation.includes('dungeon_shop_snapshot_server_v1'),'server snapshot RPC must exist');
assert(foundation.includes('dungeon_shop_cleared_regions_server_v1'),'cleared regions must be server verified');
assert(foundation.includes('dungeon_shop_bound_materials_unavailable'),'tradeable materials must remain blocked');
assert(foundation.includes('dungeon_shop_unreleased'),'global shop switch must be checked on every purchase');
assert(foundation.includes('idempotency_request_mismatch'),'request reuse for another item must fail');
assert(foundation.includes('for update'),'purchases must lock server account and wallet');
assert(foundation.includes('grant execute on function public.dungeon_shop_purchase_server_v1(uuid,text,text) to service_role'),'purchase RPC is service-role only');
assert(!foundation.match(/grant execute on function public\.dungeon_shop_purchase_server_v1\(uuid,text,text\) to authenticated/),'clients cannot spend directly');

// First release only supports two bounded account resources. All remaining
// collectibles and materials stay preview-only until art/grants are proven.
assert(release.includes("set enabled=item_id in ('dshop_companion_essence','dshop_bondstone')"),'only vetted account resources may be sold');
assert(release.includes('set enabled=false,updated_at=now()'),'release cannot activate the shop as a migration side effect');
assert(release.includes("reward_field='companionEssence'")&&release.includes("reward_field='bondstones'"),'vetted reward metadata is validated');
assert(release.includes('releasedPrices')&&release.includes('shopEnabled'),'snapshot reflects server-owned price and release gates');
assert(release.includes('set search_path=\'\''),'shop function search path must be pinned');
assert(release.includes('revoke all on function public.dungeon_shop_snapshot_server_v1(uuid)'),'players cannot inspect other accounts');

// Mobile purchase goes through authenticated Edge + persisted journal, not
// the obsolete client-executable Supabase RPC that never delivered rewards.
assert(client.includes('coopClient.dungeonMarksShop()'),'Quartermaster loads the canonical shop');
assert(client.includes('coopClient.purchaseDungeonMarksShop(itemId,coopRequestId())'),'journaled co-op purchase');
assert(!client.includes("rpc('expedition_shop_purchase_v1'"),'never call the phantom legacy RPC');
assert(panel.includes('<DungeonMarksShopView'),'one visible Shop UI shares the approved catalogue');
assert(panel.includes('onRewardsChanged'),'successful purchase refreshes GameState');
assert(panel.includes('snapshot?.shopEnabled'),'purchase controls require server enablement');
assert(screen.includes('<ExpeditionShopPanel'),'the existing Dungeon entry opens the finished shop');
assert(backend.includes('account.releasedPrices[offer.id]'),'server prices come from the DB');
assert(backend.includes("published?quote.status:'unreleased'"),'disabled offers cannot render as purchasable');
assert(catalog.includes("DUNGEON_SHOP_LIVE_V1 = true"),'DB gate, not stale hardcoded preview, owns release');

// Seven one-per-week, bank-delivered, tier-priced x100 materials are additional
// SKUs; the original 17-offer foundation remains intact.
assert(bundles.includes("'crafting_bundle'")&&bundles.includes("'quantity',v_offer.reward_quantity"),'verified bank grant is server-owned');
assert(bundles.includes("dungeon_shop_bank_full")&&bundles.includes("jsonb_set(v_game.state,'{bank,stacks}'"),'full bank fails before spend');
assert(bundles.includes("to service_role")&&bundles.includes("from public,anon,authenticated"),'purchase RPC stays service-role-only');
assert(catalog.includes("dshop_moss_fiber_100")&&catalog.includes("dshop_sunstone_ingot_100"),'new catalogue has both ends of T1–T4');
assert(shopView.includes("materialTier")&&shopView.includes("ResourceIcon"),'one compact tier/resource picker uses existing artwork');
console.log('PASS Expedition Shop: 17 baseline SKUs + 7 tiered x100 Bank materials, atomic spending and opt-in release');
