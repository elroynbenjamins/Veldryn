const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const foundation=read('backend/supabase/migrations/20261111141514_dungeon_shop_hidden_atomic_foundation_v1.sql');
const release=read('backend/supabase/migrations/20261113192000_dungeon_shop_account_resources_release_v2.sql');
const bundles=read('backend/supabase/migrations/20261115220500_dungeon_shop_crafting_bundles_v3.sql');
const panel=read('apps/mobile/src/components/ExpeditionShopPanel.tsx');
const shopView=read('apps/mobile/src/components/coop/DungeonMarksShopView.tsx');
const resourceArt=read('apps/mobile/src/theme/resource-assets.ts');
const ingredientArt=read('apps/mobile/src/theme/ingredient-assets.ts');
const client=read('apps/mobile/src/online/expedition-shop.ts');
const screen=read('apps/mobile/src/screens/CoopExpeditionScreen.tsx');
const backend=read('backend/online/dungeon-shop.ts');
const catalog=read('backend/src/server/expeditions/dungeon-shop-catalog-v1.ts');

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

// Every active Dungeon Shop material/currency offer must render its exact existing
// pixel artwork, not the generic diamond that previously filled all item cards.
for(const [offerId,resourceId] of Object.entries({
 dshop_tempering_satchel:'TEMPERING_DUST',
 dshop_gem_dust_cache:'GEM_DUST',
 dshop_tempering_core_cache:'TEMPERING_CORE',
 dshop_companion_essence:'essence',
 dshop_bondstone:'bondstones',
})){
 assert(shopView.includes(offerId+ ":'" +resourceId+ "'"),'missing shop icon mapping: '+offerId);
 assert((resourceId==='essence'||resourceId==='bondstones'?resourceArt:ingredientArt).includes(resourceId+':require('),'missing pixel art: '+resourceId);
}
assert(shopView.includes('<DungeonShopOfferIcon item={item}/>'),'offers must render their artwork');
assert(shopView.includes('CATEGORY_PREVIEW_ART[item.category]'),'unreleased collectible previews must have category artwork');
assert(!shopView.includes('◇'),'generic diamond shop-item placeholder must not return');

// Dungeon Shop pet rewards have three distinct packed assets and a single
// reward-ID resolver used by the shop, Pet Collection and profile showcases.
const dungeonPetArt=read('apps/mobile/src/theme/dungeon-shop-pet-art.ts');
const petRegistry=read('apps/mobile/src/theme/pet-art.ts');
const petDefinitions=read('apps/mobile/src/content/dungeon-shop-collectibles-v1.ts');
for(const [offerId,petId,assetName] of [
 ['dshop_asterfall_pet','DUNGEON_PET_ASTERFALL_001','DUNGEON_PET_ASTERFALL_001_Oathroot_Seedling.webp'],
 ['dshop_sunscar_pet','DUNGEON_PET_SUNSCAR_001','DUNGEON_PET_SUNSCAR_001_Vaultscarab.webp'],
 ['dshop_frostmarch_pet','DUNGEON_PET_FROSTMARCH_001','DUNGEON_PET_FROSTMARCH_001_Choirbell_Sprite.webp'],
]){
 const asset=path.join(root,'apps/mobile/assets/dungeon-shop/pets',assetName);
 assert(fs.existsSync(asset),'missing packed pet artwork: '+assetName);
 const bytes=fs.readFileSync(asset);
 assert(bytes.length>1000&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP','invalid WebP asset: '+assetName);
 assert(dungeonPetArt.includes(petId+':require('),'pet art resolver missing '+petId);
 assert(dungeonPetArt.includes(offerId+":'"+petId+"'"),'shop SKU mapping missing '+offerId);
 assert(petDefinitions.includes(petId),'shop pet must retain its collectible ID: '+petId);
}
assert(petRegistry.includes('??dungeonShopPetArtSource(id)'),'Pet Collection must resolve Dungeon Shop art');
assert(shopView.includes('dungeonShopPetOfferArt(item.id)'),'shop offers must use unique pet art and expanded preview');
assert(read('apps/mobile/src/core/release-flags.ts').includes('DUNGEON_MARKS_SHOP_RELEASED=false'),'new pet art must not bypass collectible release gate');

// V3 extends the baseline 17 SKUs with seven one-per-week, x100 crafting inputs.
// Preserve the baseline resource artwork improvements from main.
assert(bundles.includes("'crafting_bundle'")&&bundles.includes("'quantity',v_offer.reward_quantity"),'bank grant must be server-owned');
assert(bundles.includes("dungeon_shop_bank_full")&&bundles.includes("jsonb_set(v_game.state,'{bank,stacks}'"),'full Bank rejection must precede spending');
assert(bundles.includes("to service_role")&&bundles.includes("from public,anon,authenticated"),'purchase RPC must stay service-role-only');
assert(catalog.includes("dshop_moss_fiber_100")&&catalog.includes("dshop_sunstone_ingot_100"),'tier resource offers missing');
assert(shopView.includes("materialTier")&&shopView.includes("item.materialItemId??OFFER_RESOURCE_ART[item.id]"),'existing artwork must work for selected resources');
assert(shopView.includes("material:'inventory'"),'preview art must support the material category');
console.log('PASS Expedition Shop: original artwork, 17 baseline SKUs + 7 tiered x100 shared-Bank materials');
