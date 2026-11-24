import {createCharacter,newGame} from '../src/core/game';
import {PROFILE_EFFECTS} from '../src/core/profile-effects';
import {PROFILE_COSMETIC_STORE_COLLECTIONS,PROFILE_COSMETIC_STORE_PRODUCTS,profileCosmeticCollectionOwnership} from '../src/content/profile-cosmetic-store';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}

equal(PROFILE_COSMETIC_STORE_COLLECTIONS.length,4,'four approved profile cosmetic collections');
equal(PROFILE_COSMETIC_STORE_PRODUCTS.length,12,'each collection has border, effect and bundle catalog entries');
equal(new Set(PROFILE_COSMETIC_STORE_PRODUCTS.map(row=>row.sku)).size,12,'catalog sku ids are unique');
ok(PROFILE_COSMETIC_STORE_PRODUCTS.every(row=>row.checkoutEnabled===false),'no hidden catalog product can checkout');
ok(PROFILE_COSMETIC_STORE_PRODUCTS.every(row=>row.billing==='one_time'),'prepared cosmetics use one-time ownership semantics');
for(const collection of PROFILE_COSMETIC_STORE_COLLECTIONS){
 const definition=PROFILE_EFFECTS.find(row=>row.id===collection.effect.itemId);
 ok(!!definition,collection.name+' effect uses an approved effect id');
 equal(collection.border.itemId,definition!.borderId,collection.name+' border uses its independent product id');
 ok(collection.border.itemId!==collection.fallbackBorderId,collection.name+' product border never reuses reward fallback identity');
 equal(collection.bundle.borderId,collection.border.itemId,collection.name+' bundle grants only its border piece');
 equal(collection.bundle.effectId,collection.effect.itemId,collection.name+' bundle grants only its effect piece');
}
let state=createCharacter(newGame(0),'IRONWARDEN','Cosmetics Catalog Test');
const first=PROFILE_COSMETIC_STORE_COLLECTIONS[0];
let owned=profileCosmeticCollectionOwnership(state,first);
equal(owned.ownedPieces,0,'fresh account owns neither prepared paid piece');
ok(!owned.bundleOwned,'bundle completion is false with zero pieces');
state={...state,account:{...state.account,unlockedProfileBorderIds:[first.border.itemId]}};
owned=profileCosmeticCollectionOwnership(state,first);
equal(owned.ownedPieces,1,'border ownership stays independent');
ok(owned.borderOwned&&!owned.effectOwned&&!owned.bundleOwned,'border alone never implies effect or bundle ownership');
state={...state,account:{...state.account,unlockedProfileEffectIds:[first.effect.itemId]}};
owned=profileCosmeticCollectionOwnership(state,first);
equal(owned.ownedPieces,1,'effect ownership stays independent');
ok(!owned.borderOwned&&owned.effectOwned&&!owned.bundleOwned,'effect alone never implies border or bundle ownership');
state={...state,account:{...state.account,unlockedProfileBorderIds:[first.border.itemId],unlockedProfileEffectIds:[first.effect.itemId]}};
owned=profileCosmeticCollectionOwnership(state,first);
ok(owned.borderOwned&&owned.effectOwned&&owned.bundleOwned,'bundle reads complete only when both independent pieces are owned');
console.log('PASS: hidden cosmetics catalog has four two-piece collections, independent ownership and no checkout path');
