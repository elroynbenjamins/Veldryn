const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const foundation=read('backend/supabase/migrations/20261111141514_dungeon_shop_hidden_atomic_foundation_v1.sql');
const release=read('backend/supabase/migrations/20261113192000_dungeon_shop_account_resources_release_v2.sql');
const bundles=read('backend/supabase/migrations/20261115220500_dungeon_shop_crafting_bundles_v3.sql');
const boundGrants=read('backend/supabase/migrations/20261121162500_dungeon_shop_account_bound_material_grants_v4.sql');
const releaseAll=read('backend/supabase/ops/dungeon-shop-all-24-manual-release-20261121.sql');
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
assert(boundGrants.includes("elsif v_offer.grant_kind='material'"),'V4 must implement verified bound material grant');
assert(boundGrants.includes("'bound',true"),'purchases must mint bound material stacks');
assert(boundGrants.includes("v_stack->>'bound'='true'"),'purchases must never merge bound materials into tradeable stacks');
assert(releaseAll.includes('DUNGEON_SHOP_BOUND_MATERIAL_V4_REQUIRED'),'release must require safe server material grants');
assert(releaseAll.includes('v_updated<>15'),'release must target exactly the previously disabled fifteen offers');
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
// Collectibles stay in a predictable item-type order; each region's three pets
// appear together in a compact inline row. Expanded purchase details retain
// their full-size artwork and are never squeezed into 3-column mini-cards.
assert(shopView.includes("const COLLECTION_GROUPS=['pet','border','background','icon']"),'collectibles must be grouped by item type');
assert(shopView.includes("shelf==='Supplies'?<>"),'supplies must retain the existing shelf and full-width item cards');
assert(shopView.includes("items.filter(item=>item.category==='material').map"),'material tiers must remain in their own section');
assert(shopView.includes("(['companion','supply'] as const).map"),'companion materials and enhancement supplies must have their own sections');
assert(shopView.includes('dungeonShopSupplyGroupLabel(language,category)'),'supply categories must be localized');
assert(shopView.includes('matching.map(item=>renderOffer(item,true))'),'collection groups must render compact tiles');
assert(shopView.includes('{chosen?renderOffer(chosen):null}'),'selected collectible must show its detail below the entire row');
assert(shopView.includes('expanded&&!compact'),'expanded collectible details must never be cramped inside a tile');
assert(shopView.includes("width:'31.5%'"),'mobile layout should show three item tiles inline');
assert(shopView.includes('viewportWidth<360')&&shopView.includes('horizontal nestedScrollEnabled'),'narrow devices must keep collectibles inline in a swipeable row');
assert(shopView.includes('dungeonShopCollectionLabel(language,category)'),'all collection group titles must be localized');

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
assert(petRegistry.includes('??dungeonShopPetMediumArtSource(id)'),'Pet Collection cards must use sharper 256px Dungeon Shop art');
assert(petRegistry.includes('??dungeonShopPetPortraitArtSource(id)'),'Pet Collection detail must resolve 512px Dungeon Shop portraits');
assert(shopView.includes('dungeonShopPetOfferArt(item.id)'),'shop offer rows must use unique medium-sized pet art');
assert(shopView.includes('dungeonShopPetOfferPortraitArt(item.id)'),'expanded Dungeon Shop previews must prefer 512px portrait art');
assert(shopView.includes('s.petPortraitPreviewImage'),'pet portraits must not render at the tiny shop icon size');
assert(read('apps/mobile/src/core/release-flags.ts').includes('DUNGEON_MARKS_SHOP_RELEASED=true'),'new pet art must not bypass collectible release gate');

// Dungeon Shop cosmetics use stable reward IDs throughout the server, gallery
// and shop; validate their exact runtime dimensions, unlike source art dimensions.
const cosmeticOffers=read('apps/mobile/src/theme/dungeon-shop-cosmetic-art.ts');
const profileBorders=read('apps/mobile/src/theme/profile-border-assets.ts');
const profileScenes=read('apps/mobile/src/theme/profile-background-assets.ts');
const profileIconsArt=read('apps/mobile/src/theme/profile-icon-assets.ts');
const profileIconsCatalog=read('apps/mobile/src/core/profile-icons.ts');
const profileWardrobe=read('apps/mobile/src/core/profile-wardrobe.ts');
const profileSources=read('apps/mobile/src/core/profile-customization.ts');
const crypto=require('node:crypto');
const hashes=new Set();
// Regional Dungeon profile avatars are character portraits, not inventory-object
// illustrations. Keep the stable account reward IDs but assert the approved
// portrait masters are installed before this branch is eligible to merge.
const avatarProfileEditor=read('apps/mobile/src/components/ProfileEditor.tsx');
const avatarLabels=read('apps/mobile/src/i18n/dungeon-shop.ts');
for(const [sku,name,filename,hash] of [
 ['dshop_asterfall_icon','Thornwarden','dungeon-asterfall-wardens-lantern.webp','3b1e9bbc946c37d2da0454146763c04a221d0a2305ed44ea844b1818ff4a4a73'],
 ['dshop_sunscar_icon','Dune Sovereign','dungeon-sunscar-solar-vault-key.webp','0963cc3bf00fc59a2521d8f1fb65f4f6aab2be898d87d240459f173ff182ec19'],
 ['dshop_frostmarch_icon','Rimebound','dungeon-frostmarch-resonant-bell.webp','e3d37e8cc2ccaf657a41fb969283fece28e346bc889aaec4c79bf29b774ce690'],
]){
 const profileId={dshop_asterfall_icon:'dungeon:asterfall:wardens-lantern',dshop_sunscar_icon:'dungeon:sunscar:solar-vault-key',dshop_frostmarch_icon:'dungeon:frostmarch:resonant-bell'}[sku];
 assert(avatarProfileEditor.includes("'"+profileId+"':'"+sku+"'"),'mobile wardrobe must map immutable portrait ID '+sku);
 assert(avatarProfileEditor.includes('dungeonShopOfferName(language,DUNGEON_PORTRAIT_SKUS[row.id]'),'portrait labels must come from mobile-only presentation');
 assert(avatarLabels.includes("'"+name+"'"),'approved avatar label missing '+name);
 assert(avatarLabels.includes(sku+':['),'localized avatar name missing '+sku);
 const bytes=fs.readFileSync(path.join(root,'apps/mobile/assets/profile-icons-v1',filename));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash,'approved regional avatar portrait not installed: '+filename);
}

