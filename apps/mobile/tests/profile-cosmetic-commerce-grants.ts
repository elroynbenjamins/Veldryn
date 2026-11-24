import {PROFILE_COSMETIC_STORE_PRODUCTS} from '../src/content/profile-cosmetic-store';
import {PROFILE_EFFECTS} from '../src/core/profile-effects';
import {
 PROFILE_COSMETIC_FORBIDDEN_COMMERCE_IDS,PROFILE_COSMETIC_GRANTS,
 applyProfileCosmeticGrant,assertProfileCosmeticGrantDefinition,profileCosmeticGrantDefinition,
} from '../../../backend/src/shared/profile-cosmetic-commerce';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
function throws(fn:()=>unknown,message:string){let did=false;try{fn()}catch{did=true}ok(did,message)}

equal(PROFILE_COSMETIC_GRANTS.length,12,'server grant contract has exactly the 12 prepared catalog SKUs');
equal(new Set(PROFILE_COSMETIC_GRANTS.map(row=>row.sku)).size,12,'server grant SKUs are unique');
equal(new Set(PROFILE_COSMETIC_STORE_PRODUCTS.map(row=>row.sku)).size,12,'mobile catalog SKUs are unique');
equal([...PROFILE_COSMETIC_GRANTS].map(row=>row.sku).sort().join('|'),[...PROFILE_COSMETIC_STORE_PRODUCTS].map(row=>row.sku).sort().join('|'),'mobile and server SKU sets cannot drift');

const fallbackIds=new Set(PROFILE_EFFECTS.map(row=>row.fallbackBorderId));
equal(new Set(PROFILE_COSMETIC_FORBIDDEN_COMMERCE_IDS).size,4,'all four fallback reward identities are deny-listed');
for(const id of fallbackIds)ok(PROFILE_COSMETIC_FORBIDDEN_COMMERCE_IDS.includes(id as never),'every visual fallback reward id is explicitly commerce-forbidden');
for(const row of PROFILE_COSMETIC_GRANTS){
 const checked=assertProfileCosmeticGrantDefinition(row.sku);
 equal(checked,row,row.sku+' resolves to its canonical server definition');
 ok(row.grants.every(grant=>!fallbackIds.has(grant.id as never)),row.sku+' never grants a reward fallback id');
 const mobile=PROFILE_COSMETIC_STORE_PRODUCTS.find(product=>product.sku===row.sku)!;
 if(row.kind==='border')equal(row.grants[0].id,'itemId' in mobile?mobile.itemId:undefined,row.sku+' border grant matches mobile product');
 if(row.kind==='effect')equal(row.grants[0].id,'itemId' in mobile?mobile.itemId:undefined,row.sku+' effect grant matches mobile product');
 if(row.kind==='bundle'){
  equal(row.grants.find(g=>g.kind==='border')?.id,'borderId' in mobile?mobile.borderId:undefined,row.sku+' bundle border matches mobile catalog');
  equal(row.grants.find(g=>g.kind==='effect')?.id,'effectId' in mobile?mobile.effectId:undefined,row.sku+' bundle effect matches mobile catalog');
 }
}
throws(()=>assertProfileCosmeticGrantDefinition('dungeon:frostmarch:frostbound-chime'),'exclusive reward identity is not accepted as a SKU');
throws(()=>assertProfileCosmeticGrantDefinition('unknown'),'unknown cosmetic SKU fails closed');

const bundle='profile_cosmetic_frostbound_bundle_v1';
let first=applyProfileCosmeticGrant({},bundle);
equal(first.added.length,2,'first bundle grant adds exactly two independent pieces');
ok(first.state.unlockedProfileBorderIds?.includes('cosmetic:frostbound:chime-frame'),'bundle grants product border');
ok(first.state.unlockedProfileEffectIds?.includes('effect_frostbound_winter_veil'),'bundle grants product effect');
ok(!first.state.unlockedProfileBorderIds?.includes('dungeon:frostmarch:frostbound-chime'),'bundle never grants exclusive dungeon fallback');
const second=applyProfileCosmeticGrant(first.state,bundle);
equal(second.added.length,0,'replaying the same bundle is idempotent');
ok(second.alreadyOwned,'idempotent replay is reported as already owned');
equal(second.state.unlockedProfileBorderIds?.length,1,'idempotent replay does not duplicate border ownership');
equal(second.state.unlockedProfileEffectIds?.length,1,'idempotent replay does not duplicate effect ownership');
const partial=applyProfileCosmeticGrant({unlockedProfileBorderIds:['cosmetic:frostbound:chime-frame']},bundle);
equal(partial.added.length,1,'bundle grant fills only the missing piece after partial ownership');
equal(partial.added[0].kind,'effect','partial bundle ownership grants only the missing effect');

ok(profileCosmeticGrantDefinition('profile_cosmetic_gloamward_border_v1')?.kind==='border','piece SKU resolves');
ok(profileCosmeticGrantDefinition('not-real')===undefined,'unknown lookup does not invent a grant');
console.log('PASS: profile cosmetic server grants are exact, idempotent, catalog-parity checked and deny exclusive fallback reward IDs');
