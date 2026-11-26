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

equal(PROFILE_COSMETIC_GRANTS.length,4,'server grant contract has exactly four set-only SKUs');
equal(new Set(PROFILE_COSMETIC_GRANTS.map(row=>row.sku)).size,4,'server set SKUs are unique');
equal(new Set(PROFILE_COSMETIC_STORE_PRODUCTS.map(row=>row.sku)).size,4,'mobile set SKUs are unique');
equal([...PROFILE_COSMETIC_GRANTS].map(row=>row.sku).sort().join('|'),[...PROFILE_COSMETIC_STORE_PRODUCTS].map(row=>row.sku).sort().join('|'),'mobile and server set SKU lists cannot drift');

const fallbackIds=new Set(PROFILE_EFFECTS.map(row=>row.fallbackBorderId));
equal(new Set(PROFILE_COSMETIC_FORBIDDEN_COMMERCE_IDS).size,4,'all four fallback reward identities are deny-listed');
for(const id of fallbackIds)ok(PROFILE_COSMETIC_FORBIDDEN_COMMERCE_IDS.includes(id as never),'every visual fallback reward id is explicitly commerce-forbidden');
for(const row of PROFILE_COSMETIC_GRANTS){
 const checked=assertProfileCosmeticGrantDefinition(row.sku);
 equal(checked,row,row.sku+' resolves to its canonical server definition');
 equal(row.kind,'set',row.sku+' is a set-only commerce product');
 ok(row.grants.every(grant=>!fallbackIds.has(grant.id as never)),row.sku+' never grants a reward fallback id');
 const mobile=PROFILE_COSMETIC_STORE_PRODUCTS.find(product=>product.sku===row.sku)!;
 equal(row.grants.find(g=>g.kind==='border')?.id,mobile.borderId,row.sku+' set border matches mobile catalog');
 equal(row.grants.find(g=>g.kind==='effect')?.id,mobile.effectId,row.sku+' set effect matches mobile catalog');
equal(row.grants.filter(g=>g.kind==='icon').map(g=>g.id).join('|'),mobile.iconIds.join('|'),row.sku+' portrait grants match mobile catalog');
}
for(const retired of [
 'profile_cosmetic_gloamward_border_v1','profile_cosmetic_gloamward_effect_v1','profile_cosmetic_gloamward_bundle_v1',
 'profile_cosmetic_frostbound_border_v1','profile_cosmetic_frostbound_effect_v1','profile_cosmetic_frostbound_bundle_v1',
]){
 throws(()=>assertProfileCosmeticGrantDefinition(retired),retired+' is not a sellable SKU');
}
throws(()=>assertProfileCosmeticGrantDefinition('dungeon:frostmarch:frostbound-chime'),'exclusive reward identity is not accepted as a SKU');
throws(()=>assertProfileCosmeticGrantDefinition('unknown'),'unknown cosmetic SKU fails closed');

const setSku='profile_cosmetic_frostbound_set_v1';
let first=applyProfileCosmeticGrant({},setSku);
equal(first.added.length,4,'first set grant adds four independently equipable contents');
ok(first.state.unlockedProfileBorderIds?.includes('cosmetic:frostbound:chime-frame'),'set grants product border');
ok(first.state.unlockedProfileEffectIds?.includes('effect_frostbound_winter_veil'),'set grants product effect');
ok(first.state.unlockedProfileIconIds?.includes('cosmetic:frostbound:portrait-oracle'),'set grants female portrait');
ok(first.state.unlockedProfileIconIds?.includes('cosmetic:frostbound:portrait-warden'),'set grants male portrait');
ok(!first.state.unlockedProfileBorderIds?.includes('dungeon:frostmarch:frostbound-chime'),'set never grants exclusive dungeon fallback');
const second=applyProfileCosmeticGrant(first.state,setSku);
equal(second.added.length,0,'replaying the same set is idempotent');
ok(second.alreadyOwned,'idempotent replay is reported as already owned');
equal(second.state.unlockedProfileBorderIds?.length,1,'idempotent replay does not duplicate border ownership');
equal(second.state.unlockedProfileEffectIds?.length,1,'idempotent replay does not duplicate effect ownership');
equal(second.state.unlockedProfileIconIds?.length,2,'idempotent replay does not duplicate portrait ownership');
const partial=applyProfileCosmeticGrant({unlockedProfileBorderIds:['cosmetic:frostbound:chime-frame'],unlockedProfileEffectIds:['effect_frostbound_winter_veil'],unlockedProfileIconIds:['cosmetic:frostbound:portrait-oracle']},setSku);
equal(partial.added.length,1,'set grant fills only a missing portrait after partial legacy/ops ownership');
equal(partial.added[0].id,'cosmetic:frostbound:portrait-warden','partial ownership receives only the missing male portrait');

ok(profileCosmeticGrantDefinition('profile_cosmetic_gloamward_set_v1')?.kind==='set','set SKU resolves');
ok(profileCosmeticGrantDefinition('not-real')===undefined,'unknown lookup does not invent a grant');
console.log('PASS: profile cosmetic commerce is four set-only SKUs, exact, idempotent and exclusive-reward safe');
