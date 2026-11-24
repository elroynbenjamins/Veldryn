import {createCharacter,newGame} from '../src/core/game';
import {PROFILE_EFFECTS} from '../src/core/profile-effects';
import {PROFILE_COSMETIC_STORE_COLLECTIONS,PROFILE_COSMETIC_STORE_PRODUCTS,profileCosmeticCollectionOwnership} from '../src/content/profile-cosmetic-store';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}

equal(PROFILE_COSMETIC_STORE_COLLECTIONS.length,4,'four approved standard profile cosmetic sets');
equal(PROFILE_COSMETIC_STORE_PRODUCTS.length,4,'the Store has one product per complete cosmetic set');
equal(new Set(PROFILE_COSMETIC_STORE_PRODUCTS.map(row=>row.sku)).size,4,'set sku ids are unique');
ok(PROFILE_COSMETIC_STORE_PRODUCTS.every(row=>row.kind==='set'),'smaller standard collections are never individual Store products');
ok(PROFILE_COSMETIC_STORE_PRODUCTS.every(row=>row.checkoutEnabled===false),'no hidden set can checkout');
ok(PROFILE_COSMETIC_STORE_PRODUCTS.every(row=>row.billing==='one_time'),'prepared cosmetic sets use one-time ownership semantics');
ok(PROFILE_COSMETIC_STORE_PRODUCTS.every(row=>row.tier==='standard'),'these four sets are standard, not premium');
for(const collection of PROFILE_COSMETIC_STORE_COLLECTIONS){
 const definition=PROFILE_EFFECTS.find(row=>row.id===collection.effect.itemId);
 ok(!!definition,collection.name+' effect uses an approved effect id');
 equal(collection.border.itemId,definition!.borderId,collection.name+' border keeps its independent equip identity');
 ok(collection.border.itemId!==collection.fallbackBorderId,collection.name+' product border never reuses reward fallback identity');
 equal(collection.set.borderId,collection.border.itemId,collection.name+' set includes its border');
 equal(collection.set.effectId,collection.effect.itemId,collection.name+' set includes its effect');
 ok(!('sku' in collection.border)&&!('sku' in collection.effect),collection.name+' pieces are contents, not sellable products');
}
let state=createCharacter(newGame(0),'IRONWARDEN','Cosmetics Catalog Test');
const first=PROFILE_COSMETIC_STORE_COLLECTIONS[0];
let owned=profileCosmeticCollectionOwnership(state,first);
equal(owned.ownedPieces,0,'fresh account owns neither set piece');
ok(!owned.setOwned,'set ownership is false with zero pieces');
state={...state,account:{...state.account,unlockedProfileBorderIds:[first.border.itemId]}};
owned=profileCosmeticCollectionOwnership(state,first);
equal(owned.ownedPieces,1,'partial legacy/ops ownership remains representable');
ok(owned.borderOwned&&!owned.effectOwned&&!owned.setOwned,'one piece does not count as owning the Store set');
state={...state,account:{...state.account,unlockedProfileBorderIds:[first.border.itemId],unlockedProfileEffectIds:[first.effect.itemId]}};
owned=profileCosmeticCollectionOwnership(state,first);
ok(owned.borderOwned&&owned.effectOwned&&owned.setOwned,'set reads owned only when both independently equipable contents are owned');
console.log('PASS: hidden Cosmetics Store has four standard set-only products with two independently equipable contents each');
