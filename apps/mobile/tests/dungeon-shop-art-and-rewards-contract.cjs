const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const catalog=read('backend/src/server/expeditions/dungeon-shop-catalog-v1.ts');
const artwork=read('apps/mobile/src/theme/dungeon-shop-art.ts');
const collector=read('apps/mobile/src/content/dungeon-shop-collectibles-v1.ts');
const registry=read('apps/mobile/src/content/collectibles.ts');
const shop=read('apps/mobile/src/components/coop/DungeonMarksShopView.tsx');
const runtime=read('backend/online/dungeon-shop.ts');
const release=read('backend/supabase/migrations/20261113192000_dungeon_shop_account_resources_release_v2.sql');

const regions=['asterfall','sunscar','frostmarch'],kinds=['icon','border','background','pet'];
assert(catalog.includes('DUNGEON_SHOP_LIVE_V1 = true'),'server may read live offer flags');
assert(registry.includes('DUNGEON_SHOP_COLLECTIBLES_V1'),'regional collectibles must be journalled');
assert(shop.includes('<DungeonShopOfferArtwork'),'shop cards must render item artwork');
for(const region of regions)for(const kind of kinds){
 const offer='dshop_'+region+'_'+kind;
 assert(catalog.includes(offer),'catalog missing '+offer);
 assert(artwork.includes(offer+':require('),'art source missing '+offer);
 const file='apps/mobile/assets/dungeon-shop-v1/'+offer+'.png';
 const bytes=fs.readFileSync(path.join(root,file));
 assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),file+' is not PNG');
 assert(bytes.length>=200,file+' suspiciously empty');
 if(kind!=='icon')assert(collector.includes(offer.replace('dshop_','').replace('_','')), 'check collectible metadata for '+offer);
}
for(const id of ['dshop_tempering_satchel','dshop_gem_dust_cache','dshop_tempering_core_cache']){
 assert(catalog.includes(id),'missing material '+id);
 assert(artwork.includes(id+':'),'missing material art '+id);
}
for(const id of ['dshop_companion_essence','dshop_bondstone'])assert(artwork.includes(id+':require('),'missing released resource art '+id);
assert(runtime.includes("published?quote.status:'unreleased'"),'per-item server release gates required');
assert(release.includes("set enabled=item_id in ('dshop_companion_essence','dshop_bondstone')"),'never release unfinished SKUs by default');
assert(!runtime.includes('update dungeon_shop_catalogue_v1 set enabled=true'),'UI must never release grants');
const sheet=fs.readFileSync(path.join(root,'apps/mobile/assets/dungeon-shop-v1/dungeon-shop-icons-draft.png'));
assert(sheet.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'sprite atlas must be PNG');
console.log('PASS Dungeon Shop: 15 drafted reward icons, reward registry and server gating');