function webpSize(bytes){
 assert.equal(bytes.toString('ascii',0,4),'RIFF','expected WebP RIFF header');
 assert.equal(bytes.toString('ascii',8,12),'WEBP','expected WebP image');
 const type=bytes.toString('ascii',12,16);
 if(type==='VP8X')return [1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16),1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16)];
 if(type==='VP8L'){const n=bytes.readUInt32LE(21);return [1+(n&16383),1+((n>>>14)&16383)];}
 if(type==='VP8 ')return [bytes.readUInt16LE(26)&16383,bytes.readUInt16LE(28)&16383];
 throw Error('unsupported WebP chunk '+type);
}
// Approved asset set: full-size portraits must be genuine 512px images, not
// scaled-up 72px thumbnails. Preserve each regional pet's distinct design.
const approvedDungeonPetAssets=[
 ['DUNGEON_PET_ASTERFALL_001','DUNGEON_PET_ASTERFALL_001_Oathroot_Seedling','8a7244a7a3b8853fb255ff56224d656c2d121523ee8e302659de8b24a2ca8f72','f50749152f045b7f9e732e8d866bffb49e2cb7e0a01468a06f7e31c92a2bfb5d','e5095fd0ea3fdc0a3c60e318325455a4c24fcbb617ac975f8bf8a5694cd467e1'],
 ['DUNGEON_PET_SUNSCAR_001','DUNGEON_PET_SUNSCAR_001_Vaultscarab','fde4fc616653ff654c14bc485740c06470061b24bc89e77ed98fe4df5cdd448d','5deb807d8c6f847aceb102e122b972e04050ca6af56b4f552a5c1bfecfb31f88','a24a2ce983015a4424c734db473861350ff87203e24d1375986530731ba92ffd'],
 ['DUNGEON_PET_FROSTMARCH_001','DUNGEON_PET_FROSTMARCH_001_Choirbell_Sprite','6ac0a00dd4ed143cfc5d258dc0b456b610c38adb5fdd4322652ebe894af8564d','0a3a5687dee4e9d0e28a1341a36f0be319c5255a86ef0c8f0becbf0915d4d77d','2dedca1405d1db513577a6b65cf7b8b15eb0596d1d9799f1523a1abee3115f18'],
];
const approvedArtHashes=new Set();
for(const [petId,basename,portraitHash,mediumHash,smallHash] of approvedDungeonPetAssets){
 for(const [folder,filename,dims,expectedHash] of [
  ['portraits',basename+'.png',[512,512],portraitHash],
  ['medium',basename+'.webp',[256,256],mediumHash],
  ['',basename+'.webp',[72,72],smallHash],
 ]){
  const file=path.join(root,'apps/mobile/assets/dungeon-shop/pets',folder,filename);
  assert(fs.existsSync(file),'missing approved pet art: '+file);
  const bytes=fs.readFileSync(file);
  const png=filename.endsWith('.png');
  const dimensions=png?[bytes.readUInt32BE(16),bytes.readUInt32BE(20)]:webpSize(bytes);
  assert(png?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',8,12)==='WEBP','invalid pet art: '+file);
  assert.deepEqual(dimensions,dims,'incorrect pet artwork dimensions: '+file);
  const hash=crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash,expectedHash,'unexpected approved pet asset: '+file);
  assert(!approvedArtHashes.has(hash),'two pet art files unexpectedly share the same image');
  approvedArtHashes.add(hash);
  const expectedRequire=petId+":require('../../assets/dungeon-shop/pets/"+(folder?folder+'/':'')+filename+"')";
  assert(dungeonPetArt.includes(expectedRequire),'resolver misses approved asset '+filename);
 }
}
assert(dungeonPetArt.includes('dungeonShopPetOfferPortraitArt'),'shop must have a dedicated full-resolution portrait resolver');
assert(dungeonPetArt.includes('dungeonShopPetMediumArtSource'),'shop must have a separate medium-resolution card resolver');
for(const [offerId,id,kind,filename,dims,registry] of [
 ['dshop_asterfall_icon','dungeon:asterfall:wardens-lantern','icon','dungeon-asterfall-wardens-lantern.webp',[512,512],profileIconsArt],
 ['dshop_sunscar_icon','dungeon:sunscar:solar-vault-key','icon','dungeon-sunscar-solar-vault-key.webp',[512,512],profileIconsArt],
 ['dshop_frostmarch_icon','dungeon:frostmarch:resonant-bell','icon','dungeon-frostmarch-resonant-bell.webp',[512,512],profileIconsArt],
 ['dshop_asterfall_border','dungeon:asterfall:briarbound-frame','border','dungeon-asterfall-briarbound-frame.webp',[1024,576],profileBorders],
 ['dshop_sunscar_border','dungeon:sunscar:amberglass-loop','border','dungeon-sunscar-amberglass-loop.webp',[1024,576],profileBorders],
 ['dshop_frostmarch_border','dungeon:frostmarch:frostbound-chime','border','dungeon-frostmarch-frostbound-chime.webp',[1024,576],profileBorders],
 ['dshop_asterfall_background','dungeon:asterfall:rootbound-sanctuary','background','dungeon-asterfall-rootbound-sanctuary.webp',[320,180],profileScenes],
 ['dshop_sunscar_background','dungeon:sunscar:buried-observatory','background','dungeon-sunscar-buried-observatory.webp',[320,180],profileScenes],
 ['dshop_frostmarch_background','dungeon:frostmarch:shiverlake-reflections','background','dungeon-frostmarch-shiverlake-reflections.webp',[320,180],profileScenes],
]){
 const dir=kind==='icon'?'profile-icons-v1':kind==='border'?'profile-borders':'profile-backgrounds';
 const file=path.join(root,'apps/mobile/assets',dir,filename);
 assert(fs.existsSync(file),'missing cosmetic asset: '+filename);
 const bytes=fs.readFileSync(file),hash=crypto.createHash('sha1').update(bytes).digest('hex');
 assert(bytes.length>1000,'empty or placeholder artwork: '+filename);
 assert.deepEqual(webpSize(bytes),dims,'wrong game runtime dimensions: '+filename);
 assert(!hashes.has(hash),'two rewards reuse the same icon');
 hashes.add(hash);
 assert(registry.includes(id),'profile registry misses '+id);
 assert(cosmeticOffers.includes(offerId+':{kind:\''+kind+'\',rewardId:\''+id+'\'}'),'shop reward art mismatch: '+offerId);
 assert(catalog.includes(offerId),'server catalogue missing '+offerId);
}
assert(shopView.includes('dungeonShopCosmeticOfferArt(item.id)'),'shop needs unique cosmetic previews');
assert(shopView.includes('s.widePreviewImage'),'wide assets need non-square previews');
assert(shopView.includes('<ProfileFrameOverlay source={previewArt}/>'),'shop border previews must use production frame layout');
assert(profileIconsCatalog.includes('DUNGEON_SHOP_PROFILE_ICONS_V1'),'profile icon collection missing Dungeon rewards');
assert(profileIconsCatalog.includes('DUNGEON_MARKS_SHOP_RELEASED||owned.has(row.id)'),'unreleased icons must stay hidden unless owned');
assert(profileWardrobe.includes("row.group==='Dungeon'?'DUNGEON'"),'Dungeon rewards need distinct wardrobe tagging');
assert(profileSources.includes('DUNGEON_SHOP_COLLECTIBLES_V1.find'),'Dungeon reward names must be preserved');
assert(read('apps/mobile/src/core/release-flags.ts').includes('DUNGEON_MARKS_SHOP_RELEASED=true'),'art must not enable purchases or passives');

// V3 extends the baseline 17 SKUs with seven one-per-week, x100 crafting inputs.
// Preserve the baseline resource artwork improvements from main.
assert(bundles.includes("'crafting_bundle'")&&bundles.includes("'quantity',v_offer.reward_quantity"),'bank grant must be server-owned');
assert(bundles.includes("dungeon_shop_bank_full")&&bundles.includes("jsonb_set(v_game.state,'{bank,stacks}'"),'full Bank rejection must precede spending');
assert(bundles.includes("to service_role")&&bundles.includes("from public,anon,authenticated"),'purchase RPC must stay service-role-only');
assert(catalog.includes("dshop_moss_fiber_100")&&catalog.includes("dshop_sunstone_ingot_100"),'tier resource offers missing');
assert(shopView.includes("materialTier")&&shopView.includes("item.materialItemId??OFFER_RESOURCE_ART[item.id]"),'existing artwork must work for selected resources');
assert(shopView.includes("material:'inventory'"),'preview art must support the material category');
console.log('PASS Expedition Shop: original artwork, 17 baseline SKUs + 7 tiered x100 shared-Bank materials');
